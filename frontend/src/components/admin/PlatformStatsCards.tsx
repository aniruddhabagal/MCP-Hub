'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, Building2, Server, Users } from 'lucide-react'
import { getAdminOverview } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_ADMIN_OVERVIEW } from '@/lib/demo-data'
import { Skeleton } from '@/components/ui/skeleton'

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | undefined
  icon: React.ElementType
  accent?: string
}) {
  return (
    <div className="bg-surface border border-border rounded p-5 flex items-start gap-4">
      <div className={`w-9 h-9 rounded border flex items-center justify-center flex-shrink-0 ${accent ?? 'border-border bg-secondary/40'}`}>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">
          {label}
        </p>
        {value === undefined ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-mono font-medium text-foreground tabular-nums">
            {value.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

export function PlatformStatsCards() {
  const { data } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => isDemoMode() ? Promise.resolve(DEMO_ADMIN_OVERVIEW) : getAdminOverview(),
  })

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard label="Users" value={data?.total_users} icon={Users} />
      <StatCard label="Workspaces" value={data?.total_workspaces} icon={Building2} />
      <StatCard label="Servers" value={data?.total_servers} icon={Server} />
      <StatCard label="Tool calls" value={data?.total_tool_calls} icon={BarChart3} />
      <StatCard
        label="Active alerts"
        value={data?.active_alerts}
        icon={AlertTriangle}
        accent={data && data.active_alerts > 0
          ? 'border-status-error/30 bg-status-error/10'
          : 'border-border bg-secondary/40'}
      />
    </div>
  )
}
