'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useWebSocket } from '@/lib/websocket'

export function WebSocketProvider() {
  const { lastMessage } = useWebSocket()

  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === 'alert_event') {
      if (lastMessage.state === 'fired') {
        toast.error(lastMessage.message ?? 'Alert fired', {
          description: lastMessage.rule_id
            ? `Rule: ${lastMessage.rule_id.slice(0, 8)}`
            : undefined,
          duration: 8_000,
        })
      } else if (lastMessage.state === 'resolved') {
        toast.success(lastMessage.message ?? 'Alert resolved', {
          description: lastMessage.rule_id
            ? `Rule: ${lastMessage.rule_id.slice(0, 8)}`
            : undefined,
          duration: 5_000,
        })
      }
    }
  }, [lastMessage])

  return null
}
