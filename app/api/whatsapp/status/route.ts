import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const supabase = createAdminSupabase()

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
      return NextResponse.json({ state: 'not_configured' })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    if (!evoUrl) return NextResponse.json({ error: 'EVOLUTION_API_URL não configurado' }, { status: 500 })

    const res = await fetch(
      `${evoUrl}/instance/connectionState/${client.whatsapp_instance}`,
      { headers: { apikey: client.whatsapp_token }, cache: 'no-store' }
    )

    if (!res.ok) {
      return NextResponse.json({ state: 'error' })
    }

    const data = await res.json()
    const state = data?.instance?.state ?? data?.state ?? 'unknown'

    return NextResponse.json({ state })
  } catch (err: any) {
    return NextResponse.json({ state: 'error', error: err.message })
  }
}
