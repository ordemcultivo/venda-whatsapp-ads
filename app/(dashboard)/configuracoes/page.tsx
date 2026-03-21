import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import { getClientConfig } from '@/lib/actions/configuracoes'
import { ConfiguracoesIntegracoes } from '@/components/dashboard/configuracoes-integracoes'

export default async function ConfiguracoesPage() {
  const session = await auth()
  const user = session?.user as any
  const isAdmin = user?.role === 'ADMIN'

  const config = !isAdmin ? await getClientConfig() : null

  const webhookUrl = `${process.env.NEXTAUTH_URL ?? 'https://seudominio.com'}/api/webhooks/whatsapp`
  const webhookSecret = process.env.WEBHOOK_SECRET ?? 'roberto_venda_secret_2026'

  return (
    <div className="p-6 space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configurações da conta e integrações
        </p>
      </div>

      {/* Informações da conta */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">{user?.name ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Perfil</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isAdmin ? 'bg-amber-500/15 text-amber-400' : 'bg-primary/15 text-primary'
            }`}>
              {isAdmin ? 'Administrador' : 'Cliente'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Integrações — só para clientes */}
      {!isAdmin && (
        <ConfiguracoesIntegracoes
          client={config?.client ?? null}
          meta={config?.meta ?? null}
          webhookUrl={webhookUrl}
          webhookSecret={webhookSecret}
        />
      )}

      {/* Admin vê só o webhook geral */}
      {isAdmin && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">URL do Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Configure este URL no painel de cada instância do WhatsApp:
            </p>
            <div className="bg-secondary/50 rounded-lg p-3 font-mono text-xs break-all">
              {webhookUrl}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Header:</span>
              <code className="bg-secondary/50 px-2 py-0.5 rounded">x-webhook-secret: {webhookSecret}</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
