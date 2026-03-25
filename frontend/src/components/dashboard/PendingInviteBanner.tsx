'use client'

import { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { PendingInvite } from '@/lib/types'
import { Button } from '@/components/ui/button'

function InviteBanner({ invite }: { invite: PendingInvite }) {
  const { acceptInvite } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)
    try {
      await acceptInvite(invite.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
      setAccepting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded border border-primary/20 bg-primary/5">
      <UserPlus className="w-4 h-4 text-primary flex-shrink-0" />
      <p className="flex-1 text-sm text-foreground font-mono">
        You&apos;ve been invited to join{' '}
        <strong className="text-primary">{invite.workspace_name}</strong>
        {' '}as <span className="text-muted-foreground">{invite.role}</span>
      </p>
      {error && <span className="text-xs text-status-error font-mono">{error}</span>}
      <Button
        size="sm"
        onClick={handleAccept}
        disabled={accepting}
        className="h-7 text-xs font-mono flex-shrink-0"
      >
        {accepting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Accept'}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function PendingInviteBanner() {
  const { pendingInvites } = useAuth()

  if (!pendingInvites || pendingInvites.length === 0) return null

  return (
    <div className="space-y-2">
      {pendingInvites.map((invite) => (
        <InviteBanner key={invite.token} invite={invite} />
      ))}
    </div>
  )
}
