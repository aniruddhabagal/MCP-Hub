'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateAlertRule, useServers } from '@/lib/hooks'
import type { AlertRuleCreate } from '@/lib/types'

const INITIAL: AlertRuleCreate = {
  name: '',
  metric: 'error_rate',
  operator: 'gt',
  threshold: 0.1,
  window_minutes: 60,
  enabled: true,
}

const METRIC_LABELS: Record<string, string> = {
  error_rate: 'Error Rate',
  latency_p95: 'Latency p95 (ms)',
  availability: 'Availability (%)',
}

const OPERATOR_LABELS: Record<string, string> = {
  gt: '> greater than',
  gte: '≥ greater or equal',
  lt: '< less than',
  lte: '≤ less or equal',
}

const METRIC_HINTS: Record<string, string> = {
  error_rate: 'e.g. 0.1 = 10%',
  latency_p95: 'e.g. 500 ms',
  availability: 'e.g. 95 = 95%',
}

export function AlertRuleForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AlertRuleCreate & { server_id?: string }>({ ...INITIAL })
  const [error, setError] = useState<string | null>(null)
  const create = useCreateAlertRule()
  const { data: servers } = useServers()

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Rule name is required.')
      return
    }
    const payload: AlertRuleCreate = {
      name: form.name.trim(),
      metric: form.metric,
      operator: form.operator,
      threshold: Number(form.threshold),
      window_minutes: Number(form.window_minutes),
      enabled: form.enabled ?? true,
    }
    if (form.server_id && form.server_id !== 'global') {
      payload.server_id = form.server_id
    }
    try {
      await create.mutateAsync(payload)
      setOpen(false)
      setForm({ ...INITIAL })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert rule.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setForm({ ...INITIAL })
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Rule
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
          <DialogDescription>
            Configure a threshold-based alert. MCPHub will fire an event and notify you when the condition is met.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Rule Name *</Label>
            <Input
              id="rule-name"
              placeholder="e.g. High error rate on prod"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Server (optional)</Label>
            <Select
              value={form.server_id ?? 'global'}
              onValueChange={(v) => set('server_id', v === 'global' ? undefined : v)}
            >
              <SelectTrigger className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global — all servers</SelectItem>
                {(servers ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Metric</Label>
              <Select
                value={form.metric}
                onValueChange={(v) =>
                  set('metric', v as AlertRuleCreate['metric'])
                }
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Operator</Label>
              <Select
                value={form.operator}
                onValueChange={(v) =>
                  set('operator', v as AlertRuleCreate['operator'])
                }
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="threshold">
                Threshold
                <span className="text-[10px] font-mono text-muted-foreground ml-2">
                  {METRIC_HINTS[form.metric]}
                </span>
              </Label>
              <Input
                id="threshold"
                type="number"
                step="any"
                value={form.threshold}
                onChange={(e) => set('threshold', parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="window">Window (minutes)</Label>
              <Input
                id="window"
                type="number"
                min={1}
                value={form.window_minutes}
                onChange={(e) => set('window_minutes', parseInt(e.target.value) || 60)}
                className="font-mono"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-status-error font-mono bg-status-error/10 border border-status-error/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
