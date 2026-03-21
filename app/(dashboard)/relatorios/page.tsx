import { auth } from '@/lib/auth'
import { getLeads, getClients, getDashboardStats } from '@/lib/actions/leads'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import { RelatoriosCharts } from '@/components/dashboard/relatorios-charts'
import { FileBarChart2 } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ client?: string; period?: string }>
}

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await auth()
  const user = session?.user as any
  const isAdmin = user?.role === 'ADMIN'

  const clientId = isAdmin ? params.client : user?.client_id
  const period = params.period ?? '30d'

  const [leads, clients, stats] = await Promise.all([
    getLeads(clientId, period),
    isAdmin ? getClients() : Promise.resolve([]),
    getDashboardStats(clientId, period),
  ])

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-primary" /> Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise detalhada de desempenho
          </p>
        </div>
        <DashboardFilters
          clients={clients}
          selectedClient={params.client}
          selectedPeriod={period}
          isAdmin={isAdmin}
        />
      </div>

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total de Leads',     value: stats.total_leads },
          { label: 'Vendas',             value: stats.sold_leads },
          { label: 'Qualificados',       value: stats.qualified_leads },
          { label: 'Taxa de Conversão',  value: `${stats.conversion_rate}%` },
          { label: 'Valor Total',        value: `R$ ${stats.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-bold font-mono text-primary mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <RelatoriosCharts leads={leads} />
    </div>
  )
}
