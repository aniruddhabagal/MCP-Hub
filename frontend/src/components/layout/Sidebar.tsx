'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Server,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/lib/websocket'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/servers', label: 'Servers', icon: Server },
  { href: '/tools', label: 'Tool Calls', icon: Zap },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { connectionState } = useWebSocket()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r border-border bg-surface flex flex-col z-40">
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* Icon mark */}
          <div className="w-7 h-7 rounded border border-primary/40 bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-serif italic text-[1.15rem] text-foreground tracking-tight">
            MCPHub
          </span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mt-1.5 ml-9 uppercase tracking-[0.2em]">
          Monitor v0.1
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
          Navigation
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-150 group',
                active
                  ? 'bg-primary/10 text-primary border border-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  active ? 'text-primary' : 'group-hover:text-foreground'
                )}
              />
              <span className="font-medium">{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer status */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              connectionState === 'connected'
                ? 'bg-status-healthy animate-pulse-dot'
                : connectionState === 'connecting'
                  ? 'bg-status-warning animate-pulse'
                  : 'bg-muted-foreground/40'
            )}
          />
          <span>
            {connectionState === 'connected'
              ? 'Live'
              : connectionState === 'connecting'
                ? 'Connecting…'
                : 'Offline'}
          </span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground/40 mt-1">
          ws/dashboard
        </p>
      </div>
    </aside>
  )
}
