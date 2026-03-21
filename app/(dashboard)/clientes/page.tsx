import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { ClientesTable } from '@/components/dashboard/clientes-table'
import { Users } from 'lucide-react'

export default async function ClientesPage() {
  const session = await auth()
  const user = session?.user as any
  if (user?.role !== 'ADMIN') redirect('/dashboard')

  const supabase = createAdminSupabase()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Clientes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie os clientes e suas integrações
        </p>
      </div>
      <ClientesTable clients={clients ?? []} />
    </div>
  )
}
