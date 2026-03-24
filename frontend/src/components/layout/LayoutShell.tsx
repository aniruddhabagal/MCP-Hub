'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { DemoBanner } from './DemoBanner'
import { useDemoMode } from '@/lib/demo-mode'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const demo = useDemoMode()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (pathname === '/') {
    return <>{children}</>
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
          {/* Spacer to keep logo centred */}
          <div className="w-7" />
        </div>

        {demo && <DemoBanner />}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
