import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const supabase = createAdminSupabase()

    // Busca instância e token do cliente
    const clientId = user.role === 'ADMIN'
      ? req.nextUrl.searchParams.get('client_id')
      : user.client_id

    if (!clientId) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })

    const { data: client } = await supabase
      .from('clients')
      .select('whatsapp_instance, whatsapp_token')
      .eq('id', clientId)
      .single()

    if (!client?.whatsapp_instance || !client?.whatsapp_token) {
      return NextResponse.json({ error: 'Instância ou token não configurados' }, { status: 400 })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    if (!evoUrl) return NextResponse.json({ error: 'EVOLUTION_API_URL não configurado' }, { status: 500 })

    // Busca QR code da Evolution API
    const res = await fetch(`${evoUrl}/instance/connect/${client.whatsapp_instance}`, {
      headers: { apikey: client.whatsapp_token },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Evolution API: ${err}` }, { status: res.status })
    }

    const data = await res.json()

    return NextResponse.json({
      qrcode: data.base64 ?? data.qrcode?.base64 ?? null,
      code: data.code ?? data.qrcode?.code ?? null,
      status: data.instance?.state ?? 'unknown',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
