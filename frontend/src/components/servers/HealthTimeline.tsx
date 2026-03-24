'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHealthChecks } from '@/lib/hooks'
import { formatLatency, formatDateTime } from '@/lib/utils'
import { Activity } from 'lucide-react'

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { status: string; error: string | null; checked_at: string } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-muted-foreground mb-1">{formatDateTime(d.checked_at)}</p>
      <p className="text-foreground">
        Latency:{' '}
        <span className="text-primary">{formatLatency(payload[0].value)}</span>
      </p>
      <p className={d.status === 'healthy' ? 'text-status-healthy' : 'text-status-error'}>
        {d.status}
      </p>
      {d.error && <p className="text-status-error mt-1 max-w-[200px] truncate">{d.error}</p>}
    </div>
  )
}

export function HealthTimeline({ serverId }: { serverId: string }) {
  const { data: checks, isLoading } = useHealthChecks({ server_id: serverId, limit: 50 })

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Latency Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const data = (checks ?? [])
    .slice()
    .reverse()
    .map((c) => ({
      checked_at: c.checked_at,
      latency: c.latency_ms ?? 0,
      status: c.status,
      error: c.error,
    }))

  const avg = data.length
    ? Math.round(data.reduce((s, d) => s + d.latency, 0) / data.length)
    : null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Latency Timeline
        </CardTitle>
        {avg !== null && (
          <span className="text-xs font-mono text-muted-foreground">
            avg {formatLatency(avg)}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">No probe history yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(240 10% 18%)"
                vertical={false}
              />
              <XAxis
                dataKey="checked_at"
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(240 8% 52%)', fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="hsl(38 92% 50%)"
                strokeWidth={1.5}
                fill="url(#latencyGrad)"
                dot={(props) => {
                  const { cx, cy, payload } = props
                  if (payload.status !== 'healthy') {
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="hsl(0 78% 58%)"
                        stroke="none"
                      />
                    )
                  }
                  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} fill="none" />
                }}
                activeDot={{ r: 4, fill: 'hsl(38 92% 50%)', stroke: 'hsl(240 10% 11%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
