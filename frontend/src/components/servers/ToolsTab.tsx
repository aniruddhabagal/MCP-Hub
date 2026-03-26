'use client'

import { useState } from 'react'
import { RefreshCw, Search, Wrench, AlertTriangle, ServerCrash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useServerTools, useInvalidateToolsCache } from '@/lib/hooks'
import { ToolCard } from './ToolCard'

interface ToolsTabProps {
  serverId: string
}

export function ToolsTab({ serverId }: ToolsTabProps) {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error } = useServerTools(serverId)
  const invalidate = useInvalidateToolsCache()

  const tools = data?.tools ?? []
  const filtered = search.trim()
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase())
      )
    : tools

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tools'
    const isUnreachable = msg.includes('502') || msg.includes('unreachable')
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <ServerCrash className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm font-mono text-muted-foreground">
          {isUnreachable ? 'Server is unreachable' : 'Failed to load tools'}
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">{msg}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 text-xs font-mono gap-1.5"
          onClick={() => invalidate.mutate(serverId)}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-xs font-mono"
            placeholder="Filter tools…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {data?.cached && (
            <Badge variant="default" className="text-[10px] font-mono gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-unknown inline-block" />
              cached
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-mono gap-1.5"
            onClick={() => invalidate.mutate(serverId)}
            disabled={invalidate.isPending}
          >
            <RefreshCw className={`w-3 h-3 ${invalidate.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {tools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Wrench className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm font-mono text-muted-foreground">No tools discovered</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            This server may not support <code className="font-mono">tools/list</code>, or it has no
            tools registered.
          </p>
        </div>
      )}

      {/* No filter results */}
      {tools.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <AlertTriangle className="w-6 h-6 text-muted-foreground/40" />
          <p className="text-sm font-mono text-muted-foreground">
            No tools match &quot;{search}&quot;
          </p>
        </div>
      )}

      {/* Tool grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tool) => (
            <ToolCard key={tool.name} tool={tool} serverId={serverId} />
          ))}
        </div>
      )}
    </div>
  )
}
