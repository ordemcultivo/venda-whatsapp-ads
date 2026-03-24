import { auth } from '@/lib/auth'
import { getLeads, getClients, updateLeadStatus, getCapiStatusForLeads } from '@/lib/actions/leads'
import { LeadsTable } from '@/components/dashboard/leads-table'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LeadStatus } from '@/lib/types'
import { Users } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ client?: string; period?: string }>
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await auth()
  const user = session?.user as any
  const isAdmin = user?.role === 'ADMIN'

  const clientId = isAdmin ? params.client : user?.client_id
  const period = params.period ?? '30d'

  const [leads, clients] = await Promise.all([
    getLeads(clientId, period),
    isAdmin ? getClients() : Promise.resolve([]),
  ])

  const capiStatus = await getCapiStatusForLeads(leads.map(l => l.id))

  async function handleStatusChange(leadId: string, status: LeadStatus, value?: number) {
    'use server'
    await updateLeadStatus(leadId, status, value)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Todas as conversas rastreadas via WhatsApp
          </p>
        </div>
        <DashboardFilters
          clients={clients}
          selectedClient={params.client}
          selectedPeriod={period}
          isAdmin={isAdmin}
        />
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Todos os Leads</CardTitle>
            <span className="text-xs text-muted-foreground">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} no período
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          <LeadsTable leads={leads} onStatusChange={handleStatusChange} capiStatus={capiStatus} />
        </CardContent>
      </Card>
    </div>
  )
}
