'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { createClientAction } from '@/lib/actions/clients'
import type { Client } from '@/lib/types'

interface Props { clients: Client[] }

export function ClientesTable({ clients: initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', slug: '',
    whatsapp_instance: '', whatsapp_token: '',
    meta_account_id: '',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const newClient = await createClientAction(form)
      setClients(prev => [...prev, newClient])
      setOpen(false)
      setForm({ name: '', slug: '', whatsapp_instance: '', whatsapp_token: '', meta_account_id: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button size="sm" className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Novo Cliente
            </Button>
          } />
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da Empresa</Label>
                <Input
                  placeholder="Ex: MTP Peças Automotivas"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))}
                  required className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug (identificador único)</Label>
                <Input
                  placeholder="mtp-pecas"
                  value={form.slug}
                  onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                  required className="h-8 text-sm font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Instância WhatsApp</Label>
                  <Input
                    placeholder="mtp-principal"
                    value={form.whatsapp_instance}
                    onChange={e => setForm(p => ({ ...p, whatsapp_instance: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Token WhatsApp</Label>
                  <Input
                    placeholder="token_api"
                    type="password"
                    value={form.whatsapp_token}
                    onChange={e => setForm(p => ({ ...p, whatsapp_token: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Account ID (opcional)</Label>
                <Input
                  placeholder="act_123456789"
                  value={form.meta_account_id}
                  onChange={e => setForm(p => ({ ...p, meta_account_id: e.target.value }))}
                  className="h-8 text-sm font-mono"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">WhatsApp</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Meta Account</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12 text-sm">
                  Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
                </TableCell>
              </TableRow>
            )}
            {clients.map(client => (
              <TableRow key={client.id} className="border-border/50 hover:bg-white/[0.02]">
                <TableCell>
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{client.slug}</p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {client.whatsapp_instance ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{client.whatsapp_instance}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">Não configurado</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {client.meta_account_id ?? '—'}
                </TableCell>
                <TableCell className="text-center">
                  {client.active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] h-5">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px] h-5">Inativo</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
