'use client'

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHealthSummary } from '@/lib/hooks'
import { formatLatency } from '@/lib/utils'

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { name: string; latency: number | null; status: string } }>
}) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs font-mono">
      <p className="text-foreground font-medium mb-1">{d.name}</p>
      <p className="text-muted-foreground">
        Uptime:{' '}
        <span className="text-foreground">{payload[0].value.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">
        Latency:{' '}
        <span className="text-foreground">{formatLatency(d.latency)}</span>
      </p>
    </div>
  )
}

export function HealthOverviewChart() {
  const { data: summary, isLoading } = useHealthSummary()

  const chartData = (summary ?? []).map((s) => ({
    name: s.server_name,
    uptime: s.uptime_pct,
    latency: s.avg_latency_ms,
    status: s.current_status,
  }))

  const getBarColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'hsl(142 71% 45%)'
      case 'unhealthy':
        return 'hsl(0 78% 58%)'
      case 'degraded':
        return 'hsl(45 93% 47%)'
      default:
        return 'hsl(240 8% 52%)'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Uptime</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 h-48 flex flex-col justify-end">
            {[60, 90, 40, 75, 55].map((h, i) => (
              <Skeleton key={i} className="w-full" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm font-mono">
                No servers probed yet
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Run a health probe to see uptime data
              </p>
            </div>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
                barSize={28}
              >
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fontFamily: 'var(--font-plex-mono)',
                    fill: 'hsl(240 8% 52%)',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 10,
                    fontFamily: 'var(--font-plex-mono)',
                    fill: 'hsl(240 8% 52%)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(240 10% 14%)' }} />
                <Bar dataKey="uptime" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.status)}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
