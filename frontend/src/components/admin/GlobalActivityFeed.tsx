'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Zap } from 'lucide-react'
import { getAdminToolCalls, getAdminAlertEvents } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_ADMIN_TOOL_CALLS, DEMO_ADMIN_ALERT_EVENTS } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function GlobalActivityFeed() {
  const { data: toolCalls, isLoading: tcLoading } = useQuery({
    queryKey: ['admin', 'tool-calls'],
    queryFn: () => isDemoMode() ? Promise.resolve(DEMO_ADMIN_TOOL_CALLS) : getAdminToolCalls(),
  })

  const { data: alertEvents, isLoading: aeLoading } = useQuery({
    queryKey: ['admin', 'alert-events'],
    queryFn: () => isDemoMode() ? Promise.resolve(DEMO_ADMIN_ALERT_EVENTS) : getAdminAlertEvents(),
  })

  if (tcLoading || aeLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Merge + sort by timestamp descending
  type FeedItem =
    | { kind: 'tool'; ts: string; tool_name: string; status: string; workspace_id: string }
    | { kind: 'alert'; ts: string; state: string; message: string | null; workspace_id: string }

  const items: FeedItem[] = [
    ...(toolCalls ?? []).map((c) => ({
      kind: 'tool' as const,
      ts: c.called_at,
      tool_name: c.tool_name,
      status: c.status,
      workspace_id: c.workspace_id,
    })),
    ...(alertEvents ?? []).map((e) => ({
      kind: 'alert' as const,
      ts: e.fired_at,
      state: e.state,
      message: e.message,
      workspace_id: e.workspace_id,
    })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 25)

  return (
    <div>
      <h2 className="text-sm font-medium text-foreground mb-3">Global activity</h2>
      <div className="border border-border rounded overflow-hidden divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
            <div className={cn(
              'mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
              item.kind === 'alert'
                ? item.state === 'fired'
                  ? 'bg-status-error/10'
                  : 'bg-status-healthy/10'
                : item.status === 'error'
                  ? 'bg-status-error/10'
                  : 'bg-secondary/60'
            )}>
              {item.kind === 'alert' ? (
                <AlertTriangle className={cn('w-2.5 h-2.5', item.state === 'fired' ? 'text-status-error' : 'text-status-healthy')} />
              ) : (
                <Zap className={cn('w-2.5 h-2.5', item.status === 'error' ? 'text-status-error' : 'text-muted-foreground')} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">
                {item.kind === 'tool'
                  ? <><span className="font-mono">{item.tool_name}</span> {item.status === 'error' ? 'failed' : 'called'}</>
                  : item.message ?? `Alert ${item.state}`}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                ws/{item.workspace_id.slice(-8)}
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0 mt-0.5">
              {timeAgo(item.ts)}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No activity.</div>
        )}
      </div>
    </div>
  )
}
