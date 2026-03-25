'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { updateWorkspace, deleteWorkspace } from '@/lib/api'
import { isDemoMode } from '@/lib/demo-mode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function WorkspaceGeneralSettings() {
  const { workspace, role, logout } = useAuth()
  const router = useRouter()
  const [name, setName] = useState(workspace?.name ?? '')
  const [slug, setSlug] = useState(workspace?.slug ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')

  if (!workspace) return null

  if (workspace.is_personal) {
    return (
      <div className="rounded border border-border bg-secondary/20 px-5 py-8 text-center">
        <p className="text-sm font-mono text-muted-foreground">
          Personal workspace settings cannot be modified.
        </p>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isDemoMode()) { toast.info('Not available in demo mode'); return }
    setSaving(true)
    try {
      await updateWorkspace(workspace.id, { name, slug })
      toast.success('Workspace updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirmDelete !== workspace.name) return
    if (isDemoMode()) { toast.info('Not available in demo mode'); return }
    setDeleting(true)
    try {
      await deleteWorkspace(workspace.id)
      logout()
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Workspace details */}
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-0.5">Workspace details</h3>
          <p className="text-xs text-muted-foreground">Update the name and URL slug for this workspace.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ws-name" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
            Name
          </Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="max-w-sm bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ws-slug" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
            Slug
          </Label>
          <div className="flex items-center max-w-sm">
            <span className="h-10 px-3 flex items-center text-sm font-mono text-muted-foreground bg-secondary/30 border border-r-0 border-border rounded-l">
              mcphub.dev/
            </span>
            <Input
              id="ws-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              required
              className="rounded-l-none bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
            />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="font-mono text-sm h-9">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
        </Button>
      </form>

      {/* Danger zone — owner only */}
      {role === 'owner' && (
        <div className="border border-status-error/20 rounded p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-foreground">Delete workspace</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete this workspace and all of its data. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground">
              Type <span className="text-foreground font-medium">{workspace.name}</span> to confirm
            </Label>
            <Input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={workspace.name}
              className="max-w-sm bg-secondary/50 border-border h-9 font-mono text-sm"
            />
          </div>
          <Button
            variant="destructive"
            disabled={confirmDelete !== workspace.name || deleting}
            onClick={handleDelete}
            className="font-mono text-sm h-9"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete workspace'}
          </Button>
        </div>
      )}
    </div>
  )
}
