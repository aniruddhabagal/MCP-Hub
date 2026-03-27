'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useInvokeTool } from '@/lib/hooks'
import type { MCPToolDefinition, ToolInvokeResponse } from '@/lib/types'
import { SchemaForm } from './SchemaForm'

interface ToolPlaygroundProps {
  serverId: string
  tool: MCPToolDefinition
  open: boolean
  onClose: () => void
}

function buildDefaultValues(schema: MCPToolDefinition['inputSchema']): Record<string, unknown> {
  if (!schema?.properties) return {}
  const defaults: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(schema.properties)) {
    const p = prop as Record<string, unknown>
    if (p.default !== undefined) {
      defaults[key] = p.default
    }
  }
  return defaults
}

function validateRequired(
  schema: MCPToolDefinition['inputSchema'],
  values: Record<string, unknown>
): string[] {
  if (!schema?.required) return []
  return (schema.required as string[]).filter(
    (key) => values[key] === undefined || values[key] === ''
  )
}

export function ToolPlayground({ serverId, tool, open, onClose }: ToolPlaygroundProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [formValues, setFormValues] = useState<Record<string, unknown>>(
    () => buildDefaultValues(tool.inputSchema)
  )
  const [rawJson, setRawJson] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [result, setResult] = useState<ToolInvokeResponse | null>(null)

  const invoke = useInvokeTool()
  const isRunning = invoke.isPending

  const missingRequired = mode === 'form'
    ? validateRequired(tool.inputSchema, formValues)
    : []

  function handleFieldChange(key: string, value: unknown) {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setFormValues(buildDefaultValues(tool.inputSchema))
    setRawJson('{}')
    setResult(null)
    invoke.reset()
  }

  async function handleRun() {
    let args: Record<string, unknown> = {}

    if (mode === 'form') {
      // Strip undefined / empty string values for optional fields
      args = Object.fromEntries(
        Object.entries(formValues).filter(([, v]) => v !== undefined && v !== '')
      )
    } else {
      try {
        args = JSON.parse(rawJson)
        setJsonError(null)
      } catch {
        setJsonError('Invalid JSON — please fix before running.')
        return
      }
    }

    invoke.mutate(
      { serverId, body: { tool_name: tool.name, arguments: args } },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => {
          setResult({
            tool_name: tool.name,
            status: 'error',
            result: null,
            error: err instanceof Error ? err.message : 'Unknown error',
            duration_ms: 0,
            tool_call_id: '',
            truncated: false,
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="font-mono text-base text-foreground truncate">
                {tool.name}
              </DialogTitle>
              {tool.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              )}
            </div>
          </div>

          {/* Form / JSON toggle */}
          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={() => setMode('form')}
              className={cn(
                'px-3 py-1 rounded text-xs font-mono transition-colors',
                mode === 'form'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Form
            </button>
            <button
              onClick={() => setMode('json')}
              className={cn(
                'px-3 py-1 rounded text-xs font-mono transition-colors',
                mode === 'json'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Raw JSON
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Input section */}
          <div>
            {mode === 'form' ? (
              <SchemaForm
                schema={tool.inputSchema}
                values={formValues}
                onChange={handleFieldChange}
                disabled={isRunning}
              />
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Arguments (JSON)
                </p>
                <textarea
                  className={cn(
                    'w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2',
                    'text-xs font-mono text-foreground resize-y',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    jsonError && 'border-status-error',
                    isRunning && 'opacity-50 cursor-not-allowed'
                  )}
                  value={rawJson}
                  onChange={(e) => {
                    setRawJson(e.target.value)
                    setJsonError(null)
                  }}
                  disabled={isRunning}
                  spellCheck={false}
                />
                {jsonError && (
                  <p className="text-xs text-status-error font-mono">{jsonError}</p>
                )}
              </div>
            )}
          </div>

          {/* Missing required fields warning */}
          {missingRequired.length > 0 && (
            <p className="text-xs text-status-warning font-mono">
              Required: {missingRequired.join(', ')}
            </p>
          )}

          {/* Result panel */}
          {result && (
            <div className="space-y-3">
              <div className="h-px bg-border" />

              {/* Status + duration row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-status-healthy" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-status-error" />
                  )}
                  <Badge variant={result.status === 'success' ? 'healthy' : 'error'}>
                    {result.status}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {result.duration_ms.toFixed(1)} ms
                </span>
                {result.truncated && (
                  <Badge variant="warning" className="text-[10px]">truncated &gt;1MB</Badge>
                )}
                {result.tool_call_id && (
                  <a
                    href="/tools"
                    className="ml-auto text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    View in audit log <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Error message */}
              {result.error && (
                <div className="rounded-md border border-status-error/30 bg-status-error/5 px-3 py-2">
                  <p className="text-xs font-mono text-status-error break-all">{result.error}</p>
                </div>
              )}

              {/* Result JSON */}
              {result.result !== null && result.result !== undefined && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Result
                  </p>
                  <pre className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                    {typeof result.result === 'string'
                      ? result.result
                      : JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isRunning}
            className="gap-1.5 text-xs font-mono text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>

          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning || missingRequired.length > 0}
            className="gap-2 font-mono text-xs min-w-[80px]"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running…
              </>
            ) : (
              'Run'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
