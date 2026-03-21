import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Megaphone } from 'lucide-react'

export default function MetaAdsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" /> Meta Ads
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Integração com Meta Ads e Conversions API
        </p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Como funciona a integração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Lead chega no WhatsApp', desc: 'Webhook captura automaticamente com dados do anúncio (campanha, conjunto, criativo)', color: 'text-blue-400 bg-blue-500/10' },
              { step: '2', title: 'Qualificado', desc: 'Ao marcar como Qualificado → dispara evento Lead na Meta CAPI', color: 'text-emerald-400 bg-emerald-500/10' },
              { step: '3', title: 'Vendido', desc: 'Ao marcar como Vendido → dispara evento Purchase com valor na Meta CAPI', color: 'text-violet-400 bg-violet-500/10' },
            ].map(item => (
              <div key={item.step} className={`p-4 rounded-lg border border-border/50 ${item.color.split(' ')[1]}`}>
                <div className={`text-lg font-bold font-mono ${item.color.split(' ')[0]}`}>{item.step}</div>
                <div className="text-sm font-semibold mt-1">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-secondary/40 rounded-lg p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm">Para ativar:</p>
            <p>1. Cadastre o cliente em <strong className="text-foreground">Clientes</strong> com o Account ID e Access Token da Meta</p>
            <p>2. Configure o Pixel ID do cliente</p>
            <p>3. Os eventos serão disparados automaticamente ao mudar o status do lead</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
