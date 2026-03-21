'use server'

import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Client } from '@/lib/types'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createClientAction(data: {
  name: string
  slug: string
  whatsapp_instance?: string
  whatsapp_token?: string
  meta_account_id?: string
  meta_access_token?: string
  meta_pixel_id?: string
}): Promise<Client> {
  const session = await auth()
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Acesso negado')

  const supabase = getAdminClient()

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: data.name,
      slug: data.slug,
      whatsapp_instance: data.whatsapp_instance || null,
      whatsapp_token: data.whatsapp_token || null,
      meta_account_id: data.meta_account_id || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Salva tokens Meta se fornecidos
  if (data.meta_access_token || data.meta_pixel_id) {
    await supabase.from('meta_accounts').insert({
      client_id: client.id,
      account_id: data.meta_account_id || null,
      access_token: data.meta_access_token || null,
      pixel_id: data.meta_pixel_id || null,
    })
  }

  revalidatePath('/clientes')
  return client
}

export async function updateClientAction(id: string, data: {
  name: string
  slug: string
  whatsapp_instance?: string
  whatsapp_token?: string
  meta_account_id?: string
  meta_access_token?: string
  meta_pixel_id?: string
}): Promise<Client> {
  const session = await auth()
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Acesso negado')

  const supabase = getAdminClient()

  const { data: client, error } = await supabase
    .from('clients')
    .update({
      name: data.name,
      slug: data.slug,
      whatsapp_instance: data.whatsapp_instance || null,
      whatsapp_token: data.whatsapp_token || null,
      meta_account_id: data.meta_account_id || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Upsert meta_accounts
  if (data.meta_access_token || data.meta_pixel_id) {
    const { data: existing } = await supabase
      .from('meta_accounts')
      .select('id')
      .eq('client_id', id)
      .single()

    if (existing) {
      const updateData: any = {
        account_id: data.meta_account_id || null,
        pixel_id: data.meta_pixel_id || null,
      }
      // Só atualiza o token se um novo foi fornecido
      if (data.meta_access_token) {
        updateData.access_token = data.meta_access_token
      }
      await supabase.from('meta_accounts').update(updateData).eq('client_id', id)
    } else {
      await supabase.from('meta_accounts').insert({
        client_id: id,
        account_id: data.meta_account_id || null,
        access_token: data.meta_access_token || null,
        pixel_id: data.meta_pixel_id || null,
      })
    }
  }

  revalidatePath('/clientes')
  return client
}

export async function deleteClientAction(id: string): Promise<void> {
  const session = await auth()
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Acesso negado')

  const supabase = getAdminClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/clientes')
}
