'use client'

import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTopTools } from '@/lib/hooks'
import { formatLatency } from '@/lib/utils'

export function TopToolsWidget() {
  const { data: tools, isLoading } = useTopTools(6)

  const maxCalls = tools ? Math.max(...tools.map((t) => t.call_count), 1) : 1

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Top Tools
        </CardTitle>
        <Link
          href="/tools"
          className="text-[11px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          Full log <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-1.5 w-full" style={{ width: `${60 + i * 8}%` }} />
              </div>
            ))}
          </div>
        ) : !tools || tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">
              No tool calls logged yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Route traffic through the proxy to start
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tools.map((tool, i) => (
              <div key={`${tool.server_id}-${tool.tool_name}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground/60 w-4 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-sm font-mono text-foreground truncate">
                      {tool.tool_name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 truncate hidden xl:block">
                      · {tool.server_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    {tool.avg_latency_ms != null && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatLatency(tool.avg_latency_ms)}
                      </span>
                    )}
                    {tool.error_rate > 0 && (
                      <span className="text-[10px] font-mono text-status-error">
                        {(tool.error_rate * 100).toFixed(0)}% err
                      </span>
                    )}
                    <span className="text-xs font-mono text-foreground tabular-nums w-12 text-right">
                      {tool.call_count.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(tool.call_count / maxCalls) * 100}%`,
                      background:
                        tool.error_rate > 0.1
                          ? 'hsl(0 78% 58%)'
                          : 'hsl(38 92% 50%)',
                      opacity: 0.7 + 0.3 * (1 - i / tools.length),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
