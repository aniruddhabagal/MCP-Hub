'use client'

import { useState } from 'react'
import { Activity, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeleteServer, useProbeServer, useServers } from '@/lib/hooks'
import { formatLatency, formatRelativeTime } from '@/lib/utils'
import { useHealthSummary } from '@/lib/hooks'
import type { Server } from '@/lib/types'

function ServerRowActions({ server }: { server: Server }) {
  const probe = useProbeServer()
  const del = useDeleteServer()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => probe.mutate(server.id)}
        disabled={probe.isPending}
        title="Probe now"
      >
        <Activity className="w-3.5 h-3.5" />
      </Button>
      <a
        href={server.endpoint}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Open endpoint"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      {confirming ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-status-error hover:text-status-error hover:bg-status-error/10"
            onClick={() => {
              del.mutate(server.id)
              setConfirming(false)
            }}
            disabled={del.isPending}
          >
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-status-error"
          onClick={() => setConfirming(true)}
          title="Delete server"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  )
}

export function ServerTable() {
  const { data: servers, isLoading } = useServers()
  const { data: healthSummary } = useHealthSummary()

  const healthMap = new Map(
    (healthSummary ?? []).map((s) => [s.server_id, s])
  )

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Server</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Activity className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium">No servers registered</p>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          Click &ldquo;Register Server&rdquo; to add your first MCP server
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Server</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Avg Latency</TableHead>
            <TableHead>Uptime</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {servers.map((server) => {
            const health = healthMap.get(server.id)
            return (
              <TableRow key={server.id} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{server.name}</p>
                    {server.description && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[200px]">
                        {server.description}
                      </p>
                    )}
                    {server.tags && server.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {server.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-border text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={server.status} />
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px] block">
                    {server.endpoint}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {formatLatency(health?.avg_latency_ms)}
                  </span>
                </TableCell>
                <TableCell>
                  {health ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden w-16">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${health.uptime_pct}%`,
                            background:
                              health.uptime_pct >= 99
                                ? 'hsl(142 71% 45%)'
                                : health.uptime_pct >= 90
                                  ? 'hsl(45 93% 47%)'
                                  : 'hsl(0 78% 58%)',
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums w-10">
                        {health.uptime_pct.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs font-mono">
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground font-mono">
                    {server.owner ?? '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatRelativeTime(server.updated_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <ServerRowActions server={server} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
