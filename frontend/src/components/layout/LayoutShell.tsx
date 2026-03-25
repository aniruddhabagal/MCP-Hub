'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { DemoBanner } from './DemoBanner'
import { useDemoMode } from '@/lib/demo-mode'
import { useAuth } from '@/lib/auth'

// Routes that don't require auth and bypass the layout shell
const PUBLIC_ROUTES = ['/login', '/signup', '/invite']
const isPublicRoute = (path: string) =>
  path === '/' || PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'))

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const demo = useDemoMode()
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auth gate — redirect unauthenticated users to /login
  useEffect(() => {
    if (isLoading) return
    if (demo) return                      // demo mode always allowed
    if (isPublicRoute(pathname)) return   // public pages always allowed
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, demo, isAuthenticated, pathname, router])

  // Landing page — render bare (no shell)
  if (pathname === '/') {
    return <>{children}</>
  }

  // Public auth pages — render bare (no sidebar/shell)
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // Loading state — show blank while session restores
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded border border-primary/40 bg-primary/10 flex items-center justify-center animate-pulse">
            <div className="w-3.5 h-3.5 rounded-full bg-primary/60" />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
            Loading…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — slides in on mobile, always visible on md+ */}
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 md:ml-56 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 bg-surface border-b border-border px-4 h-12 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 -ml-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif italic text-base text-foreground tracking-tight">
            MCPHub
          </span>
          <div className="w-7" />
        </div>

        {demo && <DemoBanner />}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
