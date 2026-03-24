'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useErrorRates } from '@/lib/hooks'
import { AlertTriangle } from 'lucide-react'

export function ErrorRatesChart() {
  const { data: rates, isLoading } = useErrorRates()

  const sorted = (rates ?? [])
    .filter((r) => r.call_count > 0)
    .sort((a, b) => b.error_rate - a.error_rate)
    .slice(0, 12)

  const maxRate = Math.max(...sorted.map((r) => r.error_rate), 0.01)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Error Rates by Server
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : sorted.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">No error data yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((r) => {
              const label = r.tool_name ? `${r.server_name} / ${r.tool_name}` : r.server_name
              const pct = (r.error_rate * 100).toFixed(1)
              const barWidth = (r.error_rate / maxRate) * 100
              const color =
                r.error_rate > 0.2
                  ? 'hsl(0 78% 58%)'
                  : r.error_rate > 0.05
                    ? 'hsl(45 93% 47%)'
                    : 'hsl(142 71% 45%)'

              return (
                <div key={`${r.server_id}-${r.tool_name ?? ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-foreground truncate max-w-[240px]">
                      {label}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        {r.call_count.toLocaleString()} calls
                      </span>
                      <span
                        className="text-xs font-mono tabular-nums w-14 text-right"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
