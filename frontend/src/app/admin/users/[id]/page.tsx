'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react'
import Link from 'next/link'
import { getAdminUser, updateAdminUser, deleteAdminUser, impersonateUser } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_ADMIN_USERS, DEMO_WORKSPACE_MEMBERS } from '@/lib/demo-data'
import { useAuth } from '@/lib/auth'
import { setAccessToken } from '@/lib/token-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isSuperAdmin, user: currentUser } = useAuth()
  const id = params.id as string
  const [confirmDelete, setConfirmDelete] = useState('')

  const { data: u, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => {
      if (isDemoMode()) {
        const found = DEMO_ADMIN_USERS.find((x) => x.id === id) ?? DEMO_ADMIN_USERS[0]
        return Promise.resolve({
          ...found,
          workspaces: DEMO_WORKSPACE_MEMBERS
            .filter((m) => m.user_id === found.id)
            .map((m) => ({ id: m.workspace_id, name: 'Acme Corp', slug: 'acme-corp', role: m.role })),
        })
      }
      return getAdminUser(id)
    },
    enabled: !!id && isSuperAdmin,
  })

  const updateMut = useMutation({
    mutationFn: (body: { is_active?: boolean; is_superadmin?: boolean }) => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.reject() }
      return updateAdminUser(id, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: () => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.resolve() }
      return deleteAdminUser(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User deleted')
      router.push('/admin')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  const impersonateMut = useMutation({
    mutationFn: () => {
      if (isDemoMode()) { toast.info('Impersonation not available in demo mode'); return Promise.reject() }
      return impersonateUser(id)
    },
    onSuccess: (data) => {
      setAccessToken(data.access_token)
      queryClient.invalidateQueries()
      toast.success('Impersonating user — navigate to see their view')
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

  if (!u) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    )
  }

  const isSelf = currentUser?.id === id

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">User</p>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif italic text-3xl text-foreground">
              {u.display_name ?? u.email.split('@')[0]}
            </h1>
            {u.is_superadmin && <Shield className="w-5 h-5 text-primary" />}
          </div>
          <p className="text-sm font-mono text-muted-foreground mt-0.5">{u.email}</p>
        </div>

        {/* Impersonate */}
        {!isSelf && (
          <Button
            variant="outline"
            className="font-mono text-sm h-9 flex-shrink-0"
            onClick={() => impersonateMut.mutate()}
            disabled={impersonateMut.isPending}
          >
            {impersonateMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Impersonate
              </>
            )}
          </Button>
        )}
      </div>

      {/* Status toggles */}
      <div className="bg-surface border border-border rounded p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Account settings</h2>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <Label className="text-sm font-medium text-foreground">Active</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inactive users cannot log in. Their data is retained.
            </p>
          </div>
          <Switch
            checked={u.is_active}
            disabled={isSelf || updateMut.isPending}
            onCheckedChange={(v) => updateMut.mutate({ is_active: v })}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Super admin
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full platform-wide access. Grant with care.
            </p>
          </div>
          <Switch
            checked={u.is_superadmin}
            disabled={isSelf || updateMut.isPending}
            onCheckedChange={(v) => updateMut.mutate({ is_superadmin: v })}
          />
        </div>
      </div>

      {/* Workspace memberships */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">
            Workspaces
            <span className="ml-2 text-[10px] font-mono text-muted-foreground">
              {u.workspaces.length}
            </span>
          </h2>
        </div>
        {u.workspaces.map((ws) => (
          <div
            key={ws.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0"
          >
            <div className="w-6 h-6 rounded bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-mono text-primary">
                {ws.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{ws.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">/{ws.slug}</p>
            </div>
            <Badge
              className={cn(
                'text-[10px] font-mono border',
                ws.role === 'owner'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : ws.role === 'admin'
                    ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                    : 'bg-secondary text-muted-foreground border-border'
              )}
            >
              {ws.role}
            </Badge>
            <Link
              href={`/admin/workspaces/${ws.id}`}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              View →
            </Link>
          </div>
        ))}
        {u.workspaces.length === 0 && (
          <p className="px-5 py-4 text-sm text-muted-foreground">No workspace memberships.</p>
        )}
      </div>

      {/* Danger zone */}
      {!isSelf && (
        <div className="border border-status-error/20 rounded p-5 space-y-4">
          <div className="flex items-start gap-3">
            <UserX className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-foreground">Delete user</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes this user account. They will lose access immediately.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-mono text-muted-foreground">
              Type <span className="text-foreground font-medium">{u.email}</span> to confirm
            </p>
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={u.email}
              className="w-full max-w-xs bg-secondary/50 border border-border rounded px-3 h-9 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
            />
          </div>
          <Button
            variant="destructive"
            disabled={confirmDelete !== u.email || deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
            className="font-mono text-sm h-9"
          >
            {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete user'}
          </Button>
        </div>
      )}
    </div>
  )
}
