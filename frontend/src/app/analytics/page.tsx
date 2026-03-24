'use client'

import { TopToolsChart } from '@/components/analytics/TopToolsChart'
import { LatencyHistogram } from '@/components/analytics/LatencyHistogram'
import { UsageHeatmap } from '@/components/analytics/UsageHeatmap'
import { ErrorRatesChart } from '@/components/analytics/ErrorRatesChart'

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          Usage trends, latency distributions, and error rates
        </p>
      </div>

      {/* Volume heatmap — full width */}
      <UsageHeatmap />

      {/* Top tools + error rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopToolsChart limit={10} />
        <ErrorRatesChart />
      </div>

      {/* Latency histogram — full width */}
      <LatencyHistogram />
    </div>
  )
}
