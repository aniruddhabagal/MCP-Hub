'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlertEvents, useAlertRules, useServers } from '@/lib/hooks'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { Bell } from 'lucide-react'

export function AlertHistoryTable() {
  const [stateFilter, setStateFilter] = useState<string>('all')
  const { data: events, isLoading } = useAlertEvents({
    limit: 50,
    state: stateFilter !== 'all' ? stateFilter : undefined,
  })
  const { data: rules } = useAlertRules()
  const { data: servers } = useServers()

  const rulesMap = new Map((rules ?? []).map((r) => [r.id, r]))
  const serversMap = new Map((servers ?? []).map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="h-8 w-36 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="fired">Fired</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        {events && (
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            {events.filter((e) => e.state === 'fired').length} firing
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[440px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>State</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead className="hidden sm:table-cell">Server</TableHead>
              <TableHead className="hidden md:table-cell">Value</TableHead>
              <TableHead>Fired At</TableHead>
              <TableHead className="hidden sm:table-cell">Resolved At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !events || events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-14 text-muted-foreground font-mono text-sm"
                >
                  No alert events found
                </TableCell>
              </TableRow>
            ) : (
              events.map((ev) => {
                const rule = ev.rule_id ? rulesMap.get(ev.rule_id) : null
                const serverName = ev.server_id ? serversMap.get(ev.server_id)?.name : null
                return (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Badge
                        variant={ev.state === 'fired' ? 'firing' : 'resolved'}
                        className="text-[10px]"
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            ev.state === 'fired'
                              ? 'bg-status-error animate-pulse-dot'
                              : 'bg-status-healthy'
                          }`}
                        />
                        {ev.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-mono text-foreground">
                          {rule?.name ?? (ev.rule_id ? ev.rule_id.slice(0, 8) + '…' : '—')}
                        </p>
                        {rule && (
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {rule.metric} {rule.operator} {rule.threshold}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">
                        {serverName ?? (ev.server_id ? ev.server_id.slice(0, 8) + '…' : 'Global')}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-sm tabular-nums">
                        {ev.value != null ? ev.value.toFixed(4) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground" title={formatDateTime(ev.fired_at)}>
                        {formatRelativeTime(ev.fired_at)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">
                        {ev.resolved_at ? (
                          <span title={formatDateTime(ev.resolved_at)}>
                            {formatRelativeTime(ev.resolved_at)}
                          </span>
                        ) : (
                          <span className="text-status-error">Active</span>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
