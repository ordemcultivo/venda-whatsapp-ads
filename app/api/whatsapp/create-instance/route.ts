import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const clientId = user.role === 'ADMIN'
      ? (await req.json().catch(() => ({}))).client_id
      : user.client_id

    if (!clientId) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const instanceName: string = body.instanceName?.trim()
    if (!instanceName) return NextResponse.json({ error: 'Nome da instância obrigatório' }, { status: 400 })

    const evoUrl = process.env.EVOLUTION_API_URL
    const globalKey = process.env.EVOLUTION_GLOBAL_API_KEY
    if (!evoUrl || !globalKey) {
      return NextResponse.json({ error: 'EVOLUTION_API_URL ou EVOLUTION_GLOBAL_API_KEY não configurados' }, { status: 500 })
    }

    const instanceToken = generateToken()

    // Cria a instância na Evolution API
    const createRes = await fetch(`${evoUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: globalKey },
      body: JSON.stringify({
        instanceName,
        token: instanceToken,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      return NextResponse.json({ error: `Evolution API: ${err}` }, { status: createRes.status })
    }

    const createData = await createRes.json()

    // Salva no banco
    const supabase = createAdminSupabase()
    await supabase
      .from('clients')
      .update({ whatsapp_instance: instanceName, whatsapp_token: instanceToken })
      .eq('id', clientId)

    // Retorna QR code se já disponível na resposta de create
    const qrcode =
      createData.qrcode?.base64 ??
      createData.base64 ??
      null

    return NextResponse.json({
      success: true,
      instanceName,
      token: instanceToken,
      qrcode,
      state: createData.instance?.state ?? 'connecting',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
