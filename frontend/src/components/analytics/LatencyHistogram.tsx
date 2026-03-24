'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLatency } from '@/lib/hooks'
import { formatLatency } from '@/lib/utils'
import { Timer } from 'lucide-react'

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { server_name: string; tool_name: string | null; p95_latency_ms: number | null } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-foreground font-medium">{d.server_name}</p>
      {d.tool_name && <p className="text-muted-foreground">{d.tool_name}</p>}
      <p className="text-primary mt-1">avg {formatLatency(payload[0].value)}</p>
      {d.p95_latency_ms != null && (
        <p className="text-muted-foreground">p95 {formatLatency(d.p95_latency_ms)}</p>
      )}
    </div>
  )
}

export function LatencyHistogram() {
  const { data: stats, isLoading } = useLatency()

  // Sort by avg latency descending, take top 15
  const data = (stats ?? [])
    .filter((s) => s.avg_latency_ms != null)
    .sort((a, b) => (b.avg_latency_ms ?? 0) - (a.avg_latency_ms ?? 0))
    .slice(0, 15)
    .map((s) => ({
      ...s,
      label: s.tool_name ? `${s.server_name}/${s.tool_name}` : s.server_name,
    }))

  const p95Max = Math.max(...data.map((d) => d.avg_latency_ms ?? 0), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5" />
          Latency by Server / Tool
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">No latency data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(240 10% 18%)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'hsl(240 8% 52%)', fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}ms`}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fontSize: 10, fill: 'hsl(240 10% 72%)', fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(240 10% 18%)' }} />
              <Bar
                dataKey="avg_latency_ms"
                radius={[0, 3, 3, 0]}
                maxBarSize={20}
              >
                {data.map((entry, index) => {
                  const ratio = (entry.avg_latency_ms ?? 0) / p95Max
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${ratio > 0.7 ? 0 : ratio > 0.4 ? 45 : 38} ${ratio > 0.7 ? 78 : 92}% ${ratio > 0.7 ? 58 : ratio > 0.4 ? 47 : 50}%)`}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
