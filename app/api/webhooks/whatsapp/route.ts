import { NextRequest } from 'next/server'
import { processWhatsappWebhook } from '@/lib/webhooks/process-whatsapp'

export async function POST(req: NextRequest) {
  // Compatibilidade: sem webhookId, usa a instância do payload
  return processWhatsappWebhook(req, undefined)
}
