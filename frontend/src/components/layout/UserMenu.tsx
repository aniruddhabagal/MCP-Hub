'use client'

import { useState } from 'react'
import { LogOut, Shield, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function UserMenu() {
  const { user, isSuperAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (!user) return null

  const initial = (user.display_name ?? user.email).charAt(0).toUpperCase()

  const handleLogout = () => {
    logout()
    router.push('/login')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-secondary border border-transparent hover:border-border transition-all duration-150"
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-mono font-medium text-foreground">{initial}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-foreground truncate">
            {user.display_name ?? user.email.split('@')[0]}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground truncate">{user.email}</p>
        </div>
        {isSuperAdmin && (
          <Shield className="w-3 h-3 text-primary flex-shrink-0" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-surface border border-border rounded shadow-lg overflow-hidden">
            {/* User info header */}
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-medium text-foreground">
                {user.display_name ?? user.email.split('@')[0]}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{user.email}</p>
              {isSuperAdmin && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-mono text-primary">Super Admin</span>
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { router.push('/settings'); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left'
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile & Settings</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-status-error hover:bg-secondary transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
