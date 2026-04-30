import { NextRequest } from 'next/server'
import { processWhatsappWebhook } from '@/lib/webhooks/process-whatsapp'

export async function POST(
  req: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  // Passa o webhookId para a função de processamento
  // O webhookId será usado como identificador da instância
  return processWhatsappWebhook(req, params.webhookId)
}
