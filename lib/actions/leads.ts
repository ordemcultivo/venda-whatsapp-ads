'use server'

import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sendCapiEvent } from '@/lib/meta-capi'
import type { LeadStatus, DashboardStats, LeadsByDay, Lead } from '@/lib/types'
import { format, subDays, eachDayOfInterval } from 'date-fns'

function adminSupabase() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Retorna o client_id do usuário (null = ADMIN vendo todos)
async function getClientFilter() {
  const session = await auth()
  const user = session?.user as any
  if (!user) throw new Error('Não autenticado')
  return user.role === 'ADMIN' ? null : user.client_id
}

export async function getLeads(clientId?: string, period: string = '30d'): Promise<Lead[]> {
  const supabase = adminSupabase()
  const filterClientId = clientId ?? (await getClientFilter())

  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : period === '365d' ? 365 : null

  let query = supabase
    .from('leads')
    .select('*')
    .order('contacted_at', { ascending: false })

  if (days !== null) {
    query = query.gte('contacted_at', subDays(new Date(), days).toISOString())
  }

  if (filterClientId) {
    query = query.eq('client_id', filterClientId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getDashboardStats(clientId?: string, period: string = '30d'): Promise<DashboardStats> {
  const leads = await getLeads(clientId, period)

  const total = leads.length
  const adLeads = leads.filter(l => l.ad_id || l.campaign_id)
  const sold = leads.filter(l => l.status === 'sold')
  const revenue = sold.reduce((acc, l) => acc + (l.conversion_value ?? 0), 0)

  return {
    total_leads: total,
    ad_leads: adLeads.length,
    new_leads: leads.filter(l => l.status === 'new').length,
    qualified_leads: leads.filter(l => l.status === 'qualified').length,
    sold_leads: sold.length,
    total_revenue: revenue,
    conversion_rate: total > 0 ? Math.round((sold.length / total) * 10000) / 100 : 0,
  }
}

export async function getLeadsByDay(clientId?: string, period: string = '30d'): Promise<LeadsByDay[]> {
  const leads = await getLeads(clientId, period)
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90

  const interval = eachDayOfInterval({
    start: subDays(new Date(), days - 1),
    end: new Date(),
  })

  return interval.map(day => {
    const dateStr = format(day, 'dd/MM')
    const dayLeads = leads.filter(l => format(new Date(l.contacted_at), 'dd/MM') === dateStr)
    return {
      date: dateStr,
      total: dayLeads.length,
      facebook:  dayLeads.filter(l => l.platform === 'facebook').length,
      instagram: dayLeads.filter(l => l.platform === 'instagram').length,
      google:    dayLeads.filter(l => l.platform === 'google').length,
      organic:   dayLeads.filter(l => l.platform === 'organic').length,
      unknown:   dayLeads.filter(l => l.platform === 'unknown').length,
    }
  })
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  conversionValue?: number
) {
  const supabase = adminSupabase()

  const updateData: any = { status }
  if (conversionValue !== undefined) updateData.conversion_value = conversionValue

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)

  if (error) throw error

  // Dispara Meta CAPI em background (não bloqueia a resposta)
  fireCapiEvent(leadId, status, conversionValue).catch(err =>
    console.error('[capi] Erro ao disparar evento:', err)
  )

  revalidatePath('/dashboard')
  revalidatePath('/leads')
}

// Busca dados do lead + conta Meta e dispara evento CAPI
async function fireCapiEvent(leadId: string, status: LeadStatus, conversionValue?: number) {
  if (status !== 'qualified' && status !== 'sold') return

  const db = adminSupabase()
  // Lead já foi enviado pelo webhook ao chegar — qualificado vira InitiateCheckout
  const eventName = status === 'sold' ? 'Purchase' : 'InitiateCheckout'

  async function logCapi(
    clientId: string,
    result: { status: 'sent' | 'failed' | 'skipped'; skip_reason?: string; pixel_id?: string; events_received?: number; fbtrace_id?: string; error_message?: string }
  ) {
    await db.from('capi_events').insert({
      lead_id:         leadId,
      client_id:       clientId,
      event_name:      eventName,
      ...result,
    }).then(({ error }) => {
      if (error) console.error('[capi] Erro ao salvar log:', error.message)
    })
  }

  // Busca lead
  const { data: lead } = await db
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) {
    console.warn('[capi] Lead não encontrado:', leadId)
    return
  }

  // Busca meta_account do cliente (uma query só)
  const { data: account } = await db
    .from('meta_accounts')
    .select('access_token, pixel_id')
    .eq('client_id', lead.client_id)
    .single()

  if (!account) {
    console.log('[capi] Sem meta_account para cliente:', lead.client_id)
    await logCapi(lead.client_id, { status: 'skipped', skip_reason: 'no_meta_account' })
    return
  }
  if (!account.access_token) {
    await logCapi(lead.client_id, { status: 'skipped', skip_reason: 'no_access_token' })
    return
  }
  if (!account.pixel_id) {
    await logCapi(lead.client_id, { status: 'skipped', skip_reason: 'no_pixel_id' })
    return
  }

  // event_id determinístico: mesmo lead + mesmo evento → Meta deduplica automaticamente
  const eventId = `${leadId}_${eventName}`

  const result = await sendCapiEvent({
    pixelId:     account.pixel_id,
    accessToken: account.access_token,
    eventName,
    eventId,
    phone:       lead.phone,
    firstName:   lead.name      ?? undefined,
    lastName:    lead.last_name ?? undefined,
    clickId:     lead.click_id  ?? undefined,
    value:       status === 'sold' ? (conversionValue ?? lead.conversion_value ?? undefined) : undefined,
    currency:    lead.currency ?? 'BRL',
  })

  if (result.error) {
    console.error('[capi] Falha ao enviar evento:', result.error.message)
    await logCapi(lead.client_id, {
      status:        'failed',
      pixel_id:      account.pixel_id,
      error_message: result.error.message,
    })
  } else {
    console.log(`[capi] ${eventName} enviado — pixel ${account.pixel_id} | recebidos: ${result.events_received}`)
    await logCapi(lead.client_id, {
      status:          'sent',
      pixel_id:        account.pixel_id,
      events_received: result.events_received,
      fbtrace_id:      result.fbtrace_id,
    })
  }
}

export async function getCapiStatusForLeads(leadIds: string[]): Promise<Record<string, 'sent' | 'failed' | 'skipped'>> {
  if (leadIds.length === 0) return {}
  const db = adminSupabase()
  const { data } = await db
    .from('capi_events')
    .select('lead_id, status')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })

  // Para cada lead, pega o status do evento mais recente
  const result: Record<string, 'sent' | 'failed' | 'skipped'> = {}
  for (const row of data ?? []) {
    if (!result[row.lead_id]) result[row.lead_id] = row.status
  }
  return result
}

export async function getClients() {
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, slug')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}
