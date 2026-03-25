'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'
import { getAdminUsers } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_ADMIN_USERS } from '@/lib/demo-data'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function AllUsersTable() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => isDemoMode() ? Promise.resolve(DEMO_ADMIN_USERS) : getAdminUsers(),
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
          Users
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">
            {users?.length ?? 0}
          </span>
        </h2>
      </div>
      <div className="border border-border rounded overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_120px_60px_36px] gap-4 px-4 py-2 bg-secondary/30 border-b border-border">
          {['User', 'Status', 'Workspaces', ''].map((h) => (
            <span key={h} className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
              {h}
            </span>
          ))}
        </div>
        {(users ?? []).map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[1fr_120px_60px_36px] gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={cn('text-sm font-medium truncate', !u.is_active && 'text-muted-foreground line-through')}>
                  {u.display_name ?? u.email.split('@')[0]}
                </p>
                {u.is_superadmin && (
                  <Shield className="w-3 h-3 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/70 truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                className={cn(
                  'text-[9px] font-mono border',
                  u.is_active
                    ? 'bg-status-healthy/10 text-status-healthy border-status-healthy/30'
                    : 'bg-secondary text-muted-foreground border-border'
                )}
              >
                {u.is_active ? 'active' : 'inactive'}
              </Badge>
              {u.is_superadmin && (
                <Badge className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30 border">
                  superadmin
                </Badge>
              )}
            </div>
            <span className="text-sm font-mono text-muted-foreground tabular-nums">{u.workspace_count}</span>
            <Link
              href={`/admin/users/${u.id}`}
              className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
        {(users ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users.</div>
        )}
      </div>
    </div>
  )
}
