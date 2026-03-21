'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface StatusDonutProps {
  new_leads: number
  qualified_leads: number
  sold_leads: number
}

const COLORS = [
  { key: 'new',       label: 'Novos',        color: 'oklch(0.55 0.22 264)' },
  { key: 'qualified', label: 'Qualificados', color: 'oklch(0.72 0.19 142)' },
  { key: 'sold',      label: 'Vendidos',     color: 'oklch(0.63 0.26 304)' },
]

export function StatusDonut({ new_leads, qualified_leads, sold_leads }: StatusDonutProps) {
  const data = [
    { name: 'Novos',        value: new_leads },
    { name: 'Qualificados', value: qualified_leads },
    { name: 'Vendidos',     value: sold_leads },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Sem dados
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]?.color ?? '#888'} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'oklch(0.18 0 0)',
            border: '1px solid oklch(1 0 0 / 10%)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'oklch(0.97 0 0)',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
