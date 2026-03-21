'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Star, RefreshCw, Facebook, Instagram, Globe } from 'lucide-react'
import type { Lead, LeadStatus } from '@/lib/types'

const statusConfig: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; color: string }> = {
  new:       { label: 'Novo',        variant: 'default',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  qualified: { label: 'Qualificado', variant: 'secondary', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  sold:      { label: 'Vendido',     variant: 'outline',   color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
}

const platformIcon: Record<string, React.ElementType> = {
  facebook:  Facebook,
  instagram: Instagram,
  google:    Globe,
  organic:   Globe,
  unknown:   Globe,
}

const platformColor: Record<string, string> = {
  facebook:  'text-blue-400',
  instagram: 'text-pink-400',
  google:    'text-green-400',
  organic:   'text-muted-foreground',
  unknown:   'text-muted-foreground',
}

interface LeadsTableProps {
  leads: Lead[]
  onStatusChange?: (leadId: string, status: LeadStatus, value?: number) => void
}

export function LeadsTable({ leads, onStatusChange }: LeadsTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [saleDialog, setSaleDialog] = useState<{ leadId: string; name: string } | null>(null)
  const [saleValue, setSaleValue] = useState('')

  async function handleStatus(leadId: string, status: LeadStatus, value?: number) {
    setUpdating(leadId)
    await onStatusChange?.(leadId, status, value)
    setUpdating(null)
  }

  async function confirmSale() {
    if (!saleDialog) return
    const value = saleValue ? parseFloat(saleValue.replace(',', '.')) : undefined
    setSaleDialog(null)
    setSaleValue('')
    await handleStatus(saleDialog.leadId, 'sold', value)
  }

  return (
    <>
    <Dialog open={!!saleDialog} onOpenChange={open => { if (!open) { setSaleDialog(null); setSaleValue('') } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Venda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Lead: <span className="text-foreground font-medium">{saleDialog?.name}</span></p>
          <div className="space-y-1.5">
            <Label htmlFor="sale-value">Valor da venda <span className="text-red-400">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                id="sale-value"
                className="pl-8"
                placeholder="0,00"
                value={saleValue}
                onChange={e => setSaleValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmSale()}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setSaleDialog(null); setSaleValue('') }}>Cancelar</Button>
            <Button size="sm" onClick={confirmSale} disabled={!saleValue} className="bg-violet-600 hover:bg-violet-700">Confirmar Venda</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground font-medium w-36">Data</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">Contato</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">Plataforma</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">Campanha</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">Anúncio</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-right">Valor</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-center">Status</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-center w-28">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                Nenhum lead encontrado para o período selecionado.
              </TableCell>
            </TableRow>
          )}
          {leads.map(lead => {
            const PlatformIcon = platformIcon[lead.platform] ?? Globe
            const status = statusConfig[lead.status]
            const isUpdating = updating === lead.id

            return (
              <TableRow key={lead.id} className="border-border/50 hover:bg-white/[0.02]">
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {format(new Date(lead.contacted_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">
                      {lead.name ?? 'sem nome'} {lead.last_name ?? ''}
                    </p>
                    <p className="text-xs text-primary font-mono">{lead.phone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon className={`w-4 h-4 ${platformColor[lead.platform]}`} />
                    <span className="text-xs capitalize text-muted-foreground">{lead.platform}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                  {lead.campaign_name ?? '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                  {lead.ad_name ?? '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {lead.conversion_value
                    ? `R$ ${lead.conversion_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.color}`}>
                    {status.label}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-emerald-400 hover:bg-emerald-500/10"
                      title="Qualificado"
                      disabled={isUpdating || lead.status === 'qualified'}
                      onClick={() => handleStatus(lead.id, 'qualified')}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-violet-400 hover:bg-violet-500/10"
                      title="Converter (Vendido)"
                      disabled={isUpdating || lead.status === 'sold'}
                      onClick={() => setSaleDialog({ leadId: lead.id, name: lead.name ?? lead.phone })}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </>
  )
}
