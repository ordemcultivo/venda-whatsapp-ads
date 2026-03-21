import { NextRequest } from 'next/server'
import { processWhatsappWebhook } from '@/lib/webhooks/process-whatsapp'

export async function POST(req: NextRequest) {
  return processWhatsappWebhook(req)
}
