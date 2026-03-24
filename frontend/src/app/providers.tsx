'use client'

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { WebSocketProvider } from '@/components/layout/WebSocketProvider'
import { DemoModeError } from '@/lib/demo-mode'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof DemoModeError) {
              toast.info('Not available in demo mode', {
                description: 'This action requires a live backend connection.',
                duration: 3000,
              })
            }
          },
        }),
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <WebSocketProvider />
      <Toaster position="bottom-right" theme="dark" richColors />
    </QueryClientProvider>
  )
}
