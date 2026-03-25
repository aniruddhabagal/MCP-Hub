'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signup } = useAuth()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rawNext = searchParams.get('next')
  const next = rawNext && rawNext.startsWith('/') ? rawNext : null

  // Extract invite token from next param if it matches /invite/<token>
  const inviteTokenMatch = next?.match(/^\/invite\/([A-Za-z0-9_-]+)$/)
  const inviteToken = inviteTokenMatch ? inviteTokenMatch[1] : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup(email, displayName, password, inviteToken)
      // Backend auto-accepted invite → JWT already scoped to company workspace
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-3 py-2.5 rounded border border-status-error/30 bg-status-error/10">
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
          Display name
        </Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-secondary/50 border-border focus:border-primary/60 h-10 font-mono text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 font-mono text-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={loginHref} className="text-primary hover:text-primary/80 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
