'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { LeadsByDay } from '@/lib/types'

interface LeadsChartProps {
  data: LeadsByDay[]
}

export function LeadsChart({ data }: LeadsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'oklch(0.65 0 0)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'oklch(0.65 0 0)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'oklch(0.18 0 0)',
            border: '1px solid oklch(1 0 0 / 10%)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'oklch(0.97 0 0)',
          }}
          cursor={{ stroke: 'oklch(1 0 0 / 10%)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="oklch(0.55 0.22 264)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="facebook"
          name="Facebook"
          stroke="oklch(0.5 0.2 240)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="instagram"
          name="Instagram"
          stroke="oklch(0.6 0.25 330)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
