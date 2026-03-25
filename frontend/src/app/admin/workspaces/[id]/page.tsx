'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Server,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { getAdminWorkspace, deleteAdminWorkspace, impersonateUser, getWorkspaceMembers } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_ADMIN_WORKSPACES, DEMO_WORKSPACE_MEMBERS } from '@/lib/demo-data'
import { useAuth } from '@/lib/auth'
import { setAccessToken } from '@/lib/token-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
import type { WorkspaceRole } from '@/lib/types'

const roleBadgeClass: Record<WorkspaceRole, string> = {
  owner: 'bg-primary/15 text-primary border-primary/30',
  admin: 'bg-status-warning/15 text-status-warning border-status-warning/30',
  member: 'bg-secondary text-muted-foreground border-border',
}

export default function AdminWorkspaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuth()
  const id = params.id as string
  const [confirmDelete, setConfirmDelete] = useState('')

  const { data: ws, isLoading } = useQuery({
    queryKey: ['admin', 'workspace', id],
    queryFn: () =>
      isDemoMode()
        ? Promise.resolve(DEMO_ADMIN_WORKSPACES.find((w) => w.id === id) ?? DEMO_ADMIN_WORKSPACES[0])
        : getAdminWorkspace(id),
    enabled: !!id && isSuperAdmin,
  })

  const { data: members } = useQuery({
    queryKey: ['admin', 'workspace-members', id],
    queryFn: () =>
      isDemoMode()
        ? Promise.resolve(DEMO_WORKSPACE_MEMBERS)
        : getWorkspaceMembers(id),
    enabled: !!id && isSuperAdmin,
  })

  const deleteMut = useMutation({
    mutationFn: () => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.resolve() }
      return deleteAdminWorkspace(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success('Workspace deleted')
      router.push('/admin')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  const impersonateMut = useMutation({
    mutationFn: (userId: string) => {
      if (isDemoMode()) { toast.info('Impersonation not available in demo mode'); return Promise.reject() }
      return impersonateUser(userId)
    },
    onSuccess: (data) => {
      setAccessToken(data.access_token)
      queryClient.invalidateQueries()
      toast.success('Impersonating user — refresh to see their view')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  if (!isSuperAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Super admin access required.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ws) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Workspace not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 animate-fade-in">
      {/* Back */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Admin
      </Link>

      {/* Header */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
          Workspace
        </p>
        <h1 className="font-serif italic text-3xl text-foreground">{ws.name}</h1>
        <p className="text-sm font-mono text-muted-foreground mt-0.5">/{ws.slug}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Members', value: ws.member_count, icon: Users },
          { label: 'Servers', value: ws.server_count, icon: Server },
          { label: 'Created', value: new Date(ws.created_at).toLocaleDateString(), icon: Building2 },
          { label: 'ID', value: ws.id.slice(0, 8) + '…', icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">{label}</span>
            </div>
            <p className="text-lg font-mono font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Members</h2>
        </div>
        {(members ?? []).map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0"
          >
            <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-mono">
                {(m.user_display_name ?? m.user_email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {m.user_display_name ?? m.user_email.split('@')[0]}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">{m.user_email}</p>
            </div>
            <Badge className={cn('text-[10px] font-mono border', roleBadgeClass[m.role])}>
              {m.role}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs font-mono text-muted-foreground"
              onClick={() => impersonateMut.mutate(m.user_id)}
              disabled={impersonateMut.isPending}
            >
              <UserCheck className="w-3 h-3 mr-1.5" />
              Impersonate
            </Button>
          </div>
        ))}
        {(members ?? []).length === 0 && (
          <p className="px-5 py-4 text-sm text-muted-foreground">No members.</p>
        )}
      </div>

      {/* Danger zone */}
      <div className="border border-status-error/20 rounded p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Trash2 className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Delete workspace</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes this workspace, all servers, tool calls, alerts, and member data.
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-muted-foreground">
            Type <span className="text-foreground font-medium">{ws.name}</span> to confirm
          </p>
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder={ws.name}
            className="w-full max-w-xs bg-secondary/50 border border-border rounded px-3 h-9 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
          />
        </div>
        <Button
          variant="destructive"
          disabled={confirmDelete !== ws.name || deleteMut.isPending}
          onClick={() => deleteMut.mutate()}
          className="font-mono text-sm h-9"
        >
          {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete workspace'}
        </Button>
      </div>
    </div>
  )
}
