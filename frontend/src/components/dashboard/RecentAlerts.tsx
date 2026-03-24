'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlertEvents } from '@/lib/hooks'
import { formatRelativeTime } from '@/lib/utils'

export function RecentAlerts() {
  const { data: events, isLoading } = useAlertEvents({ limit: 8 })

  return (
    <Card className="h-[304px] flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Recent Alerts
        </CardTitle>
        <Link
          href="/alerts"
          className="text-[11px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="space-y-3 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-status-healthy/10 border border-status-healthy/20 flex items-center justify-center mb-3">
              <AlertTriangle className="w-4 h-4 text-status-healthy" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              No alerts fired
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              All systems nominal
            </p>
          </div>
        ) : (
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2 px-2 rounded hover:bg-secondary/40 transition-colors"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    event.state === 'fired'
                      ? 'bg-status-error animate-pulse-dot'
                      : 'bg-status-healthy'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate font-mono">
                    {event.message ?? `Alert ${event.rule_id.slice(0, 8)}`}
                  </p>
                  {event.value != null && (
                    <p className="text-xs text-muted-foreground font-mono">
                      value: {event.value.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant={event.state === 'fired' ? 'firing' : 'resolved'}
                    className="text-[10px] py-0 px-1.5"
                  >
                    {event.state}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground w-14 text-right">
                    {formatRelativeTime(event.fired_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
