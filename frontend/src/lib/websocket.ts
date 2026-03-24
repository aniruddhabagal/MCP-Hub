'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WsMessage } from './types'

type ConnectionState = 'connecting' | 'connected' | 'disconnected'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? ''

const BASE_DELAY = 1_000
const MAX_DELAY = 30_000

export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryDelay = useRef(BASE_DELAY)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)

  const connect = useCallback(() => {
    // Skip if no WS URL configured (e.g. Vercel deployment without WebSocket support)
    if (!WS_URL || unmounted.current) return
    setConnectionState('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmounted.current) return
      setConnectionState('connected')
      retryDelay.current = BASE_DELAY
    }

    ws.onmessage = (event) => {
      if (unmounted.current) return
      try {
        const msg: WsMessage = JSON.parse(event.data)
        setLastMessage(msg)
      } catch {
        // ignore non-JSON frames
      }
    }

    ws.onclose = () => {
      if (unmounted.current) return
      setConnectionState('disconnected')
      wsRef.current = null
      // Reconnect with exponential backoff
      timerRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY)
        connect()
      }, retryDelay.current)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    unmounted.current = false
    connect()
    return () => {
      unmounted.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { lastMessage, connectionState }
}
