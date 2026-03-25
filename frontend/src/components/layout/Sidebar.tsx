'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Server,
  Settings,
  Shield,
  X,
  Zap,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/lib/websocket'
import { useDemoMode, toggleDemoMode } from '@/lib/demo-mode'
import { useAuth } from '@/lib/auth'
import { Switch } from '@/components/ui/switch'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { UserMenu } from './UserMenu'

const coreNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/servers', label: 'Servers', icon: Server },
  { href: '/tools', label: 'Tool Calls', icon: Zap },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { connectionState } = useWebSocket()
  const demo = useDemoMode()
  const queryClient = useQueryClient()
  const { role, isSuperAdmin, isAuthenticated } = useAuth()

  // Build nav items based on role
  const navItems = [
    ...coreNavItems,
    // Settings: visible to admin/owner (and demo mode shows it since role = 'owner')
    ...(isAuthenticated && (role === 'admin' || role === 'owner')
      ? [{ href: '/settings', label: 'Settings', icon: Settings }]
      : []),
    // Admin: super admin only
    ...(isSuperAdmin
      ? [{ href: '/admin', label: 'Admin', icon: Shield }]
      : []),
  ]

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen w-56 border-r border-border bg-surface flex flex-col z-40 transition-transform duration-200',
        // Desktop: always visible. Mobile: slide in/out.
        'md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Wordmark + Workspace Switcher */}
      <div className="px-3 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-primary/40 bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-serif italic text-[1.15rem] text-foreground tracking-tight">
              MCPHub
            </span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1 -mr-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground/50 mb-3 px-2 uppercase tracking-[0.2em]">
          Monitor v0.1
        </p>
        {/* Workspace switcher */}
        <WorkspaceSwitcher />
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
              onClick={onMobileClose}
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

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border space-y-3">
        {/* WS status */}
        <div className="px-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
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
          <span className="ml-auto text-muted-foreground/40">ws</span>
        </div>

        {/* Demo mode toggle */}
        <div className="flex items-center justify-between px-2 py-1 rounded border border-border/50 bg-secondary/30">
          <span className="text-[10px] font-mono text-muted-foreground">Demo mode</span>
          <Switch
            checked={demo}
            onCheckedChange={() => {
              toggleDemoMode()
              queryClient.invalidateQueries()
            }}
            className="scale-75 origin-right"
          />
        </div>

        {/* User menu */}
        <UserMenu />
      </div>
    </aside>
  )
}
