'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Activity, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading, acceptInvite } = useAuth()
  const token = params.token as string

  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Auto-accept once we know auth state
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return  // Wait — user needs to log in first
    if (state !== 'idle') return

    let timeoutId: ReturnType<typeof setTimeout>
    const accept = async () => {
      setState('loading')
      try {
        await acceptInvite(token)
        setState('success')
        timeoutId = setTimeout(() => router.push('/dashboard'), 2000)
      } catch (err) {
        setState('error')
        setErrorMsg(err instanceof Error ? err.message : 'Failed to accept invitation')
      }
    }
    accept()
    return () => clearTimeout(timeoutId)
  }, [isAuthenticated, isLoading, token, state, router, acceptInvite])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-8 h-8 rounded border border-primary/40 bg-primary/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-primary" />
        </div>
        <span className="font-serif italic text-xl text-foreground tracking-tight">MCPHub</span>
      </div>

      <div className="w-full max-w-sm bg-surface border border-border rounded p-8 text-center">
        {/* States */}
        {(isLoading || state === 'loading') && (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <h1 className="font-serif italic text-xl text-foreground mb-2">Accepting invitation…</h1>
            <p className="text-sm text-muted-foreground">Just a moment</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-8 h-8 text-status-healthy mx-auto mb-4" />
            <h1 className="font-serif italic text-xl text-foreground mb-2">You&apos;re in!</h1>
            <p className="text-sm text-muted-foreground">Invitation accepted. Redirecting to dashboard…</p>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-8 h-8 text-status-error mx-auto mb-4" />
            <h1 className="font-serif italic text-xl text-foreground mb-2">Invitation failed</h1>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        )}

        {/* Not logged in */}
        {!isLoading && !isAuthenticated && state === 'idle' && (
          <>
            <div className="w-10 h-10 rounded border border-border bg-secondary/40 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <h1 className="font-serif italic text-xl text-foreground mb-2">Workspace invitation</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in or create an account to accept this invitation.
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full font-mono text-sm">
                <Link href={`/login?next=/invite/${token}`}>Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="w-full font-mono text-sm">
                <Link href={`/signup?next=/invite/${token}`}>Create account</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
