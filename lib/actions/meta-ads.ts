'use server'

import { auth } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  cpc: string
  cpm: string
  ctr: string
  conversations?: number
  meta_conversations?: number
  cost_per_conversation?: number
}

export async function getMetaCampaigns(period: string = 'last_30d', clientId?: string): Promise<MetaCampaign[]> {
  const session = await auth()
  const user = session?.user as any
  if (!user) throw new Error('Não autenticado')

  const supabase = createAdminSupabase()

  // Busca meta_account do cliente
  let query = supabase
    .from('meta_accounts')
    .select('access_token, account_id, pixel_id, client_id')

  if (user.role === 'ADMIN' && clientId) {
    query = query.eq('client_id', clientId)
  } else if (user.role !== 'ADMIN') {
    query = query.eq('client_id', user.client_id)
  } else {
    // ADMIN sem cliente selecionado — retorna vazio
    return []
  }

  const { data: accounts } = await query.limit(1).single()

  if (!accounts?.access_token || !accounts?.account_id) {
    return []
  }

  const accountId = accounts.account_id.startsWith('act_')
    ? accounts.account_id
    : `act_${accounts.account_id}`

  // Busca campanhas (nome, status, objetivo)
  const campaignsUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,objective&limit=50&access_token=${accounts.access_token}`
  const campaignsRes = await fetch(campaignsUrl, { next: { revalidate: 300 } })
  const campaignsJson = await campaignsRes.json()
  if (campaignsJson.error) throw new Error(campaignsJson.error.message)

  const rawCampaigns: { id: string; name: string; status: string; objective: string }[] = campaignsJson.data ?? []

  // Busca insights por campanha via account insights com level=campaign
  const insightFields = 'campaign_id,spend,impressions,clicks,reach,cpc,cpm,ctr,actions'
  const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${insightFields}&level=campaign&date_preset=${period}&limit=50&access_token=${accounts.access_token}`
  const insightsRes = await fetch(insightsUrl, { next: { revalidate: 300 } })
  const insightsJson = await insightsRes.json()
  if (insightsJson.error) throw new Error(insightsJson.error.message)

  // Mapeia insights por campaign_id
  const insightsMap: Record<string, any> = {}
  for (const insight of insightsJson.data ?? []) {
    insightsMap[insight.campaign_id] = insight
  }

  // Extrai conversas por mensagem do array de actions
  function extractMessagingConversations(actions: any[]): number {
    if (!actions) return 0
    const types = [
      'onsite_conversion.messaging_conversation_started_7d',
      'onsite_conversion.messaging_first_reply',
      'onsite_conversion.messaging_welcome_message_view',
    ]
    for (const type of types) {
      const action = actions.find((a: any) => a.action_type === type)
      if (action) return parseInt(action.value ?? '0')
    }
    return 0
  }

  // Combina campanhas + insights
  const campaigns: MetaCampaign[] = rawCampaigns.map(c => {
    const ins = insightsMap[c.id] ?? {}
    const metaConversations = extractMessagingConversations(ins.actions ?? [])
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spend: ins.spend ?? '0',
      impressions: ins.impressions ?? '0',
      clicks: ins.clicks ?? '0',
      reach: ins.reach ?? '0',
      cpc: ins.cpc ?? '0',
      cpm: ins.cpm ?? '0',
      ctr: ins.ctr ?? '0',
      meta_conversations: metaConversations,
    }
  })

  // Busca conversas (leads) por campanha no banco
  const resolvedClientId = accounts.client_id
  const { data: leads } = await supabase
    .from('leads')
    .select('campaign_id')
    .eq('client_id', resolvedClientId)
    .not('campaign_id', 'is', null)

  // Agrupa por campaign_id
  const leadsPerCampaign: Record<string, number> = {}
  for (const lead of leads ?? []) {
    if (lead.campaign_id) {
      leadsPerCampaign[lead.campaign_id] = (leadsPerCampaign[lead.campaign_id] ?? 0) + 1
    }
  }

  // Injeta contagem de conversas e custo por conversa em cada campanha
  return campaigns.map(c => {
    // Usa conversas do Meta se disponível, senão usa leads do banco
    const metaConv = c.meta_conversations ?? 0
    const dbConv = leadsPerCampaign[c.id] ?? 0
    const conversations = metaConv > 0 ? metaConv : dbConv
    const spend = parseFloat(c.spend || '0')
    const cost_per_conversation = conversations > 0 ? spend / conversations : 0
    return { ...c, conversations, cost_per_conversation }
  })
}

export async function getMetaAdSets(campaignId: string, period: string = 'last_30d'): Promise<any[]> {
  const session = await auth()
  const user = session?.user as any
  if (!user) throw new Error('Não autenticado')

  const supabase = createAdminSupabase()

  let query = supabase.from('meta_accounts').select('access_token')
  if (user.role !== 'ADMIN') query = query.eq('client_id', user.client_id)

  const { data: account } = await query.limit(1).single()
  if (!account?.access_token) return []

  const fields = 'name,status,spend,impressions,clicks,reach,cpc'
  const url = `https://graph.facebook.com/v19.0/${campaignId}/adsets?fields=${fields}&date_preset=${period}&access_token=${account.access_token}`

  const res = await fetch(url, { next: { revalidate: 300 } })
  const json = await res.json()

  return json.data ?? []
}
