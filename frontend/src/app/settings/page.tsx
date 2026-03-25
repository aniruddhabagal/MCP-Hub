'use client'

import { useAuth } from '@/lib/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkspaceGeneralSettings } from '@/components/workspace/WorkspaceGeneralSettings'
import { MemberList } from '@/components/workspace/MemberList'
import { InviteForm } from '@/components/workspace/InviteForm'
import { PendingInvites } from '@/components/workspace/PendingInvites'
import { ApiKeyManager } from '@/components/workspace/ApiKeyManager'

export default function SettingsPage() {
  const { workspace, role } = useAuth()

  // Guard — members can't access settings
  if (role === 'member') {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view workspace settings.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
          Workspace
        </p>
        <h1 className="font-serif italic text-3xl text-foreground">
          Settings
        </h1>
        {workspace && (
          <p className="text-sm text-muted-foreground mt-1">
            Managing <span className="text-foreground font-medium">{workspace.name}</span>
            <span className="font-mono text-muted-foreground/60 ml-2">/{workspace.slug}</span>
          </p>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-secondary/40 border border-border h-9 p-0.5">
          <TabsTrigger value="general" className="font-mono text-xs h-full px-4 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="font-mono text-xs h-full px-4 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Members
          </TabsTrigger>
          <TabsTrigger value="invites" className="font-mono text-xs h-full px-4 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Invites
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="font-mono text-xs h-full px-4 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            API Keys
          </TabsTrigger>
        </TabsList>

        <div className="max-w-2xl">
          <TabsContent value="general" className="mt-0">
            <div className="bg-surface border border-border rounded p-6">
              <WorkspaceGeneralSettings />
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="bg-surface border border-border rounded p-6">
              <MemberList />
            </div>
          </TabsContent>

          <TabsContent value="invites" className="mt-0 space-y-5">
            <div className="bg-surface border border-border rounded p-6">
              <InviteForm />
            </div>
            <div className="bg-surface border border-border rounded p-6">
              <PendingInvites />
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="mt-0">
            <div className="bg-surface border border-border rounded p-6">
              <ApiKeyManager />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
