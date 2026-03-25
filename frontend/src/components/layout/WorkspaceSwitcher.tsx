'use client'

import { useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo-mode'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

export function WorkspaceSwitcher() {
  const { workspace, workspaces, switchWorkspace } = useAuth()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  if (!workspace) return null

  // Initial of workspace name
  const initial = workspace.name.charAt(0).toUpperCase()

  const handleSwitch = async (id: string) => {
    if (id === workspace.id) { setOpen(false); return }
    await switchWorkspace(id)
    queryClient.invalidateQueries()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-secondary border border-transparent hover:border-border transition-all duration-150 group"
      >
        {/* Workspace avatar */}
        <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-mono font-medium text-primary">{initial}</span>
        </div>
        <span className="flex-1 text-left text-sm font-medium text-foreground truncate">
          {workspace.name}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-border rounded shadow-lg overflow-hidden">
            <div className="px-3 py-1.5">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
                Workspaces
              </p>
            </div>
            <div className="pb-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-mono text-primary">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={cn('flex-1 truncate', ws.id === workspace.id ? 'text-foreground' : 'text-muted-foreground')}>
                    {ws.name}
                  </span>
                  {ws.id === workspace.id && (
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {!isDemoMode() && (
              <>
                <div className="border-t border-border" />
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New workspace</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
