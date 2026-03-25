import { Suspense } from 'react'
import { Activity } from 'lucide-react'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = {
  title: 'Create account — MCPHub',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-surface border-r border-border flex-col p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-primary/40 bg-primary/10 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-serif italic text-xl text-foreground tracking-tight">MCPHub</span>
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
            Get started free
          </p>
          <h2 className="font-serif italic text-4xl text-foreground leading-tight mb-4">
            One workspace.<br />All your MCP<br />servers unified.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Create your workspace and invite your team. MCPHub gives you full
            observability over every MCP server your agents depend on.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Instant health monitoring — no config required',
              'Tool call audit trail with full payload capture',
              'Team workspaces with granular role management',
              'Real-time alerts via Slack or webhook',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] font-mono text-muted-foreground/40">
          © {new Date().getFullYear()} MCPHub
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded border border-primary/40 bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="font-serif italic text-xl text-foreground tracking-tight">MCPHub</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-serif italic text-2xl text-foreground mb-1.5">Create your account</h1>
            <p className="text-sm text-muted-foreground">A personal workspace is created automatically</p>
          </div>
          <Suspense><SignupForm /></Suspense>
        </div>
      </div>
    </div>
  )
}
