'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Loader2, Zap } from 'lucide-react'
import { createClientUserAction } from '@/lib/actions/users'

interface User {
  id: string; email: string; name: string | null
  role: string; client_id: string | null
  clients: { name: string } | null
}
interface Client { id: string; name: string }

interface Props { users: User[]; clients: Client[] }

export function ClienteUsuariosTable({ users: initialUsers, clients }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', client_id: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const newUser = await createClientUserAction(form)
      setUsers(prev => [newUser as any, ...prev])
      setOpen(false)
      setForm({ name: '', email: '', password: '', client_id: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button size="sm" className="gap-1.5 h-8 text-xs">
              <UserPlus className="w-3.5 h-3.5" /> Criar Acesso para Cliente
            </Button>
          } />
          <DialogContent className="bg-card border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Novo Acesso de Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Select value={form.client_id} onValueChange={(v: string | null) => setForm(p => ({ ...p, client_id: v ?? '' }))}>
                  <SelectTrigger className="h-8 text-sm bg-background border-border/50">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input placeholder="João Silva" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="joao@empresa.com" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha</Label>
                <Input type="password" placeholder="mínimo 8 caracteres" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required minLength={8} className="h-8 text-sm" />
              </div>
              {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={loading || !form.client_id}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Criar Acesso'}
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
              <TableHead className="text-xs text-muted-foreground font-medium">Usuário</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Empresa</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Perfil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12 text-sm">
                  Nenhum usuário cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
            {users.map(u => (
              <TableRow key={u.id} className="border-border/50 hover:bg-white/[0.02]">
                <TableCell>
                  <p className="text-sm font-medium">{u.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.clients?.name ?? <span className="italic opacity-50">Sem empresa</span>}
                </TableCell>
                <TableCell className="text-center">
                  {u.role === 'ADMIN' ? (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] h-5 gap-1">
                      <Zap className="w-2.5 h-2.5" /> ADMIN
                    </Badge>
                  ) : (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] h-5">CLIENT</Badge>
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
