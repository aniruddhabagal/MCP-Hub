'use client'

import { Server } from 'lucide-react'
import { RegisterServerModal } from '@/components/servers/RegisterServerModal'
import { ServerTable } from '@/components/servers/ServerTable'
import { useServers } from '@/lib/hooks'

export default function ServersPage() {
  const { data: servers } = useServers()

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
            Servers
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {servers != null
              ? `${servers.length} server${servers.length !== 1 ? 's' : ''} registered`
              : 'Server registry'}
          </p>
        </div>
        <RegisterServerModal />
      </div>

      <ServerTable />
    </div>
  )
}
