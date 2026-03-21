'use server'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createClientUserAction(data: {
  name: string
  email: string
  password: string
  client_id: string
}) {
  const session = await auth()
  const me = session?.user as any
  if (me?.role !== 'ADMIN') throw new Error('Acesso negado')

  if (!data.client_id) throw new Error('Selecione um cliente')
  if (data.password.length < 8) throw new Error('Senha deve ter pelo menos 8 caracteres')

  const db = createAdminSupabase()

  // Cria no Supabase Auth
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email:         data.email,
    password:      data.password,
    email_confirm: true,
    user_metadata: { name: data.name, role: 'CLIENT' },
  })

  if (authErr) throw new Error(authErr.message)

  // Atualiza o client_id no perfil (o trigger criou com role CLIENT, falta o client_id)
  const { error: profileErr } = await db
    .from('users')
    .update({ client_id: data.client_id, name: data.name })
    .eq('id', authUser.user.id)

  if (profileErr) throw new Error(profileErr.message)

  // Retorna o perfil completo com nome do cliente
  const { data: profile } = await db
    .from('users')
    .select('id, email, name, role, client_id, clients(name)')
    .eq('id', authUser.user.id)
    .single()

  revalidatePath('/clientes/usuarios')
  return profile
}
