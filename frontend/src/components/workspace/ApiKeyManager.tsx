'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { getApiKeys, createApiKey, revokeApiKey } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo-mode'
import { DEMO_API_KEYS } from '@/lib/demo-data'
import type { ApiKeyCreateResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ApiKeyManager() {
  const { workspace } = useAuth()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<ApiKeyCreateResponse | null>(null)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys', workspace?.id],
    queryFn: () =>
      isDemoMode()
        ? Promise.resolve(DEMO_API_KEYS)
        : getApiKeys(workspace!.id),
    enabled: !!workspace,
  })

  const createMut = useMutation({
    mutationFn: () => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.reject() }
      return createApiKey(workspace!.id, { name: keyName })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', workspace?.id] })
      setNewKey(data)
      setKeyName('')
      setCreating(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create key'),
  })

  const revokeMut = useMutation({
    mutationFn: (keyId: string) => {
      if (isDemoMode()) { toast.info('Not available in demo mode'); return Promise.resolve() }
      return revokeApiKey(workspace!.id, keyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', workspace?.id] })
      toast.success('API key revoked')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  })

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-0.5">API keys</h3>
          <p className="text-xs text-muted-foreground">
            Keys for programmatic access via the <span className="font-mono">X-API-Key</span> header.
          </p>
        </div>
        {!creating && (
          <Button
            onClick={() => setCreating(true)}
            className="font-mono text-sm h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New key
          </Button>
        )}
      </div>

      {/* New key revealed */}
      {newKey && (
        <div className="border border-status-healthy/30 bg-status-healthy/5 rounded p-4 space-y-2">
          <p className="text-xs font-mono text-status-healthy">
            Key created — copy it now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-secondary/60 border border-border rounded px-3 py-2 text-foreground truncate">
              {newKey.raw_key}
            </code>
            <Button
              size="icon"
              variant="outline"
              className="w-8 h-8 flex-shrink-0"
              onClick={() => copyKey(newKey.raw_key)}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMut.mutate() }}
          className="border border-border rounded p-4 space-y-3"
        >
          <Label htmlFor="key-name" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
            Key name
          </Label>
          <div className="flex gap-2">
            <Input
              id="key-name"
              placeholder="e.g. CI/CD Pipeline"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
              autoFocus
              className="bg-secondary/50 border-border focus:border-primary/60 h-9 font-mono text-sm"
            />
            <Button type="submit" disabled={createMut.isPending} className="h-9 font-mono text-sm px-4 flex-shrink-0">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreating(false)}
              className="h-9 font-mono text-sm px-3 text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (keys ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No API keys yet.</p>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          {(keys ?? []).map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{key.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <code className="text-[10px] font-mono text-muted-foreground">{key.key_prefix}••••</code>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    Last used: {timeAgo(key.last_used_at)}
                  </span>
                  {key.expires_at && (
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      Expires: {new Date(key.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-status-error flex-shrink-0"
                onClick={() => revokeMut.mutate(key.id)}
                disabled={revokeMut.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
