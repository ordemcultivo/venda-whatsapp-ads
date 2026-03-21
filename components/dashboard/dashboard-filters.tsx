'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Client { id: string; name: string; slug: string }

interface Props {
  clients: Client[]
  selectedClient?: string
  selectedPeriod: string
  isAdmin: boolean
}

const periods = [
  { value: '7d',   label: 'Últimos 7 dias' },
  { value: '30d',  label: 'Últimos 30 dias' },
  { value: '90d',  label: 'Últimos 90 dias' },
  { value: '365d', label: 'Últimos 12 meses' },
  { value: 'all',  label: 'Tudo' },
]

export function DashboardFilters({ clients, selectedClient, selectedPeriod, isAdmin }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && clients.length > 0 && (
        <Select
          value={selectedClient ?? 'all'}
          onValueChange={v => update('client', v === 'all' ? 'all' : v)}
        >
          <SelectTrigger className="w-52 h-8 text-xs bg-card border-border/50">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="all" className="text-xs">Todos os clientes</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={selectedPeriod} onValueChange={v => update('period', v)}>
        <SelectTrigger className="w-40 h-8 text-xs bg-card border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border/50">
          {periods.map(p => (
            <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
