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

  revalidatePath('/clientes')
  return client
}
