'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useVolume } from '@/lib/hooks'
import { Grid3X3 } from 'lucide-react'

const HOUR_RANGE_OPTIONS = [24, 48, 168] // 24h, 48h, 7d


function formatBucketLabel(dateStr: string, hours: number) {
  const d = new Date(dateStr)
  if (hours <= 48) {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function UsageHeatmap() {
  const [hours, setHours] = useState(24)
  const { data: buckets, isLoading } = useVolume(hours)

  const maxCalls = Math.max(...(buckets ?? []).map((b) => b.call_count), 1)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="w-3.5 h-3.5" />
          Volume Heatmap
        </CardTitle>
        <div className="flex gap-1">
          {HOUR_RANGE_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                hours === h
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {h === 24 ? '24h' : h === 48 ? '48h' : '7d'}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !buckets || buckets.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">No volume data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Grid */}
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.min(buckets.length, 24)}, 1fr)`,
              }}
            >
              {buckets.map((b, i) => {
                const intensity = b.call_count / maxCalls
                const errorIntensity =
                  b.call_count > 0 ? b.error_count / b.call_count : 0
                return (
                  <div
                    key={i}
                    title={`${formatBucketLabel(b.window_start, hours)}\n${b.call_count} calls, ${b.error_count} errors`}
                    className="aspect-square rounded-sm cursor-default transition-transform hover:scale-110"
                    style={{
                      background:
                        b.call_count === 0
                          ? 'hsl(240 10% 14%)'
                          : errorIntensity > 0.2
                            ? `hsl(0 78% ${25 + intensity * 33}%)`
                            : `hsl(38 92% ${15 + intensity * 40}%)`,
                      opacity: b.call_count === 0 ? 0.4 : 0.6 + intensity * 0.4,
                    }}
                  />
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {[0.1, 0.3, 0.5, 0.7, 1.0].map((v) => (
                      <div
                        key={v}
                        className="w-3 h-3 rounded-sm"
                        style={{
                          background: `hsl(38 92% ${15 + v * 40}%)`,
                          opacity: 0.6 + v * 0.4,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground ml-1">
                    Volume
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(0 78% 45%)' }} />
                  <span className="text-[10px] font-mono text-muted-foreground">Errors</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {buckets.reduce((s, b) => s + b.call_count, 0).toLocaleString()} total calls
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
