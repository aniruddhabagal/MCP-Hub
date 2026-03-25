'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inviteMember } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo-mode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export function InviteForm() {
  const { workspace } = useAuth()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')

  const inviteMut = useMutation({
    mutationFn: () => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.reject() }
      return inviteMember(workspace!.id, { email, role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', workspace?.id] })
      toast.success(`Invite sent to ${email}`)
      setEmail('')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send invite'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMut.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-0.5">Invite member</h3>
        <p className="text-xs text-muted-foreground">Send an email invitation to join this workspace.</p>
      </div>

      <div className="flex gap-2.5 items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
            Email address
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
          />
        </div>

        <div className="w-32 space-y-1.5">
          <Label className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
            Role
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'member')}>
            <SelectTrigger className="h-10 bg-secondary/50 border-border font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          disabled={inviteMut.isPending}
          className="h-10 font-mono text-sm px-4 flex-shrink-0"
        >
          {inviteMut.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
