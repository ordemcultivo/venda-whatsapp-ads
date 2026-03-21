import { Megaphone } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getMetaCampaigns } from '@/lib/actions/meta-ads'
import { MetaAdsDashboard } from '@/components/dashboard/meta-ads-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { MetaAdsClientSelect } from '@/components/dashboard/meta-ads-client-select'

interface Props {
  searchParams: Promise<{ period?: string; client?: string }>
}

export default async function MetaAdsPage({ searchParams }: Props) {
  const { period = 'last_30d', client: clientId } = await searchParams
  const session = await auth()
  const user = session?.user as any
  const isAdmin = user?.role === 'ADMIN'

  // Busca clientes com meta configurado (só para admin)
  let clients: { id: string; name: string }[] = []
  if (isAdmin) {
    const supabase = createAdminSupabase()
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')
    clients = data ?? []
  }

  let campaigns: Awaited<ReturnType<typeof getMetaCampaigns>> = []
  let error = ''

  const effectiveClientId = isAdmin ? clientId : user?.client_id

  if (effectiveClientId) {
    try {
      campaigns = await getMetaCampaigns(period, effectiveClientId)
    } catch (err: any) {
      error = err.message
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Meta Ads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance das campanhas no Meta Ads
          </p>
        </div>
        {isAdmin && (
          <MetaAdsClientSelect clients={clients} selectedClient={clientId} period={period} />
        )}
      </div>

      {isAdmin && !clientId && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Selecione um cliente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha um cliente no seletor acima para ver as campanhas.
            </p>
          </CardContent>
        </Card>
      )}

      {effectiveClientId && error && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <p className="text-sm text-destructive font-medium">Erro ao conectar com a Meta API</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Verifique se o Access Token e o Account ID estão configurados corretamente em Clientes.
            </p>
          </CardContent>
        </Card>
      )}

      {effectiveClientId && !error && campaigns.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhuma campanha encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique se o Access Token e Account ID estão configurados em Clientes,
              ou se há campanhas ativas no período selecionado.
            </p>
          </CardContent>
        </Card>
      )}

      {campaigns.length > 0 && (
        <MetaAdsDashboard campaigns={campaigns} period={period} />
      )}
    </div>
  )
}
