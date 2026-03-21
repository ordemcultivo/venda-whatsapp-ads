'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import type { Lead } from '@/lib/types'

interface Props { leads: Lead[] }

const COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#84cc16','#f97316','#ec4899','#14b8a6',
]

function countBy<T>(arr: T[], key: keyof T) {
  const map: Record<string, number> = {}
  arr.forEach(item => {
    const val = String(item[key] ?? 'Desconhecido')
    map[val] = (map[val] ?? 0) + 1
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name: name.length > 28 ? name.slice(0, 28) + '…' : name, value }))
    .sort((a, b) => b.value - a.value)
}

export function RelatoriosCharts({ leads }: Props) {
  const byPlatform   = countBy(leads, 'platform')
  const byCampaign   = countBy(leads.filter(l => l.campaign_name), 'campaign_name').slice(0, 8)
  const byAd         = countBy(leads.filter(l => l.ad_name), 'ad_name').slice(0, 8)

  const soldLeads    = leads.filter(l => l.status === 'sold')
  const soldByPlatform  = countBy(soldLeads, 'platform')
  const soldByCampaign  = countBy(soldLeads.filter(l => l.campaign_name), 'campaign_name').slice(0, 8)

  if (leads.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="py-16 text-center text-muted-foreground text-sm">
          Nenhum lead encontrado no período selecionado.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Leads por plataforma */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">🏆 Plataformas que mais trouxeram Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byPlatform} cx="50%" cy="45%" outerRadius={75} innerRadius={45} dataKey="value" paddingAngle={3}>
                {byPlatform.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {byPlatform.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="capitalize text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-mono font-medium">{item.value} <span className="text-muted-foreground">({Math.round(item.value / leads.length * 100)}%)</span></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vendas por plataforma */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">💰 Plataformas que mais geraram Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={soldByPlatform.length ? soldByPlatform : [{ name: 'Sem vendas', value: 1 }]}
                cx="50%" cy="45%" outerRadius={75} innerRadius={45} dataKey="value" paddingAngle={3}>
                {(soldByPlatform.length ? soldByPlatform : [{ name: 'Sem vendas', value: 1 }]).map((_, i) =>
                  <Cell key={i} fill={soldByPlatform.length ? COLORS[i % COLORS.length] : '#333'} stroke="transparent" />
                )}
              </Pie>
              <Tooltip contentStyle={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {soldByPlatform.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="capitalize text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-mono font-medium">{item.value} <span className="text-muted-foreground">({soldLeads.length > 0 ? Math.round(item.value / soldLeads.length * 100) : 0}%)</span></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top campanhas por leads */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">📢 Anúncios que mais trouxeram Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {byCampaign.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados de campanha no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCampaign} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'oklch(0.65 0 0)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'oklch(0.65 0 0)' }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                <Bar dataKey="value" name="Leads" fill="oklch(0.55 0.22 264)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top campanhas por vendas */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">🏅 Anúncios que mais geraram Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {soldByCampaign.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem vendas registradas no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={soldByCampaign} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'oklch(0.65 0 0)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'oklch(0.65 0 0)' }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                <Bar dataKey="value" name="Vendas" fill="oklch(0.72 0.19 142)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
