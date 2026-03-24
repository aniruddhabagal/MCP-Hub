'use client'

import { Activity, AlertTriangle, Server, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useServers } from '@/lib/hooks'
import { useHealthSummary } from '@/lib/hooks'
import { useAlertEvents } from '@/lib/hooks'
import { useToolCalls } from '@/lib/hooks'

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
  loading?: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      {/* Accent left bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${accent ? 'bg-primary' : 'bg-border'}`}
      />
      <CardHeader className="pb-2 pl-6">
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-6">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <p className="font-mono text-3xl font-medium text-foreground tabular-nums">
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {sub}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsCards() {
  const { data: servers, isLoading: serversLoading } = useServers()
  const { data: healthSummary, isLoading: healthLoading } = useHealthSummary()
  const { data: alertEvents, isLoading: alertsLoading } = useAlertEvents({
    state: 'firing',
    limit: 100,
  })
  const { data: toolCalls, isLoading: toolsLoading } = useToolCalls({
    size: 1,
    page: 1,
  })

  const totalServers = servers?.length ?? 0
  const healthyServers =
    servers?.filter((s) => s.status === 'healthy').length ?? 0

  const avgUptime =
    healthSummary && healthSummary.length > 0
      ? (
          healthSummary.reduce((sum, s) => sum + s.uptime_pct, 0) /
          healthSummary.length
        ).toFixed(1)
      : null

  const firingAlerts =
    alertEvents?.filter((e) => e.state === 'firing').length ?? 0

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Servers"
        value={totalServers}
        sub={`${healthyServers} healthy · ${totalServers - healthyServers} down`}
        icon={Server}
        accent={totalServers > 0}
        loading={serversLoading}
      />
      <StatCard
        title="Avg Uptime"
        value={avgUptime != null ? `${avgUptime}%` : '—'}
        sub={
          healthSummary
            ? `across ${healthSummary.length} server${healthSummary.length !== 1 ? 's' : ''}`
            : 'no data yet'
        }
        icon={Activity}
        loading={healthLoading}
      />
      <StatCard
        title="Tool Calls"
        value={toolCalls?.total ?? '—'}
        sub="total logged"
        icon={Zap}
        loading={toolsLoading}
      />
      <StatCard
        title="Active Alerts"
        value={firingAlerts}
        sub={firingAlerts === 0 ? 'all clear' : 'rules firing'}
        icon={AlertTriangle}
        accent={firingAlerts > 0}
        loading={alertsLoading}
      />
    </div>
  )
}
