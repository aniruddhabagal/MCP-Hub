'use client'

import { useState } from 'react'
import { Plus, ChevronDown, Pencil, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateServer, useUpdateServer } from '@/lib/hooks'
import type { Server, ServerCreate, AuthType, AuthCredentials } from '@/lib/types'

interface FormState {
  name: string
  endpoint: string
  description: string
  owner: string
  version: string
  tags: string
  auth_type: AuthType
  auth_credentials: AuthCredentials
}

const INITIAL: FormState = {
  name: '',
  endpoint: '',
  description: '',
  owner: '',
  version: '',
  tags: '',
  auth_type: 'none',
  auth_credentials: {},
}

interface RegisterServerModalProps {
  server?: Server
  trigger?: React.ReactNode
}

const AUTH_LABELS: Record<AuthType, string> = {
  none: 'None',
  bearer: 'Bearer Token',
  api_key_header: 'API Key (Header)',
  basic: 'Basic Auth',
}

export function RegisterServerModal({ server, trigger }: RegisterServerModalProps) {
  const isEditMode = !!server
  const serverHasAuth = isEditMode && !!server.auth_type && server.auth_type !== 'none'
  const [open, setOpen] = useState(false)
  // In edit mode with existing auth, collapse credential inputs by default
  const [authExpanded, setAuthExpanded] = useState(!serverHasAuth)

  const getInitialForm = (): FormState => {
    if (!server) return INITIAL
    return {
      name: server.name,
      endpoint: server.endpoint,
      description: server.description || '',
      owner: server.owner || '',
      version: server.version || '',
      tags: (server.tags || []).join(', '),
      auth_type: (server.auth_type || 'none') as AuthType,
      auth_credentials: {},
    }
  }

  const [form, setForm] = useState<FormState>(getInitialForm())
  const [error, setError] = useState<string | null>(null)
  const createServer = useCreateServer()
  const updateServer = useUpdateServer()

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function setCred<K extends keyof AuthCredentials>(field: K, value: string) {
    setForm((prev) => ({
      ...prev,
      auth_credentials: { ...prev.auth_credentials, [field]: value },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Server name is required.')
      return
    }
    if (!form.endpoint.trim()) {
      setError('Endpoint URL is required.')
      return
    }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)

    // Only send auth_credentials if the user actually filled in credential fields
    const hasNewCredentials =
      form.auth_type !== 'none' &&
      Object.values(form.auth_credentials).some((v) => v && String(v).trim())

    const payload = {
      name: form.name.trim(),
      endpoint: form.endpoint.trim(),
      ...(form.description?.trim() && { description: form.description.trim() }),
      ...(form.owner?.trim() && { owner: form.owner.trim() }),
      ...(form.version?.trim() && { version: form.version.trim() }),
      ...(tags.length > 0 && { tags }),
      auth_type: form.auth_type,
      ...(hasNewCredentials && { auth_credentials: form.auth_credentials }),
    }

    try {
      if (isEditMode && server) {
        await updateServer.mutateAsync({ id: server.id, body: payload })
      } else {
        await createServer.mutateAsync(payload as ServerCreate)
      }
      setOpen(false)
      setForm(INITIAL)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'register'} server.`)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setForm(getInitialForm())
          setError(null)
          setAuthExpanded(!serverHasAuth)
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Register Server
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Server' : 'Register MCP Server'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update server configuration, metadata, and authentication.'
              : 'Add a new server to the registry. MCPHub will monitor its health and proxy tool calls through it.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. filesystem-server"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endpoint">Endpoint URL *</Label>
            <Input
              id="endpoint"
              placeholder="https://mcp.example.com/mcp"
              value={form.endpoint}
              onChange={(e) => set('endpoint', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What does this server do?"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                placeholder="team or person"
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={form.version}
                onChange={(e) => set('version', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="filesystem, tools, backup (comma-separated)"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>

          {/* Auth configuration */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Authentication
              </span>
              {/* In edit mode with existing auth, show a collapsed summary until the user clicks edit */}
              {isEditMode && serverHasAuth && !authExpanded && (
                <button
                  type="button"
                  onClick={() => setAuthExpanded(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Lock className="w-3 h-3" />
                  <span className="font-mono">{AUTH_LABELS[form.auth_type]}</span>
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Show full credential inputs when expanded (always for create, on demand for edit) */}
            {authExpanded && (
              <>
                <div className="space-y-1.5">
                  <div className="relative">
                    <select
                      id="auth_type"
                      value={form.auth_type}
                      onChange={(e) => {
                        set('auth_type', e.target.value as AuthType)
                        set('auth_credentials', {})
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {(Object.entries(AUTH_LABELS) as [AuthType, string][]).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>

                {form.auth_type === 'bearer' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="bearer_token">Bearer Token</Label>
                    <Input
                      id="bearer_token"
                      type="password"
                      autoComplete="new-password"
                      placeholder={isEditMode ? '(leave blank to keep existing)' : 'sk-...'}
                      value={form.auth_credentials.token ?? ''}
                      onChange={(e) => setCred('token', e.target.value)}
                    />
                  </div>
                )}

                {form.auth_type === 'api_key_header' && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="header_name">Header Name</Label>
                      <Input
                        id="header_name"
                        autoComplete="off"
                        placeholder="X-API-Key"
                        value={form.auth_credentials.header_name ?? ''}
                        onChange={(e) => setCred('header_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="header_value">Header Value</Label>
                      <Input
                        id="header_value"
                        type="password"
                        autoComplete="new-password"
                        placeholder={isEditMode ? '(leave blank to keep existing)' : 'your-api-key'}
                        value={form.auth_credentials.header_value ?? ''}
                        onChange={(e) => setCred('header_value', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {form.auth_type === 'basic' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="basic_user">Username</Label>
                      <Input
                        id="basic_user"
                        autoComplete="off"
                        placeholder="username"
                        value={form.auth_credentials.username ?? ''}
                        onChange={(e) => setCred('username', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="basic_pass">Password</Label>
                      <Input
                        id="basic_pass"
                        type="password"
                        autoComplete="new-password"
                        placeholder={isEditMode ? '(leave blank to keep existing)' : 'password'}
                        value={form.auth_credentials.password ?? ''}
                        onChange={(e) => setCred('password', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-status-error font-mono bg-status-error/10 border border-status-error/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createServer.isPending || updateServer.isPending}
            >
              {createServer.isPending || updateServer.isPending
                ? `${isEditMode ? 'Updating' : 'Registering'}…`
                : isEditMode
                  ? 'Update'
                  : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
