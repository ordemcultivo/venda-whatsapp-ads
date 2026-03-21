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
  const sold = leads.filter(l => l.status === 'sold')
  const revenue = sold.reduce((acc, l) => acc + (l.conversion_value ?? 0), 0)

  return {
    total_leads: total,
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

  // Busca lead + meta_account do cliente
  const { data: lead } = await db
    .from('leads')
    .select('*, clients(id, meta_accounts(account_id, access_token))')
    .eq('id', leadId)
    .single()

  if (!lead) return

  const metaAccounts = (lead as any).clients?.meta_accounts ?? []
  if (metaAccounts.length === 0) return // Cliente sem conta Meta configurada

  const metaAccount = metaAccounts[0]
  if (!metaAccount?.access_token) return

  // Busca o pixel_id da meta_account
  const { data: fullAccount } = await db
    .from('meta_accounts')
    .select('account_id, access_token, pixel_id')
    .eq('client_id', lead.client_id)
    .single()

  if (!fullAccount?.access_token) return

  const pixelId = (fullAccount as any).pixel_id
  if (!pixelId) return

  await sendCapiEvent({
    pixelId,
    accessToken: fullAccount.access_token,
    eventName:   status === 'sold' ? 'Purchase' : 'Lead',
    phone:       lead.phone,
    firstName:   lead.name   ?? undefined,
    lastName:    lead.last_name ?? undefined,
    clickId:     lead.click_id ?? undefined,
    value:       status === 'sold' ? (conversionValue ?? lead.conversion_value ?? undefined) : undefined,
    currency:    lead.currency ?? 'BRL',
  })
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
