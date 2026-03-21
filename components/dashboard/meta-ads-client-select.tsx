'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  clients: { id: string; name: string }[]
  selectedClient?: string
  period: string
}

export function MetaAdsClientSelect({ clients, selectedClient, period }: Props) {
  const router = useRouter()

  function handleChange(clientId: string | null) {
    if (!clientId) return
    router.push(`/meta-ads?client=${clientId}&period=${period}`)
  }

  return (
    <Select value={selectedClient ?? ''} onValueChange={handleChange}>
      <SelectTrigger className="w-52 h-8 text-xs bg-card border-border/50">
        <SelectValue placeholder="Selecionar cliente..." />
      </SelectTrigger>
      <SelectContent className="bg-card border-border/50">
        {clients.map(c => (
          <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
