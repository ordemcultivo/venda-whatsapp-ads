import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const session = await auth()
  const user = session?.user as any

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
              user?.role === 'ADMIN'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-primary/15 text-primary'
            }`}>
              {user?.role}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Webhook Evolution API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Configure este URL no painel da Evolution API para capturar mensagens:
          </p>
          <div className="bg-secondary/50 rounded-lg p-3 font-mono text-xs break-all">
            {`${process.env.NEXTAUTH_URL ?? 'https://seudominio.com'}/api/webhooks/whatsapp`}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Header obrigatório:</span>
            <code className="bg-secondary/50 px-2 py-0.5 rounded">x-webhook-secret: roberto_venda_secret_2026</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
