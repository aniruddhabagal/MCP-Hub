'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { createWorkspace } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateWorkspaceModal({ open, onOpenChange }: Props) {
  const { switchWorkspace } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugTouched) setSlug(slugify(val))
  }

  const handleSlugChange = (val: string) => {
    setSlugTouched(true)
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setError(null)
    setLoading(true)
    try {
      const ws = await createWorkspace({ name: name.trim(), slug: slug.trim() })
      await switchWorkspace(ws.id)
      queryClient.invalidateQueries()
      onOpenChange(false)
      // Reset form
      setName('')
      setSlug('')
      setSlugTouched(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (v: boolean) => {
    if (!loading) {
      onOpenChange(v)
      if (!v) {
        setName('')
        setSlug('')
        setSlugTouched(false)
        setError(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif italic text-xl font-normal">
            Create workspace
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a new workspace and invite your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="px-3 py-2.5 rounded border border-status-error/30 bg-status-error/10">
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ws-name" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
              Workspace name
            </Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              required
              autoFocus
              className="bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-slug" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
              URL slug
            </Label>
            <div className="flex items-center">
              <span className="h-10 px-3 flex items-center text-sm font-mono text-muted-foreground bg-secondary/30 border border-r-0 border-border rounded-l">
                mcphub.dev/
              </span>
              <Input
                id="ws-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="acme-corp"
                required
                className="rounded-l-none bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={loading}
              className="font-mono text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="font-mono text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
