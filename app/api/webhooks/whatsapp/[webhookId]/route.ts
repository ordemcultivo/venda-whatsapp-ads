import { NextRequest } from 'next/server'
import { processWhatsappWebhook } from '@/lib/webhooks/process-whatsapp'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  // Passa o webhookId para a função de processamento
  // O webhookId será usado como identificador da instância
  const { webhookId } = await params
  return processWhatsappWebhook(req, webhookId)
}
