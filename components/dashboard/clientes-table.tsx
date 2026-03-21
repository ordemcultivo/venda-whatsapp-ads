'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, CheckCircle2, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { createClientAction, updateClientAction, deleteClientAction } from '@/lib/actions/clients'
import type { Client } from '@/lib/types'

interface Props { clients: Client[] }

const emptyForm = {
  name: '', slug: '',
  whatsapp_instance: '', whatsapp_token: '',
  meta_account_id: '', meta_access_token: '', meta_pixel_id: '',
}

export function ClientesTable({ clients: initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setOpen(true)
  }

  function openEdit(client: Client) {
    setEditingId(client.id)
    setForm({
      name: client.name,
      slug: client.slug,
      whatsapp_instance: client.whatsapp_instance ?? '',
      whatsapp_token: client.whatsapp_token ?? '',
      meta_account_id: client.meta_account_id ?? '',
      meta_access_token: '',
      meta_pixel_id: '',
    })
    setError('')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editingId) {
        const updated = await updateClientAction(editingId, form)
        setClients(prev => prev.map(c => c.id === editingId ? updated : c))
      } else {
        const newClient = await createClientAction(form)
        setClients(prev => [...prev, newClient])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setLoading(true)
    try {
      await deleteClientAction(deleteId)
      setClients(prev => prev.filter(c => c.id !== deleteId))
      setDeleteId(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Novo Cliente
        </Button>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Empresa</Label>
              <Input
                placeholder="Ex: MTP Peças Automotivas"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: editingId ? p.slug : slugify(e.target.value) }))}
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
            <div className="space-y-1.5">
              <Label className="text-xs">Meta Access Token {editingId && <span className="text-muted-foreground">(deixe em branco para manter)</span>}</Label>
              <Input
                placeholder="EAABsbCS..."
                type="password"
                value={form.meta_access_token}
                onChange={e => setForm(p => ({ ...p, meta_access_token: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meta Pixel ID (opcional)</Label>
              <Input
                placeholder="123456789"
                value={form.meta_pixel_id}
                onChange={e => setForm(p => ({ ...p, meta_pixel_id: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingId ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza? Todos os leads e dados deste cliente serão removidos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" disabled={loading} onClick={handleDelete}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">WhatsApp</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Meta Account</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Status</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-sm">
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(client)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(client.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
