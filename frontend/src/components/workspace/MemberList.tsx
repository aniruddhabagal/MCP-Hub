'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, MoreHorizontal, Shield, UserX } from 'lucide-react'
import { getWorkspaceMembers, removeMember, updateMemberRole } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { WorkspaceMember, WorkspaceRole } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_WORKSPACE_MEMBERS } from '@/lib/demo-data'

const roleBadgeClass: Record<WorkspaceRole, string> = {
  owner: 'bg-primary/15 text-primary border-primary/30',
  admin: 'bg-status-warning/15 text-status-warning border-status-warning/30',
  member: 'bg-secondary text-muted-foreground border-border',
}

function MemberRow({
  member,
  currentUserId,
  currentRole,
}: {
  member: WorkspaceMember
  currentUserId: string
  currentRole: WorkspaceRole | null
}) {
  const queryClient = useQueryClient()
  const { workspace } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const removeMut = useMutation({
    mutationFn: () => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.resolve() }
      return removeMember(workspace!.id, member.user_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspace?.id] })
      toast.success(`${member.user_email} removed`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  const roleMut = useMutation({
    mutationFn: (role: WorkspaceRole) => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.resolve(member) }
      return updateMemberRole(workspace!.id, member.user_id, role)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspace?.id] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  const isMe = member.user_id === currentUserId
  const canManage = currentRole === 'owner' || (currentRole === 'admin' && member.role === 'member')
  const canChangeRole = currentRole === 'owner' && member.role !== 'owner'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-mono font-medium text-foreground">
          {(member.user_display_name ?? member.user_email).charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {member.user_display_name ?? member.user_email.split('@')[0]}
          </p>
          {isMe && (
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.15em] border border-border px-1.5 py-0.5 rounded">
              you
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground truncate">{member.user_email}</p>
      </div>

      {/* Role badge */}
      <Badge className={cn('text-[10px] font-mono border', roleBadgeClass[member.role])}>
        {member.role === 'owner' && <Shield className="w-2.5 h-2.5 mr-1" />}
        {member.role}
      </Badge>

      {/* Actions */}
      {canManage && !isMe && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-muted-foreground hover:text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded shadow-lg overflow-hidden min-w-[140px]">
                {canChangeRole && (
                  <>
                    {(['admin', 'member'] as WorkspaceRole[])
                      .filter((r) => r !== member.role)
                      .map((r) => (
                        <button
                          key={r}
                          onClick={() => { roleMut.mutate(r); setMenuOpen(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors capitalize"
                        >
                          Make {r}
                        </button>
                      ))}
                    <div className="border-t border-border" />
                  </>
                )}
                <button
                  onClick={() => { removeMut.mutate(); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-status-error hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function MemberList() {
  const { workspace, user, role } = useAuth()

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', workspace?.id],
    queryFn: () =>
      isDemoMode()
        ? Promise.resolve(DEMO_WORKSPACE_MEMBERS)
        : getWorkspaceMembers(workspace!.id),
    enabled: !!workspace,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-0.5">Members</h3>
        <p className="text-xs text-muted-foreground">{members?.length ?? 0} member{members?.length !== 1 ? 's' : ''} in this workspace</p>
      </div>
      <div className="border border-border rounded overflow-hidden">
        {(members ?? []).map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            currentUserId={user?.id ?? ''}
            currentRole={role}
          />
        ))}
      </div>
    </div>
  )
}
