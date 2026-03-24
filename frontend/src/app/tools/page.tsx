'use client'

import { ToolCallTable } from '@/components/tools/ToolCallTable'

export default function ToolsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
          Tool Calls
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          Audit log of every tool invocation through the proxy
        </p>
      </div>
      <ToolCallTable />
    </div>
  )
}
