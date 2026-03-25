'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getAdminWorkspaces } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_ADMIN_WORKSPACES } from '@/lib/demo-data'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function AllWorkspacesTable() {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['admin', 'workspaces'],
    queryFn: () => isDemoMode() ? Promise.resolve(DEMO_ADMIN_WORKSPACES) : getAdminWorkspaces(),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">
          Workspaces
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">
            {workspaces?.length ?? 0}
          </span>
        </h2>
      </div>
      <div className="border border-border rounded overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px_36px] gap-4 px-4 py-2 bg-secondary/30 border-b border-border">
          {['Workspace', 'Members', 'Servers', 'Created', ''].map((h) => (
            <span key={h} className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
              {h}
            </span>
          ))}
        </div>
        {(workspaces ?? []).map((ws) => (
          <div
            key={ws.id}
            className="grid grid-cols-[1fr_80px_80px_80px_36px] gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors items-center"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ws.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground/70 truncate">/{ws.slug}</p>
            </div>
            <span className="text-sm font-mono text-muted-foreground tabular-nums">{ws.member_count}</span>
            <span className="text-sm font-mono text-muted-foreground tabular-nums">{ws.server_count}</span>
            <span className="text-xs font-mono text-muted-foreground/60">{timeAgo(ws.created_at)}</span>
            <Link
              href={`/admin/workspaces/${ws.id}`}
              className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
        {(workspaces ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No workspaces.</div>
        )}
      </div>
    </div>
  )
}
