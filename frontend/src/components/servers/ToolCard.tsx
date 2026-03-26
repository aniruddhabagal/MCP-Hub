'use client'

import { useState } from 'react'
import { Play, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import type { MCPToolDefinition } from '@/lib/types'
import { ToolPlayground } from './ToolPlayground'

interface ToolCardProps {
  tool: MCPToolDefinition
  serverId: string
}

function getParamSummary(schema: MCPToolDefinition['inputSchema']): string {
  if (!schema) return 'No parameters'
  const properties = schema.properties as Record<string, unknown> | undefined
  if (!properties) return 'No parameters'
  const total = Object.keys(properties).length
  const required = (schema.required as string[] | undefined)?.length ?? 0
  if (total === 0) return 'No parameters'
  const parts = [`${total} param${total !== 1 ? 's' : ''}`]
  if (required > 0) parts.push(`${required} required`)
  return parts.join(', ')
}

export function ToolCard({ tool, serverId }: ToolCardProps) {
  const { role, isSuperAdmin } = useAuth()
  const canInvoke = isSuperAdmin || role === 'admin' || role === 'owner'
  const [playgroundOpen, setPlaygroundOpen] = useState(false)
  const paramSummary = getParamSummary(tool.inputSchema)

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 hover:border-border/80 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Code2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="font-mono text-sm text-foreground font-medium truncate">
              {tool.name}
            </span>
          </div>
          {canInvoke && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-mono h-7 flex-shrink-0"
              onClick={() => setPlaygroundOpen(true)}
            >
              <Play className="w-3 h-3" />
              Test
            </Button>
          )}
        </div>

        {/* Description */}
        {tool.description ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">No description</p>
        )}

        {/* Param summary */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
            {paramSummary}
          </span>
        </div>
      </div>

      {playgroundOpen && (
        <ToolPlayground
          serverId={serverId}
          tool={tool}
          open={playgroundOpen}
          onClose={() => setPlaygroundOpen(false)}
        />
      )}
    </>
  )
}
