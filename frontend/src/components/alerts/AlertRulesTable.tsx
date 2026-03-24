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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlertRules, useDeleteAlertRule, useUpdateAlertRule, useServers } from '@/lib/hooks'
import { formatRelativeTime } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

const METRIC_LABELS: Record<string, string> = {
  error_rate: 'Error Rate',
  latency_p95: 'Latency p95',
  availability: 'Availability',
}

const OPERATOR_SYMBOLS: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
}

export function AlertRulesTable() {
  const { data: rules, isLoading } = useAlertRules()
  const { data: servers } = useServers()
  const del = useDeleteAlertRule()
  const update = useUpdateAlertRule()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const serversMap = new Map((servers ?? []).map((s) => [s.id, s]))

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table className="min-w-[480px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Rule</TableHead>
            <TableHead className="hidden sm:table-cell">Scope</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead className="hidden md:table-cell">Window</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : !rules || rules.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-14 text-muted-foreground font-mono text-sm"
              >
                No alert rules configured
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => {
              const serverName = rule.server_id ? serversMap.get(rule.server_id)?.name : null
              return (
                <TableRow key={rule.id} className="group">
                  <TableCell>
                    <p className="font-medium text-foreground text-sm">{rule.name}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">
                      {serverName ?? 'Global'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono">
                      <span className="text-foreground">
                        {METRIC_LABELS[rule.metric] ?? rule.metric}
                      </span>
                      <span className="text-muted-foreground mx-1">
                        {OPERATOR_SYMBOLS[rule.operator] ?? rule.operator}
                      </span>
                      <span className="text-primary tabular-nums">{rule.threshold}</span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      {rule.window_minutes}m
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatRelativeTime(rule.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) =>
                        update.mutate({ id: rule.id, data: { enabled: checked } })
                      }
                      disabled={update.isPending}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmingId === rule.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-status-error hover:text-status-error hover:bg-status-error/10"
                            onClick={() => {
                              del.mutate(rule.id)
                              setConfirmingId(null)
                            }}
                            disabled={del.isPending}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setConfirmingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-status-error"
                          onClick={() => setConfirmingId(rule.id)}
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
