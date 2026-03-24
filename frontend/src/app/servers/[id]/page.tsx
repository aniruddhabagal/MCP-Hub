'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Activity,
  ExternalLink,
  Tag,
  User,
  GitBranch,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HealthTimeline } from '@/components/servers/HealthTimeline'
import { UptimeCalendar } from '@/components/servers/UptimeCalendar'
import { useServer, useHealthSummary, useToolCalls, useAlertEvents, useProbeServer } from '@/lib/hooks'
import { formatLatency, formatRelativeTime, formatDateTime } from '@/lib/utils'

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: server, isLoading, isError } = useServer(id)
  const { data: healthSummary } = useHealthSummary()
  const { data: toolCalls } = useToolCalls({ server_id: id, size: 20 })
  const { data: alertEvents } = useAlertEvents({ limit: 20 })
  const probe = useProbeServer()

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !server) return notFound()

  const health = healthSummary?.find((h) => h.server_id === id)
  const serverAlerts = (alertEvents ?? []).filter((e) => e.server_id === id)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Back nav + header */}
      <div>
        <Link
          href="/servers"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to servers
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
                {server.name}
              </h1>
              <StatusBadge status={server.status} />
            </div>
            {server.description && (
              <p className="text-sm text-muted-foreground font-mono">{server.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-shrink-0"
            onClick={() => probe.mutate(id)}
            disabled={probe.isPending}
          >
            <Activity className={`w-3.5 h-3.5 ${probe.isPending ? 'animate-spin' : ''}`} />
            {probe.isPending ? 'Probing…' : 'Probe Now'}
          </Button>
        </div>
      </div>

      {/* Metadata row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: <ExternalLink className="w-3.5 h-3.5" />,
            label: 'Endpoint',
            value: (
              <a
                href={server.endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary hover:underline truncate"
              >
                {server.endpoint}
              </a>
            ),
          },
          {
            icon: <User className="w-3.5 h-3.5" />,
            label: 'Owner',
            value: <span className="font-mono text-sm">{server.owner ?? '—'}</span>,
          },
          {
            icon: <GitBranch className="w-3.5 h-3.5" />,
            label: 'Version',
            value: <span className="font-mono text-sm">{server.version ?? '—'}</span>,
          },
          {
            icon: <Clock className="w-3.5 h-3.5" />,
            label: 'Last Updated',
            value: (
              <span className="font-mono text-xs text-muted-foreground">
                {formatRelativeTime(server.updated_at)}
              </span>
            ),
          },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider mb-2">
              {icon}
              {label}
            </div>
            <div className="truncate">{value}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {server.tags && server.tags.length > 0 && (
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1.5 flex-wrap">
            {server.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Health KPIs */}
      {health && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Uptime
            </p>
            <p
              className="text-2xl font-mono font-bold tabular-nums"
              style={{
                color:
                  health.uptime_pct >= 99
                    ? 'hsl(142 71% 45%)'
                    : health.uptime_pct >= 90
                      ? 'hsl(45 93% 47%)'
                      : 'hsl(0 78% 58%)',
              }}
            >
              {health.uptime_pct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Avg Latency
            </p>
            <p className="text-2xl font-mono font-bold tabular-nums text-foreground">
              {formatLatency(health.avg_latency_ms)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Probes
            </p>
            <p className="text-2xl font-mono font-bold tabular-nums text-foreground">
              {health.check_count.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HealthTimeline serverId={id} />
        <UptimeCalendar serverId={id} />
      </div>

      {/* Tabs: Tool Calls | Alerts */}
      <Tabs defaultValue="tool-calls">
        <TabsList className="bg-card border border-border h-9 p-0.5">
          <TabsTrigger
            value="tool-calls"
            className="text-xs font-mono h-8 data-[state=active]:bg-secondary"
          >
            Tool Calls
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="text-xs font-mono h-8 data-[state=active]:bg-secondary"
          >
            Alert Events
            {serverAlerts.some((a) => a.state === 'firing') && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-status-error inline-block animate-pulse-dot" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tool-calls" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tool</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Output</TableHead>
                  <TableHead>Called At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!toolCalls || toolCalls.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-mono text-sm">
                      No tool calls for this server
                    </TableCell>
                  </TableRow>
                ) : (
                  toolCalls.items.map((tc) => (
                    <TableRow key={tc.id}>
                      <TableCell className="font-mono text-sm">{tc.tool_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tc.caller_agent ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-mono ${
                            tc.status === 'success' ? 'text-status-healthy' : 'text-status-error'
                          }`}
                        >
                          {tc.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {formatLatency(tc.duration_ms)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tc.output_size_bytes != null
                          ? `${(tc.output_size_bytes / 1024).toFixed(1)} KB`
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatRelativeTime(tc.called_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>State</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Fired At</TableHead>
                  <TableHead>Resolved At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serverAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground font-mono text-sm">
                      No alert events for this server
                    </TableCell>
                  </TableRow>
                ) : (
                  serverAlerts.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-mono ${
                            ev.state === 'firing' ? 'text-status-error' : 'text-status-healthy'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.state === 'firing' ? 'bg-status-error animate-pulse-dot' : 'bg-status-healthy'
                            }`}
                          />
                          {ev.state}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ev.message ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {ev.value != null ? ev.value.toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDateTime(ev.fired_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {ev.resolved_at ? formatDateTime(ev.resolved_at) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
