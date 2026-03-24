'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHealthChecks } from '@/lib/hooks'
import { CalendarDays } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  healthy: 'hsl(142 71% 45%)',
  unhealthy: 'hsl(0 78% 58%)',
  degraded: 'hsl(45 93% 47%)',
  unknown: 'hsl(240 8% 28%)',
}

export function UptimeCalendar({ serverId }: { serverId: string }) {
  const { data: checks, isLoading } = useHealthChecks({ server_id: serverId, limit: 200 })

  // Build a map of date → worst status
  const dayMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of checks ?? []) {
      const day = c.checked_at.slice(0, 10)
      const prev = map[day]
      const priority = ['unhealthy', 'degraded', 'healthy', 'unknown']
      if (!prev || priority.indexOf(c.status) < priority.indexOf(prev)) {
        map[day] = c.status
      }
    }
    return map
  }, [checks])

  // Last 35 days
  const days = useMemo(() => {
    const result: Array<{ date: string; status: string | null }> = []
    const today = new Date()
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      result.push({ date: key, status: dayMap[key] ?? null })
    }
    return result
  }, [dayMap])

  const uptimeDays = days.filter((d) => d.status === 'healthy').length
  const knownDays = days.filter((d) => d.status !== null).length
  const uptimePct = knownDays > 0 ? ((uptimeDays / knownDays) * 100).toFixed(1) : null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          Uptime — Last 35 Days
        </CardTitle>
        {uptimePct !== null && (
          <span className="text-xs font-mono text-muted-foreground">
            {uptimePct}% uptime
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {days.map(({ date, status }) => (
                <div
                  key={date}
                  title={`${date}: ${status ?? 'no data'}`}
                  className="w-6 h-6 rounded-sm transition-transform hover:scale-110 cursor-default"
                  style={{
                    background: status ? STATUS_COLOR[status] ?? STATUS_COLOR.unknown : 'hsl(240 10% 14%)',
                    opacity: status ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3">
              {Object.entries({ healthy: 'Healthy', degraded: 'Degraded', unhealthy: 'Down' }).map(
                ([k, label]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: STATUS_COLOR[k] }}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
                  </div>
                )
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                <span className="text-[10px] font-mono text-muted-foreground">No data</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
