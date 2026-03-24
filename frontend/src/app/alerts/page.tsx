'use client'

import { AlertRuleForm } from '@/components/alerts/AlertRuleForm'
import { AlertRulesTable } from '@/components/alerts/AlertRulesTable'
import { AlertHistoryTable } from '@/components/alerts/AlertHistoryTable'
import { useAlertEvents, useEvaluateAlerts } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function AlertsPage() {
  const evaluate = useEvaluateAlerts()
  const { data: events } = useAlertEvents({ state: 'firing' })
  const firingCount = events?.length ?? 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
            Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {firingCount > 0 ? (
              <span className="text-status-error">
                {firingCount} alert{firingCount !== 1 ? 's' : ''} firing
              </span>
            ) : (
              'Alert rules and event history'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => evaluate.mutate()}
            disabled={evaluate.isPending}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${evaluate.isPending ? 'animate-spin' : ''}`}
            />
            {evaluate.isPending ? 'Evaluating…' : 'Evaluate Now'}
          </Button>
          <AlertRuleForm />
        </div>
      </div>

      {/* Rules */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Alert Rules
        </h2>
        <AlertRulesTable />
      </section>

      {/* Event History */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Event History
        </h2>
        <AlertHistoryTable />
      </section>
    </div>
  )
}
