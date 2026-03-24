'use client'

import { useEffect } from 'react'
import { Info } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  checkBackendHealth,
  setDemoMode,
  toggleDemoMode,
  useIsManualDemo,
} from '@/lib/demo-mode'

export function DemoBanner() {
  const isManual = useIsManualDemo()
  const queryClient = useQueryClient()

  // Auto-retry every 60s only when backend dropped (not manual)
  useEffect(() => {
    if (isManual) return
    const interval = setInterval(async () => {
      const alive = await checkBackendHealth()
      if (alive) {
        setDemoMode(false)
        queryClient.invalidateQueries()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [isManual, queryClient])

  async function handleRetry() {
    const alive = await checkBackendHealth()
    if (alive) {
      setDemoMode(false)
      queryClient.invalidateQueries()
    }
  }

  function handleExit() {
    toggleDemoMode()
    queryClient.invalidateQueries()
  }

  return (
    <div className="flex items-center justify-between px-5 py-2 bg-amber-500/10 border-b border-amber-500/20">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-mono text-amber-300">
          {isManual
            ? 'Demo mode — viewing sample data'
            : 'Live demo — backend not connected'}
        </span>
      </div>
      {isManual ? (
        <button
          onClick={handleExit}
          className="text-[10px] font-mono text-amber-400 hover:text-amber-200 underline underline-offset-2 transition-colors"
        >
          Exit demo
        </button>
      ) : (
        <button
          onClick={handleRetry}
          className="text-[10px] font-mono text-amber-400 hover:text-amber-200 underline underline-offset-2 transition-colors"
        >
          Retry connection
        </button>
      )}
    </div>
  )
}
