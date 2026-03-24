import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'pink'
  trend?: { value: number; label: string }
}

const colorMap = {
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'text-blue-400' },
  green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-400' },
  purple: { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: 'text-violet-400' },
  amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  icon: 'text-amber-400' },
  pink:   { bg: 'bg-pink-500/10',   text: 'text-pink-400',   icon: 'text-pink-400' },
}

export function KpiCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }: KpiCardProps) {
  const c = colorMap[color]

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className={cn('text-2xl font-bold font-mono tabular-nums', c.text)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            {trend && (
              <p className={cn('text-xs font-medium', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg shrink-0', c.bg)}>
            <Icon className={cn('w-5 h-5', c.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
