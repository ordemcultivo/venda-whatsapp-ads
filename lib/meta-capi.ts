/**
 * Meta Conversions API (CAPI)
 * Dispara eventos server-side para o pixel do cliente
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from 'crypto'

function hash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

interface CapiEventData {
  pixelId: string
  accessToken: string
  eventName: 'Lead' | 'Purchase' | 'InitiateCheckout'
  eventTime?: number
  phone?: string
  email?: string
  firstName?: string
  lastName?: string
  clickId?: string          // ctwa_clid (Click-to-WhatsApp) ou fbclid
  value?: number
  currency?: string
  campaignId?: string
  adsetId?: string
  adId?: string
  whatsappBusinessAccountId?: string
}

interface CapiResponse {
  events_received?: number
  messages?: string[]
  fbtrace_id?: string
  error?: { message: string; code: number }
}

export async function sendCapiEvent(data: CapiEventData): Promise<CapiResponse> {
  const {
    pixelId, accessToken, eventName, phone, email,
    firstName, lastName, clickId, value, currency = 'BRL',
    whatsappBusinessAccountId,
    eventTime = Math.floor(Date.now() / 1000),
  } = data

  // Dados do usuário hasheados (obrigatório pela Meta)
  const userData: Record<string, any> = {}
  if (phone)     userData.ph = hash(phone.replace(/\D/g, ''))
  if (email)     userData.em = hash(email)
  if (firstName) userData.fn = hash(firstName)
  if (lastName)  userData.ln = hash(lastName)
  // ctwa_clid: não é hasheado, enviado direto (campo separado do fbc)
  if (clickId)   userData.ctwa_clid = clickId
  if (whatsappBusinessAccountId) userData.whatsapp_business_account_id = whatsappBusinessAccountId

  // Dados customizados do evento
  const customData: Record<string, any> = {}
  if (value !== undefined) {
    customData.value    = value
    customData.currency = currency
  }

  const payload = {
    data: [
      {
        event_name:        eventName,
        event_time:        eventTime,
        action_source:     'business_messaging',  // correto para WhatsApp
        messaging_channel: 'whatsapp',
        user_data:         userData,
        custom_data:       Object.keys(customData).length > 0 ? customData : undefined,
      },
    ],
    // test_event_code: 'TEST12345', // descomente para testar no Gerenciador de Eventos
  }

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })

  const json: CapiResponse = await res.json()

  if (!res.ok || json.error) {
    console.error('[meta-capi] Erro ao enviar evento:', json.error ?? json)
  } else {
    console.log(`[meta-capi] Evento ${eventName} enviado — pixel ${pixelId} | recebidos: ${json.events_received}`)
  }

  return json
}
