'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTopTools } from '@/lib/hooks'
import { formatLatency } from '@/lib/utils'
import { Zap } from 'lucide-react'

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { tool_name: string; server_name: string; error_rate: number; avg_latency_ms: number | null } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-foreground font-medium mb-1">{d.tool_name}</p>
      <p className="text-muted-foreground">{d.server_name}</p>
      <p className="text-primary mt-1">{payload[0].value.toLocaleString()} calls</p>
      {d.avg_latency_ms != null && (
        <p className="text-muted-foreground">avg {formatLatency(d.avg_latency_ms)}</p>
      )}
      {d.error_rate > 0 && (
        <p className="text-status-error">
          {(d.error_rate * 100).toFixed(1)}% error rate
        </p>
      )}
    </div>
  )
}

export function TopToolsChart({ limit = 10 }: { limit?: number }) {
  const { data: tools, isLoading } = useTopTools(limit)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Top Tools by Call Count
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : !tools || tools.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={tools}
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
              />
              <YAxis
                type="category"
                dataKey="tool_name"
                width={130}
                tick={{ fontSize: 11, fill: 'hsl(240 10% 92%)', fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(240 10% 18%)' }} />
              <Bar
                dataKey="call_count"
                fill="hsl(38 92% 50%)"
                radius={[0, 3, 3, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
