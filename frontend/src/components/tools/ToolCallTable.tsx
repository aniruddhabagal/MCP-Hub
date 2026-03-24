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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ToolCallDetail } from './ToolCallDetail'
import { useToolCalls, useServers } from '@/lib/hooks'
import { formatLatency, formatRelativeTime } from '@/lib/utils'
import type { ToolCall } from '@/lib/types'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'

const PAGE_SIZE = 25

export function ToolCallTable() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serverFilter, setServerFilter] = useState<string>('all')
  const [selected, setSelected] = useState<ToolCall | null>(null)

  const { data: servers } = useServers()
  const { data, isLoading } = useToolCalls({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    server_id: serverFilter !== 'all' ? serverFilter : undefined,
    page,
    size: PAGE_SIZE,
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  function handleFilterChange(key: 'status' | 'server', val: string) {
    setPage(1)
    if (key === 'status') setStatusFilter(val)
    else setServerFilter(val)
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => handleFilterChange('status', v)}
        >
          <SelectTrigger className="h-8 w-36 text-xs font-mono">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={serverFilter}
          onValueChange={(v) => handleFilterChange('server', v)}
        >
          <SelectTrigger className="h-8 w-44 text-xs font-mono">
            <SelectValue placeholder="All servers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All servers</SelectItem>
            {(servers ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data && (
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            {data.total.toLocaleString()} calls
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tool</TableHead>
              <TableHead className="hidden sm:table-cell">Server</TableHead>
              <TableHead className="hidden md:table-cell">Caller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="hidden md:table-cell">Output Size</TableHead>
              <TableHead>Called At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data || data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-14 text-muted-foreground font-mono text-sm"
                >
                  No tool calls found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((tc) => {
                const serverName = servers?.find((s) => s.id === tc.server_id)?.name
                return (
                  <TableRow
                    key={tc.id}
                    className="cursor-pointer hover:bg-secondary/50"
                    onClick={() => setSelected(tc)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm text-foreground">
                        {tc.tool_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">
                        {serverName ?? tc.server_id.slice(0, 8) + '…'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">
                        {tc.caller_agent ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tc.status === 'success' ? 'healthy' : 'error'}
                        className="text-[10px]"
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            tc.status === 'success' ? 'bg-status-healthy' : 'bg-status-error'
                          }`}
                        />
                        {tc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm tabular-nums">
                        {formatLatency(tc.duration_ms)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {tc.output_size_bytes != null
                          ? `${(tc.output_size_bytes / 1024).toFixed(1)} KB`
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatRelativeTime(tc.called_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <ToolCallDetail toolCall={selected} onClose={() => setSelected(null)} />
    </>
  )
}
