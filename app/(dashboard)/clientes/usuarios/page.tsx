import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { ClienteUsuariosTable } from '@/components/dashboard/cliente-usuarios-table'
import { UserPlus } from 'lucide-react'

export default async function ClienteUsuariosPage() {
  const session = await auth()
  const user = session?.user as any
  if (user?.role !== 'ADMIN') redirect('/dashboard')

  const db = createAdminSupabase()

  const [{ data: users }, { data: clients }] = await Promise.all([
    db.from('users').select('id, email, name, role, client_id, clients(name)').order('created_at', { ascending: false }),
    db.from('clients').select('id, name').eq('active', true).order('name'),
  ])

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" /> Usuários dos Clientes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crie logins para cada cliente acessar o painel com seus próprios dados
        </p>
      </div>
      <ClienteUsuariosTable
        users={(users ?? []) as any}
        clients={clients ?? []}
      />
    </div>
  )
}
