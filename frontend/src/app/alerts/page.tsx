import { AlertTriangle } from 'lucide-react'

export default function AlertsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
            Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Alert rules and event history
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-primary" />
        </div>
        <p className="text-foreground font-medium font-mono">Coming in Week 6</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          AlertRuleForm with metric/operator/threshold config and AlertHistoryTable
          — scheduled for the Week 6 sprint.
        </p>
      </div>
    </div>
  )
}
