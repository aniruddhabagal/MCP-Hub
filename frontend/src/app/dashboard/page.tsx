'use client'

import { useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { HealthOverviewChart } from '@/components/dashboard/HealthOverviewChart'
import { RecentAlerts } from '@/components/dashboard/RecentAlerts'
import { TopToolsWidget } from '@/components/dashboard/TopToolsWidget'
import { useProbeAll } from '@/lib/hooks'

export default function DashboardPage() {
  const probeAll = useProbeAll()
  const [probing, setProbing] = useState(false)

  async function handleProbeAll() {
    setProbing(true)
    try {
      await probeAll.mutateAsync()
    } finally {
      setProbing(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Real-time overview of your MCP infrastructure
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleProbeAll}
          disabled={probing}
          className="gap-2"
        >
          <Activity
            className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`}
          />
          {probing ? 'Probing…' : 'Run Probes'}
        </Button>
      </div>

      {/* Stats row */}
      <StatsCards />

      {/* Charts + alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HealthOverviewChart />
        </div>
        <RecentAlerts />
      </div>

      {/* Top tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopToolsWidget />

        {/* Quick status panel */}
        <div className="border border-border rounded-lg bg-card p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
            System Status
          </p>
          <div className="space-y-3">
            {[
              { label: 'Health Prober', desc: 'On-demand via Run Probes', ok: true },
              { label: 'Alert Evaluator', desc: 'On-demand trigger', ok: true },
              { label: 'Analytics Aggregator', desc: 'Vercel Cron — daily 02:00', ok: true },
              { label: 'Proxy Endpoint', desc: '/api/v1/proxy/{server_id}/mcp', ok: true },
              { label: 'WebSocket', desc: '/ws/dashboard — live', ok: true },
            ].map(({ label, desc, ok }) => (
              <div key={label} className="flex items-center gap-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    ok
                      ? 'bg-status-healthy animate-pulse-dot'
                      : 'bg-muted-foreground/40'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-mono">{label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {desc}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono flex-shrink-0 ${
                    ok ? 'text-status-healthy' : 'text-muted-foreground/50'
                  }`}
                >
                  {ok ? 'READY' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
