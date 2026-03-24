'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { DemoBanner } from './DemoBanner'
import { useDemoMode } from '@/lib/demo-mode'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const demo = useDemoMode()

  if (pathname === '/') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 min-w-0">
        {demo && <DemoBanner />}
        {children}
      </main>
    </div>
  )
}
