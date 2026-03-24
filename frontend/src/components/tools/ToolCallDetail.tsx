'use client'

import { X, Clock, Zap, User, Server, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLatency, formatDateTime } from '@/lib/utils'
import type { ToolCall } from '@/lib/types'

interface ToolCallDetailProps {
  toolCall: ToolCall | null
  onClose: () => void
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="text-sm font-mono text-foreground break-all">{value}</div>
    </div>
  )
}

export function ToolCallDetail({ toolCall, onClose }: ToolCallDetailProps) {
  if (!toolCall) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] z-50 bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                toolCall.status === 'success'
                  ? 'bg-status-healthy animate-pulse-dot'
                  : 'bg-status-error animate-pulse-dot'
              }`}
            />
            <div>
              <h2 className="text-sm font-mono font-medium text-foreground">
                {toolCall.tool_name}
              </h2>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                {formatDateTime(toolCall.called_at)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status banner */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-mono ${
              toolCall.status === 'success'
                ? 'border-status-healthy/20 bg-status-healthy/5 text-status-healthy'
                : 'border-status-error/20 bg-status-error/5 text-status-error'
            }`}
          >
            {toolCall.status === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {toolCall.status === 'success' ? 'Completed successfully' : 'Execution failed'}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border border-border bg-background p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Duration
              </p>
              <p className="text-lg font-mono font-bold text-foreground tabular-nums">
                {formatLatency(toolCall.duration_ms)}
              </p>
            </div>
            <div className="rounded border border-border bg-background p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Output
              </p>
              <p className="text-lg font-mono font-bold text-foreground tabular-nums">
                {toolCall.output_size_bytes != null
                  ? `${(toolCall.output_size_bytes / 1024).toFixed(1)}KB`
                  : '—'}
              </p>
            </div>
            <div className="rounded border border-border bg-background p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Status
              </p>
              <p
                className={`text-lg font-mono font-bold tabular-nums ${
                  toolCall.status === 'success' ? 'text-status-healthy' : 'text-status-error'
                }`}
              >
                {toolCall.status}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <DetailRow
              label="Tool Name"
              value={
                <span className="text-primary">{toolCall.tool_name}</span>
              }
            />
            <DetailRow
              label="Caller Agent"
              value={toolCall.caller_agent ?? <span className="text-muted-foreground">—</span>}
            />
            <DetailRow
              label="Server ID"
              value={
                <span className="text-xs text-muted-foreground">{toolCall.server_id}</span>
              }
            />
            <DetailRow
              label="Call ID"
              value={
                <span className="text-xs text-muted-foreground">{toolCall.id}</span>
              }
            />
          </div>

          {/* Error */}
          {toolCall.error && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Error
              </p>
              <div className="rounded border border-status-error/20 bg-status-error/5 px-3 py-2">
                <p className="text-xs font-mono text-status-error leading-relaxed">
                  {toolCall.error}
                </p>
              </div>
            </div>
          )}

          {/* Input payload */}
          {toolCall.input_payload && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Input Payload
              </p>
              <pre className="rounded border border-border bg-background px-3 py-2.5 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(toolCall.input_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
