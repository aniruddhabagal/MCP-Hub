'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { PendingInvite } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const SHOWN_KEY = 'mcphub_invite_modal_shown'

export function PendingInviteModal() {
  const { pendingInvites, acceptInvite } = useAuth()
  const [open, setOpen] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!pendingInvites || pendingInvites.length === 0) return
    // Only show once per session
    if (sessionStorage.getItem(SHOWN_KEY)) return
    setOpen(true)
    sessionStorage.setItem(SHOWN_KEY, '1')
  }, [pendingInvites])

  const handleAccept = async (invite: PendingInvite) => {
    setAccepting(invite.token)
    setErrors((prev) => ({ ...prev, [invite.token]: '' }))
    try {
      await acceptInvite(invite.token)
      setOpen(false)
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [invite.token]: err instanceof Error ? err.message : 'Failed to accept',
      }))
    } finally {
      setAccepting(null)
    }
  }

  if (!pendingInvites || pendingInvites.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif italic text-xl font-normal flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Pending invitations
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            You have {pendingInvites.length} pending workspace invitation{pendingInvites.length > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {pendingInvites.map((invite) => (
            <div
              key={invite.token}
              className="flex items-center gap-3 p-3 rounded border border-border bg-secondary/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-foreground truncate">
                  <strong>{invite.workspace_name}</strong>
                </p>
                <p className="text-xs font-mono text-muted-foreground">Role: {invite.role}</p>
                {errors[invite.token] && (
                  <p className="text-xs text-status-error mt-0.5">{errors[invite.token]}</p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleAccept(invite)}
                disabled={accepting === invite.token}
                className="h-7 text-xs font-mono flex-shrink-0"
              >
                {accepting === invite.token ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Accept'
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs font-mono">
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
