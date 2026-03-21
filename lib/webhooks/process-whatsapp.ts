import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      extendedTextMessage?: { text: string }
      imageMessage?: { caption?: string }
    }
    messageType: string
    messageTimestamp: number
    pushName?: string
    source?: string
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
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
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
  if (ads.campaign_name?.toLowerCase().includes('instagram')) return 'instagram'
  if (ads.campaign_id) return 'facebook'
  return 'unknown'
}

export async function processWhatsappWebhook(req: NextRequest): Promise<NextResponse> {
  try {
    console.log('[webhook] Recebido em:', req.nextUrl.pathname)

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
    const instance = payload.instance

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

    // Verifica se já existe lead com esse telefone
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('client_id', client.id)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let leadId = existingLead?.id

    if (!leadId) {
      const ads = payload.ads_data ?? {}
      const platform = ads.platform ?? detectPlatform(ads)

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          client_id:     client.id,
          phone,
          name:          data.pushName ?? null,
          platform,
          campaign_id:   ads.campaign_id ?? null,
          campaign_name: ads.campaign_name ?? null,
          adset_id:      ads.adset_id ?? null,
          adset_name:    ads.adset_name ?? null,
          ad_id:         ads.ad_id ?? null,
          ad_name:       ads.ad_name ?? null,
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
      console.log('[webhook] Novo lead criado:', leadId)
    } else {
      console.log('[webhook] Lead existente:', leadId)
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
