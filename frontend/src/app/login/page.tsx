import { Suspense } from 'react'
import { Activity } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Sign in — MCPHub',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-surface border-r border-border flex-col p-10 relative overflow-hidden">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Decorative glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-primary/40 bg-primary/10 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-serif italic text-xl text-foreground tracking-tight">MCPHub</span>
        </div>

        {/* Centre copy */}
        <div className="relative flex-1 flex flex-col justify-center">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
            MCP Operations Layer
          </p>
          <h2 className="font-serif italic text-4xl text-foreground leading-tight mb-4">
            The control plane<br />your MCP stack<br />has been missing.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Health monitoring, tool call auditing, real-time alerts, and analytics
            across every MCP server in your organisation.
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { label: 'Servers tracked', value: '20+' },
              { label: 'Uptime visibility', value: '99.9%' },
              { label: 'Tool calls audited', value: '∞' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="px-3 py-1.5 rounded border border-border bg-secondary/40 flex items-center gap-2"
              >
                <span className="text-sm font-mono font-medium text-primary">{value}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-[10px] font-mono text-muted-foreground/40">
          © {new Date().getFullYear()} MCPHub
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded border border-primary/40 bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="font-serif italic text-xl text-foreground tracking-tight">MCPHub</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-serif italic text-2xl text-foreground mb-1.5">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>
          <Suspense><LoginForm /></Suspense>
        </div>
      </div>
    </div>
  )
}
