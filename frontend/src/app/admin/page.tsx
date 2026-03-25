'use client'

import { Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PlatformStatsCards } from '@/components/admin/PlatformStatsCards'
import { AllWorkspacesTable } from '@/components/admin/AllWorkspacesTable'
import { AllUsersTable } from '@/components/admin/AllUsersTable'
import { GlobalActivityFeed } from '@/components/admin/GlobalActivityFeed'

export default function AdminPage() {
  const { isSuperAdmin } = useAuth()

  if (!isSuperAdmin) {
    return (
      <div className="p-6 sm:p-8 lg:p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Super admin access required.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
          Platform
        </p>
        <div className="flex items-center gap-2.5">
          <h1 className="font-serif italic text-3xl text-foreground">Admin</h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-primary/30 bg-primary/10">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.15em]">
              Super Admin
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide visibility across all workspaces and users.
        </p>
      </div>

      {/* Stats */}
      <PlatformStatsCards />

      {/* Two-column layout for tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AllWorkspacesTable />
        <AllUsersTable />
      </div>

      {/* Activity feed */}
      <GlobalActivityFeed />
    </div>
  )
}
