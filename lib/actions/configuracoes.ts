'use server'

import { auth } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getClientConfig() {
  const session = await auth()
  const user = session?.user as any
  if (!user || !user.client_id) return null

  const supabase = createAdminSupabase()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, slug, whatsapp_instance, whatsapp_token')
    .eq('id', user.client_id)
    .single()

  const { data: meta } = await supabase
    .from('meta_accounts')
    .select('account_id, pixel_id, access_token')
    .eq('client_id', user.client_id)
    .single()

  return { client, meta }
}

export async function saveWhatsappConfig(data: {
  whatsapp_instance: string
  whatsapp_token: string
  provider: string // 'evolution' | 'uazapi'
}) {
  const session = await auth()
  const user = session?.user as any
  if (!user?.client_id) throw new Error('Não autenticado')

  const supabase = createAdminSupabase()
  const { error } = await supabase
    .from('clients')
    .update({
      whatsapp_instance: data.whatsapp_instance || null,
      whatsapp_token: data.whatsapp_token || null,
    })
    .eq('id', user.client_id)

  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
}

export async function saveMetaConfig(data: {
  account_id: string
  pixel_id: string
  access_token: string
}) {
  const session = await auth()
  const user = session?.user as any
  if (!user?.client_id) throw new Error('Não autenticado')

  const supabase = createAdminSupabase()

  const { data: existing } = await supabase
    .from('meta_accounts')
    .select('id')
    .eq('client_id', user.client_id)
    .single()

  const payload: any = {
    account_id: data.account_id || null,
    pixel_id: data.pixel_id || null,
  }
  if (data.access_token) payload.access_token = data.access_token

  if (existing) {
    await supabase.from('meta_accounts').update(payload).eq('client_id', user.client_id)
  } else {
    await supabase.from('meta_accounts').insert({ ...payload, client_id: user.client_id })
  }

  revalidatePath('/configuracoes')
}
