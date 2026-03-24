'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
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
import { useCreateServer } from '@/lib/hooks'
import type { ServerCreate } from '@/lib/types'

const INITIAL: ServerCreate = {
  name: '',
  endpoint: '',
  description: '',
  owner: '',
  version: '',
}

export function RegisterServerModal() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ServerCreate>(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const createServer = useCreateServer()

  function set(field: keyof ServerCreate, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
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

    const payload: ServerCreate = {
      name: form.name.trim(),
      endpoint: form.endpoint.trim(),
    }
    if (form.description?.trim()) payload.description = form.description.trim()
    if (form.owner?.trim()) payload.owner = form.owner.trim()
    if (form.version?.trim()) payload.version = form.version.trim()

    try {
      await createServer.mutateAsync(payload)
      setOpen(false)
      setForm(INITIAL)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register server.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setForm(INITIAL)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Register Server
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register MCP Server</DialogTitle>
          <DialogDescription>
            Add a new server to the registry. MCPHub will monitor its health and
            proxy tool calls through it.
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
              placeholder="http://localhost:3001"
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
            <Button type="submit" disabled={createServer.isPending}>
              {createServer.isPending ? 'Registering…' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
