'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { toggleDemoMode, useDemoMode } from '@/lib/demo-mode'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const demo = useDemoMode()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = () => {
    if (!demo) {
      toggleDemoMode()
      queryClient.invalidateQueries()
    }
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-3 py-2.5 rounded border border-status-error/30 bg-status-error/10">
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-[0.12em]">
            Password
          </Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[0.12em]">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleDemo}
        className="w-full h-10 font-mono text-sm border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
      >
        Try demo mode
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Sign up
        </Link>
      </p>
    </form>
  )
}
