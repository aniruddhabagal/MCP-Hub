'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Loader2, X } from 'lucide-react'
import { getWorkspaceInvites, revokeInvite } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_WORKSPACE_INVITES } from '@/lib/demo-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function PendingInvites() {
  const { workspace } = useAuth()
  const queryClient = useQueryClient()

  const { data: invites, isLoading } = useQuery({
    queryKey: ['invites', workspace?.id],
    queryFn: () =>
      isDemoMode()
        ? Promise.resolve(DEMO_WORKSPACE_INVITES)
        : getWorkspaceInvites(workspace!.id),
    enabled: !!workspace,
  })

  const revokeMut = useMutation({
    mutationFn: (inviteId: string) => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.resolve() }
      return revokeInvite(workspace!.id, inviteId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', workspace?.id] })
      toast.success('Invite revoked')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pending = (invites ?? []).filter((i) => !i.accepted_at)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-0.5">Pending invites</h3>
        <p className="text-xs text-muted-foreground">
          {pending.length === 0 ? 'No pending invitations.' : `${pending.length} pending invitation${pending.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {pending.length > 0 && (
        <div className="border border-border rounded overflow-hidden">
          {pending.map((invite) => {
            const expiresAt = new Date(invite.expires_at)
            const isExpired = expiresAt < new Date()
            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
              >
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{invite.email}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {isExpired ? (
                      <span className="text-status-error">Expired</span>
                    ) : (
                      <>Expires {expiresAt.toLocaleDateString()}</>
                    )}
                    {invite.invited_by_email && ` · invited by ${invite.invited_by_email}`}
                  </p>
                </div>
                <Badge className="text-[10px] font-mono bg-secondary text-muted-foreground border-border capitalize">
                  {invite.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-status-error flex-shrink-0"
                  onClick={() => revokeMut.mutate(invite.id)}
                  disabled={revokeMut.isPending}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
