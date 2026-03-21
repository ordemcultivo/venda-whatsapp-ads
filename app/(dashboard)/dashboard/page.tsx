import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getDashboardStats, getLeadsByDay, getLeads, getClients } from '@/lib/actions/leads'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { LeadsChart } from '@/components/dashboard/leads-chart'
import { StatusDonut } from '@/components/dashboard/status-donut'
import { LeadsTable } from '@/components/dashboard/leads-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import { Users, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ client?: string; period?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await auth()
  const user = session?.user as any
  const isAdmin = user?.role === 'ADMIN'

  const clientId = isAdmin ? params.client : user?.client_id
  const period   = params.period ?? '30d'

  const [stats, chartData, leads, clients] = await Promise.all([
    getDashboardStats(clientId, period),
    getLeadsByDay(clientId, period),
    getLeads(clientId, period),
    isAdmin ? getClients() : Promise.resolve([]),
  ])

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rastreamento de leads via WhatsApp
          </p>
        </div>
        <DashboardFilters
          clients={clients}
          selectedClient={params.client}
          selectedPeriod={period}
          isAdmin={isAdmin}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Leads"
          value={stats.total_leads}
          subtitle="conversas iniciadas"
          icon={Users}
          color="blue"
        />
        <KpiCard
          title="Vendas Realizadas"
          value={stats.sold_leads}
          subtitle={`${stats.conversion_rate}% de conversão`}
          icon={CheckCircle2}
          color="green"
        />
        <KpiCard
          title="Valor Total Vendido"
          value={`R$ ${stats.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="receita no período"
          icon={DollarSign}
          color="purple"
        />
        <KpiCard
          title="Qualificados"
          value={stats.qualified_leads}
          subtitle="em negociação"
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              📊 Leads ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[260px] w-full" />}>
              <LeadsChart data={chartData} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Donut */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🍩 Status dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut
              new_leads={stats.new_leads}
              qualified_leads={stats.qualified_leads}
              sold_leads={stats.sold_leads}
            />
          </CardContent>
        </Card>
      </div>

      {/* Leads table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              📋 Leads Recentes
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} no período
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          <LeadsTable leads={leads} />
        </CardContent>
      </Card>
    </div>
  )
}
