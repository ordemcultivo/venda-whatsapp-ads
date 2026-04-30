import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendCapiEvent } from '@/lib/meta-capi'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExternalAdReply {
  title?: string
  body?: string
  sourceType?: string
  sourceId?: string
  sourceUrl?: string
}

interface EvolutionPayload {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message?: {
      conversation?: string
      extendedTextMessage?: {
        text?: string
        contextInfo?: { externalAdReply?: ExternalAdReply }
      }
      imageMessage?: {
        caption?: string
        contextInfo?: { externalAdReply?: ExternalAdReply }
      }
      buttonsResponseMessage?: {
        contextInfo?: { externalAdReply?: ExternalAdReply }
      }
    }
    // contextInfo no nível raiz do data (Evolution API v2 — CTWA ads)
    contextInfo?: {
      externalAdReply?: ExternalAdReply & {
        ctwaClid?: string
        sourceApp?: string   // 'instagram' | 'facebook'
      }
      conversionSource?: string          // 'FB_Ads'
      entryPointConversionApp?: string   // 'instagram' | 'facebook'
      entryPointConversionSource?: string // 'ctwa_ad'
    }
    messageType: string
    messageTimestamp: number
    pushName?: string
    source?: string
    referral?: {
      sourceUrl?: string
      sourceId?: string
      sourceType?: string
      headline?: string
      body?: string
      ctwaClid?: string
    }
  }
  ads_data?: {
    campaign_id?: string
    campaign_name?: string
    adset_id?: string
    adset_name?: string
    ad_id?: string
    ad_name?: string
    platform?: string
    click_id?: string
  }
}

function extractPhone(jid: string): string {
  return jid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .replace('@c.us', '')
}

function extractContent(data: EvolutionPayload['data']): string {
  return (
    data.message?.conversation ||
    data.message?.extendedTextMessage?.text ||
    data.message?.imageMessage?.caption ||
    ''
  )
}

function detectPlatform(ads: any): string {
  if (ads.platform) return ads.platform
  if (ads.campaign_name?.toLowerCase().includes('instagram')) return 'instagram'
  if (ads.campaign_id) return 'facebook'
  return 'unknown'
}

async function enrichWithMetaAdData(adId: string, clientId: string) {
  try {
    const { data: account } = await supabase
      .from('meta_accounts')
      .select('access_token')
      .eq('client_id', clientId)
      .single()

    if (!account?.access_token) return null

    const url = `https://graph.facebook.com/v19.0/${adId}?fields=name,campaign{id,name},adset{id,name}&access_token=${account.access_token}`
    const res = await fetch(url)
    const json = await res.json()

    if (json.error) {
      console.log('[webhook] Meta API erro ao enriquecer ad:', json.error.message)
      return null
    }

    return {
      ad_name:       json.name          ?? null,
      campaign_id:   json.campaign?.id   ?? null,
      campaign_name: json.campaign?.name ?? null,
      adset_id:      json.adset?.id      ?? null,
      adset_name:    json.adset?.name    ?? null,
    }
  } catch (e: any) {
    console.log('[webhook] Erro ao enriquecer com Meta API:', e.message)
    return null
  }
}

function extractAdsData(payload: EvolutionPayload) {
  // Prioridade 1: ads_data manual (caso customizado)
  if (payload.ads_data && Object.keys(payload.ads_data).length > 0) {
    return payload.ads_data
  }

  // Prioridade 2: referral (Click to WhatsApp — alguns webhooks enviam ctwaClid aqui)
  const referral = payload.data.referral
  if (referral?.ctwaClid || referral?.sourceId) {
    const isInstagram = referral.sourceUrl?.includes('instagram')
    return {
      platform:    isInstagram ? 'instagram' : 'facebook',
      click_id:    referral.ctwaClid ?? null,
      ad_id:       referral.sourceId ?? null,
      ad_name:     referral.headline ?? null,
      campaign_id: null,
      campaign_name: null,
      adset_id:    null,
      adset_name:  null,
    }
  }

  // Prioridade 3: contextInfo no nível raiz do data (Evolution API v2 — formato real do CTWA)
  const rootCtx = payload.data.contextInfo
  const rootAdReply = rootCtx?.externalAdReply
  if (rootAdReply?.ctwaClid || rootAdReply?.sourceId) {
    const app = rootAdReply.sourceApp ?? rootCtx?.entryPointConversionApp ?? ''
    const isInstagram =
      app.toLowerCase().includes('instagram') ||
      (rootAdReply.sourceUrl ?? '').includes('instagram')
    return {
      platform:    isInstagram ? 'instagram' : 'facebook',
      click_id:    rootAdReply.ctwaClid ?? null,
      ad_id:       rootAdReply.sourceId ?? null,
      ad_name:     rootAdReply.title ?? null,
      campaign_id: null,
      campaign_name: null,
      adset_id:    null,
      adset_name:  null,
    }
  }

  // Prioridade 3.5: conversionSource no contextInfo raiz (CTWA sem externalAdReply — padrão MM Clean / Yas)
  // A Evolution API v2 às vezes omite externalAdReply mas envia conversionSource: 'FB_Ads'
  if (rootCtx?.conversionSource === 'FB_Ads' || rootCtx?.entryPointConversionSource === 'ctwa_ad') {
    const app = rootCtx?.entryPointConversionApp ?? ''
    const isInstagram = app.toLowerCase().includes('instagram')
    return {
      platform:      isInstagram ? 'instagram' : 'facebook',
      click_id:      null,
      ad_id:         null,
      ad_name:       null,
      campaign_id:   null,
      campaign_name: null,
      adset_id:      null,
      adset_name:    null,
    }
  }

  // Prioridade 4: contextInfo.externalAdReply dentro da mensagem (fallback)
  const msg = payload.data.message
  const adReply =
    msg?.extendedTextMessage?.contextInfo?.externalAdReply ??
    msg?.imageMessage?.contextInfo?.externalAdReply ??
    msg?.buttonsResponseMessage?.contextInfo?.externalAdReply

  if (adReply?.sourceId) {
    return {
      platform:    'facebook',
      ad_id:       adReply.sourceId ?? null,
      ad_name:     adReply.title ?? null,
      click_id:    null,
      campaign_id: null,
      campaign_name: null,
      adset_id:    null,
      adset_name:  null,
    }
  }

  return {}
}

async function fireCapiLeadEvent(
  leadId: string,
  clientId: string,
  phone: string,
  name: string | null,
  clickId: string | null,
) {
  const { data: account } = await supabase
    .from('meta_accounts')
    .select('access_token, pixel_id')
    .eq('client_id', clientId)
    .single()

  if (!account?.access_token || !account?.pixel_id) return

  await sendCapiEvent({
    pixelId:     account.pixel_id,
    accessToken: account.access_token,
    eventName:   'LeadSubmitted',
    eventId:     `${leadId}_LeadSubmitted`,   // deduplicação: mesmo que fireCapiEvent tente enviar de novo
    phone,
    firstName:   name ?? undefined,
    clickId:     clickId ?? undefined,
  })

  console.log('[webhook] CAPI Lead disparado para lead:', leadId)
}

export async function processWhatsappWebhook(req: NextRequest, webhookId?: string): Promise<NextResponse> {
  try {
    console.log('[webhook] Recebido em:', req.nextUrl.pathname)
    console.log('[webhook] Webhook ID:', webhookId || 'padrão')

    // Valida secret apenas se enviado
    const secret =
      req.headers.get('x-webhook-secret') ??
      req.nextUrl.searchParams.get('secret')

    if (secret && secret !== process.env.WEBHOOK_SECRET) {
      console.log('[webhook] Secret inválido, rejeitado')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: EvolutionPayload = await req.json()

    console.log('[webhook] Event:', payload.event)
    console.log('[webhook] Instance:', payload.instance)

    // Normaliza o nome do evento (MESSAGES_UPSERT → messages.upsert)
    const eventNorm = payload.event?.toLowerCase().replace('_', '.')
    if (eventNorm !== 'messages.upsert') {
      console.log('[webhook] Evento ignorado:', payload.event)
      return NextResponse.json({ ok: true, skipped: payload.event })
    }

    const { data } = payload

    if (data.key.fromMe) {
      console.log('[webhook] Mensagem enviada por mim, ignorada')
      return NextResponse.json({ ok: true, skipped: 'outbound' })
    }

    const phone = extractPhone(data.key.remoteJid)
    const content = extractContent(data)

    // Usa webhookId se fornecido, caso contrário usa a instância do payload
    const instance = webhookId || payload.instance

    console.log('[webhook] Processando mensagem de:', phone, '| instância:', instance)

    // Encontra o cliente pela instância (case-insensitive)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .ilike('whatsapp_instance', instance)
      .single()

    if (clientError || !client) {
      console.log('[webhook] Cliente não encontrado para instância:', instance)
      return NextResponse.json({ error: 'Client not found for instance: ' + instance }, { status: 404 })
    }

    console.log('[webhook] Cliente encontrado:', client.id)

    const ads = extractAdsData(payload)

    // Deduplicação: ignora se já existe lead do mesmo telefone nos últimos 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLead } = await supabase
      .from('leads')
      .select('id, ad_id, campaign_id')
      .eq('client_id', client.id)
      .eq('phone', phone)
      .gte('contacted_at', sevenDaysAgo)
      .order('contacted_at', { ascending: false })
      .limit(1)
      .single()

    let leadId: string | undefined = recentLead?.id
    let isNewLead = false

    if (recentLead) {
      // Lead existente na janela de 7 dias — enriquece retroativamente se ainda sem ad_id
      if (!recentLead.ad_id && ads.ad_id) {
        const enriched = await enrichWithMetaAdData(ads.ad_id, client.id)
        const update: Record<string, any> = {
          ad_id:    ads.ad_id,
          click_id: ads.click_id ?? null,
          platform: detectPlatform(ads),
        }
        if (enriched) {
          update.ad_name       = enriched.ad_name
          update.campaign_id   = enriched.campaign_id
          update.campaign_name = enriched.campaign_name
          update.adset_id      = enriched.adset_id
          update.adset_name    = enriched.adset_name
          console.log('[webhook] Lead retroativamente enriquecido:', recentLead.id, '|', enriched.ad_name)
        }
        await supabase.from('leads').update(update).eq('id', recentLead.id)
      } else {
        console.log('[webhook] Lead na janela de 7 dias, ignorando duplicata:', recentLead.id)
      }
    } else {
      // Novo lead
      const platform = detectPlatform(ads)

      let enriched: Awaited<ReturnType<typeof enrichWithMetaAdData>> = null
      if (ads.ad_id) {
        enriched = await enrichWithMetaAdData(ads.ad_id, client.id)
        if (enriched) {
          console.log('[webhook] Enriquecido com Meta API:', enriched.ad_name, '|', enriched.campaign_name)
        }
      }

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          client_id:     client.id,
          phone,
          name:          data.pushName ?? null,
          platform,
          campaign_id:   enriched?.campaign_id   ?? ads.campaign_id   ?? null,
          campaign_name: enriched?.campaign_name ?? ads.campaign_name ?? null,
          adset_id:      enriched?.adset_id      ?? ads.adset_id      ?? null,
          adset_name:    enriched?.adset_name    ?? ads.adset_name    ?? null,
          ad_id:         ads.ad_id ?? null,
          ad_name:       enriched?.ad_name ?? ads.ad_name ?? null,
          click_id:      ads.click_id ?? null,
          contacted_at:  new Date(data.messageTimestamp * 1000).toISOString(),
        })
        .select('id')
        .single()

      if (leadError) {
        console.log('[webhook] Erro ao criar lead:', leadError.message)
        throw leadError
      }

      leadId = newLead.id
      isNewLead = true
      console.log('[webhook] Novo lead criado:', leadId)

      // Dispara evento CAPI Lead se veio de anúncio
      if (leadId && (ads.ad_id || ads.click_id)) {
        fireCapiLeadEvent(leadId, client.id, phone, data.pushName ?? null, ads.click_id ?? null).catch(
          err => console.error('[webhook] Erro CAPI Lead:', err.message)
        )
      }
    }

    // Salva a mensagem
    await supabase.from('whatsapp_messages').insert({
      client_id:    client.id,
      lead_id:      leadId,
      message_id:   data.key.id,
      phone,
      direction:    'inbound',
      message_type: data.messageType,
      content,
      raw_payload:  payload as any,
    })

    console.log('[webhook] Mensagem salva com sucesso')
    return NextResponse.json({ ok: true, lead_id: leadId })

  } catch (err: any) {
    console.error('[webhook] Erro:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
