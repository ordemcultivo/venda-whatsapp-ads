'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, MousePointerClick, Eye, DollarSign, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MetaCampaign } from '@/lib/actions/meta-ads'

interface Props {
  campaigns: MetaCampaign[]
  period: string
}

function fmt(val: string | undefined, prefix = '') {
  if (!val || val === '0') return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return prefix + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(val: string | undefined) {
  if (!val || val === '0') return '—'
  return parseInt(val).toLocaleString('pt-BR')
}

function statusColor(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (status === 'PAUSED') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
  return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Ativa'
  if (status === 'PAUSED') return 'Pausada'
  if (status === 'ARCHIVED') return 'Arquivada'
  return status
}

export function MetaAdsDashboard({ campaigns: initial, period: initialPeriod }: Props) {
  const [campaigns] = useState(initial)
  const [period, setPeriod] = useState(initialPeriod)
  const [showAll, setShowAll] = useState(false)
  const [, startTransition] = useTransition()

  const visibleCampaigns = showAll ? campaigns : campaigns.filter(c => c.status === 'ACTIVE')

  const totalSpend = campaigns.reduce((s, c) => s + parseFloat(c.spend || '0'), 0)
  const totalImpressions = campaigns.reduce((s, c) => s + parseInt(c.impressions || '0'), 0)
  const totalClicks = campaigns.reduce((s, c) => s + parseInt(c.clicks || '0'), 0)
  const totalReach = campaigns.reduce((s, c) => s + parseInt(c.reach || '0'), 0)

  function handlePeriod(v: string | null) {
    if (!v) return
    setPeriod(v)
    startTransition(() => {
      window.location.href = `/meta-ads?period=${v}`
    })
  }

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last_7d', label: 'Últimos 7 dias' },
    { value: 'last_30d', label: 'Últimos 30 dias' },
    { value: 'last_90d', label: 'Últimos 90 dias' },
    { value: 'this_month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
  ]

  return (
    <div className="space-y-6">
      {/* Filtro período */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{visibleCampaigns.length} campanha{visibleCampaigns.length !== 1 ? 's' : ''}</p>
          <button onClick={() => setShowAll(v => !v)} className="text-xs text-primary hover:underline">
            {showAll ? 'Mostrar só ativas' : 'Mostrar todas'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => handlePeriod(v)}>
            <SelectTrigger className="h-8 text-xs w-40 bg-secondary border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              {periodOptions.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.location.reload()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Investimento', value: `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: 'text-blue-400' },
          { label: 'Cliques', value: totalClicks.toLocaleString('pt-BR'), icon: MousePointerClick, color: 'text-violet-400' },
          { label: 'Alcance', value: totalReach.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-orange-400' },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-lg font-bold font-mono">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de campanhas */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Campanhas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">Campanha</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Investido</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Impressões</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Cliques</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">CTR</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">CPC</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">CPM</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Conversas</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Custo/Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12 text-sm">
                      Nenhuma campanha ativa encontrada. Clique em "Mostrar todas" para ver pausadas/arquivadas.
                    </TableCell>
                  </TableRow>
                )}
                {visibleCampaigns.map(c => (
                  <TableRow key={c.id} className="border-border/50 hover:bg-white/[0.02]">
                    <TableCell>
                      <p className="text-sm font-medium max-w-[200px] truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.objective}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] h-5 ${statusColor(c.status)}`}>
                        {statusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmt(c.spend, 'R$ ')}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmtInt(c.impressions)}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmtInt(c.clicks)}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{c.ctr ? `${parseFloat(c.ctr).toFixed(2)}%` : '—'}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmt(c.cpc, 'R$ ')}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmt(c.cpm, 'R$ ')}</TableCell>
                    <TableCell className="text-right text-sm font-mono font-semibold text-emerald-400">
                      {c.conversations ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {c.cost_per_conversation ? `R$ ${c.cost_per_conversation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
