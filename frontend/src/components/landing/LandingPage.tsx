'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Activity,
  Server,
  Zap,
  BarChart3,
  AlertTriangle,
  ArrowRight,
  Eye,
  Database,
  Github,
  Globe,
  Lock,
  FlaskConical,
  Shield,
  Key,
  UserCheck,
} from 'lucide-react'

const agents = [
  {
    icon: Server,
    name: 'Server Registry',
    desc: 'Catalog of all MCP servers with metadata, version, owner, and per-server auth credentials.',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
  },
  {
    icon: Activity,
    name: 'Health Prober',
    desc: 'On-demand pings measuring latency, error rate, and availability across every registered server.',
    color: 'text-[hsl(var(--status-healthy))]',
    bg: 'bg-[hsl(var(--status-healthy)/0.10)]',
    border: 'border-[hsl(var(--status-healthy)/0.20)]',
  },
  {
    icon: Zap,
    name: 'Tool Call Logger',
    desc: 'Intercepts every tool invocation through the transparent proxy — duration, output size, caller identity.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    icon: BarChart3,
    name: 'Usage Analytics',
    desc: 'Which tools get called most, by which agents, at what cost. Pre-aggregated hourly for instant queries.',
    color: 'text-[hsl(var(--status-warning))]',
    bg: 'bg-[hsl(var(--status-warning)/0.10)]',
    border: 'border-[hsl(var(--status-warning)/0.20)]',
  },
  {
    icon: AlertTriangle,
    name: 'Alert System',
    desc: 'Configurable rules fire when a server degrades or goes offline. Slack webhook + generic HTTP delivery.',
    color: 'text-[hsl(var(--status-error))]',
    bg: 'bg-[hsl(var(--status-error)/0.10)]',
    border: 'border-[hsl(var(--status-error)/0.20)]',
  },
  {
    icon: FlaskConical,
    name: 'Tool Playground',
    desc: 'Dynamically discover every tool a server exposes and invoke them interactively — all logged to the audit trail.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your workspace',
    desc: 'Sign up and get a personal workspace instantly. Invite team members with granular roles — member, admin, or owner.',
  },
  {
    number: '02',
    title: 'Register your servers',
    desc: 'Add MCP server endpoints with metadata, ownership, and optional per-server auth (bearer token, API key, or HTTP basic).',
  },
  {
    number: '03',
    title: 'Route through the proxy',
    desc: "Point your MCP clients to MCPHub's transparent proxy. Zero changes to existing servers. Every call is logged automatically.",
  },
  {
    number: '04',
    title: 'Monitor, test, and alert',
    desc: 'Live health status and tool call volume on the dashboard. Explore tools in the playground. Get alerted when servers degrade.',
  },
]

const mockServers = [
  { name: 'filesystem-mcp', status: 'healthy', latency: '2ms', calls: 1247, auth: false },
  { name: 'github-mcp', status: 'healthy', latency: '18ms', calls: 891, auth: true },
  { name: 'postgres-mcp', status: 'warning', latency: '124ms', calls: 432, auth: true },
  { name: 'slack-mcp', status: 'healthy', latency: '34ms', calls: 203, auth: false },
]

const roles = [
  {
    icon: UserCheck,
    level: 'L1',
    name: 'Member',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
    perms: ['View dashboard & servers', 'Browse tool calls & analytics', 'Read alert history'],
  },
  {
    icon: Shield,
    level: 'L2',
    name: 'Admin / Owner',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    perms: ['Register & edit servers', 'Invoke tools in Playground', 'Manage members & invites', 'Create API keys'],
  },
  {
    icon: Key,
    level: 'API',
    name: 'API Access',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    perms: ['Workspace-scoped API keys', 'Bearer token or X-API-Key header', 'Same permissions as issuing role', 'Revocable at any time'],
  },
]

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let lenis: any
    let ctx: any
    let gsapRef: any
    let rafCb: ((t: number) => void) | null = null
    let cancelled = false
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const init = async () => {
      const Lenis = (await import('lenis')).default
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')

      if (cancelled) return

      gsapRef = gsap
      gsap.registerPlugin(ScrollTrigger)

      lenis = new Lenis({ lerp: 0.08, smoothWheel: true, autoRaf: false })
      lenis.on('scroll', ScrollTrigger.update)

      rafCb = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(rafCb)
      gsap.ticker.lagSmoothing(0)

      ctx = gsap.context(() => {
        gsap.set('.hero-tag', { opacity: 0, y: 16 })
        gsap.set('.hero-word', { opacity: 0, y: 80 })
        gsap.set('.hero-desc', { opacity: 0, y: 24 })
        gsap.set('.hero-cta > *', { opacity: 0, y: 20 })
        gsap.set('.hero-preview', { opacity: 0, y: 50 })

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.to('.hero-tag', { opacity: 1, y: 0, duration: 0.6 }, 0.15)
          .to('.hero-word', { opacity: 1, y: 0, duration: 1, stagger: 0.07 }, 0.35)
          .to('.hero-desc', { opacity: 1, y: 0, duration: 0.7 }, '-=0.65')
          .to('.hero-cta > *', { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 }, '-=0.45')
          .to('.hero-preview', { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, '-=0.7')

        gsap.to('.deco-orb', {
          scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
          y: -160,
          ease: 'none',
        })

        gsap.utils.toArray<HTMLElement>('.reveal-up').forEach((el) => {
          gsap.set(el, { opacity: 0, y: 50 })
          gsap.to(el, {
            scrollTrigger: { trigger: el, start: 'top 83%' },
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: 'power3.out',
          })
        })

        gsap.utils.toArray<HTMLElement>('.reveal-stagger').forEach((el) => {
          const children = el.querySelectorAll('.stagger-child')
          gsap.set(children, { opacity: 0, y: 60 })
          gsap.to(children, {
            scrollTrigger: { trigger: el, start: 'top 76%' },
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
          })
        })

        gsap.utils.toArray<HTMLElement>('.clip-reveal').forEach((el) => {
          gsap.set(el, { clipPath: 'inset(0 100% 0 0)' })
          gsap.to(el, {
            scrollTrigger: { trigger: el, start: 'top 82%' },
            clipPath: 'inset(0 0% 0 0)',
            duration: 0.9,
            ease: 'power3.inOut',
          })
        })
      }, containerRef)
    }

    init()

    return () => {
      cancelled = true
      if (rafCb && gsapRef) gsapRef.ticker.remove(rafCb)
      if (lenis) lenis.destroy()
      if (ctx) ctx.revert()
    }
  }, [])

  return (
    <div ref={containerRef} className="bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-8 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded border border-primary/40 bg-primary/10 flex items-center justify-center">
            <Activity className="w-3 h-3 text-primary" />
          </div>
          <span className="font-serif italic text-base text-foreground tracking-tight">MCPHub</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 text-xs font-mono bg-primary text-primary-foreground px-3.5 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Get started
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero-section relative min-h-screen flex flex-col items-center justify-center pt-14 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="deco-orb absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

        {/* Fine grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(240 10% 92%) 1px, transparent 1px), linear-gradient(to bottom, hsl(240 10% 92%) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Pulsing corner dots */}
        {[
          'top-24 left-12',
          'top-24 right-12',
          'bottom-16 left-12',
          'bottom-16 right-12',
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} w-1 h-1 rounded-full bg-primary/40 animate-pulse-dot pointer-events-none`}
          />
        ))}

        <div className="relative z-10 max-w-5xl mx-auto w-full text-center">
          {/* Tag line */}
          <div className="hero-tag inline-flex items-center gap-3 mb-10">
            <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-[0.32em] text-muted-foreground">
              Monitor · Audit · Alert · Discover · Collaborate
            </span>
            <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
          </div>

          {/* Headline */}
          <div className="mb-2">
            <div className="overflow-hidden">
              <h1 className="font-serif italic text-[clamp(3.2rem,8.5vw,7.2rem)] leading-[0.9] tracking-tight text-foreground">
                <span className="hero-word inline-block">The&nbsp;ops&nbsp;layer</span>
              </h1>
            </div>
            <div className="overflow-hidden">
              <h1 className="font-serif italic text-[clamp(3.2rem,8.5vw,7.2rem)] leading-[0.9] tracking-tight text-primary">
                <span className="hero-word inline-block">MCP&nbsp;was&nbsp;missing.</span>
              </h1>
            </div>
          </div>

          {/* Sub-headline */}
          <p className="hero-desc max-w-[540px] mx-auto text-base text-muted-foreground leading-relaxed mt-7 mb-10">
            Teams run 10–20 MCP servers with no visibility into which are slow,
            which fail silently, or which tools are called most.
            MCPHub is the control plane they&apos;re missing — with multi-tenant workspaces,
            per-server auth, and a live tool playground.
          </p>

          {/* CTAs */}
          <div className="hero-cta flex items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-mono px-6 py-3 rounded accent-glow hover:bg-primary/90 transition-all duration-200"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-sm font-mono text-muted-foreground px-6 py-3 rounded border border-border hover:border-primary/30 hover:text-foreground transition-all duration-200"
            >
              How it works
            </a>
          </div>

          {/* Dashboard preview mockup */}
          <div className="hero-preview max-w-3xl mx-auto">
            <div className="rounded-xl border border-border bg-card card-glow overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface/60">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-error)/0.5)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-warning)/0.5)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-healthy)/0.5)]" />
                </div>
                <div className="flex-1 mx-3 h-5 rounded bg-background/60 flex items-center px-3">
                  <span className="text-[9px] font-mono text-muted-foreground/50">
                    mcphub.aniruddha.fyi/dashboard
                  </span>
                </div>
                {/* Workspace pill */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/60 bg-background/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-[8px] font-mono text-muted-foreground/60">acme-engineering</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="p-4 grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Servers', value: '14', color: 'text-foreground' },
                  { label: 'Healthy', value: '12', color: 'text-[hsl(var(--status-healthy))]' },
                  { label: 'Tool Calls (24h)', value: '2,847', color: 'text-primary' },
                  { label: 'Avg Latency', value: '23ms', color: 'text-foreground' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-background/50 border border-border/40 p-3"
                  >
                    <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                      {stat.label}
                    </p>
                    <p className={`text-lg font-mono font-medium ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Server table */}
              <div className="px-4 pb-4">
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 px-3 py-2 border-b border-border/40 bg-surface/40">
                    {['Server', 'Auth', 'Status', 'Latency', 'Calls (24h)'].map((h) => (
                      <span
                        key={h}
                        className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {mockServers.map((s, i) => (
                    <div
                      key={s.name}
                      className={`grid grid-cols-5 gap-4 px-3 py-2 text-[11px] font-mono ${
                        i < mockServers.length - 1 ? 'border-b border-border/30' : ''
                      }`}
                    >
                      <span className="text-foreground/75 truncate">{s.name}</span>
                      <span className="flex items-center">
                        {s.auth ? (
                          <Lock className="w-2.5 h-2.5 text-primary/60" />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            s.status === 'healthy'
                              ? 'bg-[hsl(var(--status-healthy))] animate-pulse-dot'
                              : 'bg-[hsl(var(--status-warning))]'
                          }`}
                        />
                        <span
                          className={
                            s.status === 'healthy'
                              ? 'text-[hsl(var(--status-healthy))]'
                              : 'text-[hsl(var(--status-warning))]'
                          }
                        >
                          {s.status}
                        </span>
                      </span>
                      <span className="text-muted-foreground">{s.latency}</span>
                      <span className="text-muted-foreground">{s.calls.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────── */}
      <section className="border-y border-border py-12 px-6 bg-surface/20">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-stagger grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '∞', label: 'Servers Supported', sub: 'unlimited' },
              { value: '100%', label: 'Tool Calls Captured', sub: 'via transparent proxy' },
              { value: '3', label: 'Access Levels', sub: 'member · admin · owner' },
              { value: '<1s', label: 'Real-time Latency', sub: 'WebSocket push' },
            ].map((stat) => (
              <div key={stat.label} className="stagger-child">
                <p className="text-3xl font-mono font-medium text-primary mb-1">{stat.value}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <span className="clip-reveal inline-block text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
            The Problem
          </span>
          <h2 className="reveal-up font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-foreground mb-5 max-w-2xl">
            MCP went from zero to ubiquitous in 8 months.
          </h2>
          <p className="reveal-up text-base text-muted-foreground max-w-xl leading-relaxed mb-16">
            The protocol is everywhere. The tooling layer doesn&apos;t exist yet. Teams manage their
            MCP servers the same way they managed servers before Kubernetes — manually, with prayer.
          </p>

          <div className="reveal-stagger grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Eye,
                title: 'Zero visibility',
                desc: 'No way to know which servers are slow, which fail silently, or which tools are called most.',
              },
              {
                icon: AlertTriangle,
                title: 'Silent failures',
                desc: 'Servers degrade. Latency spikes. Error rates climb. Nobody knows until users start complaining.',
              },
              {
                icon: Database,
                title: 'Ad hoc management',
                desc: 'No registry. No audit trail. No cost visibility. Just scattered configs and tribal knowledge.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="stagger-child rounded-xl border border-border bg-card p-6 card-glow"
              >
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--status-error)/0.10)] border border-[hsl(var(--status-error)/0.20)] flex items-center justify-center mb-4">
                  <item.icon className="w-4 h-4 text-[hsl(var(--status-error))]" />
                </div>
                <h3 className="text-sm font-mono font-medium text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTS ───────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-surface/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <span className="clip-reveal inline-block text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
            Agents
          </span>
          <h2 className="reveal-up font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-foreground mb-4 max-w-2xl">
            Six agents. One control plane.
          </h2>
          <p className="reveal-up text-base text-muted-foreground max-w-xl leading-relaxed mb-16">
            Each agent handles a specific layer of the ops stack. Together they give you complete
            coverage of your MCP infrastructure — from discovery to alerting to interactive testing.
          </p>

          <div className="reveal-stagger grid md:grid-cols-3 gap-5">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className={`stagger-child rounded-xl border bg-card p-6 card-glow transition-all duration-300 hover:-translate-y-1 ${agent.border}`}
              >
                <div
                  className={`w-9 h-9 rounded-lg ${agent.bg} border ${agent.border} flex items-center justify-center mb-4`}
                >
                  <agent.icon className={`w-4 h-4 ${agent.color}`} />
                </div>
                <h3 className="text-sm font-mono font-medium text-foreground mb-2">{agent.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM WORKSPACES ──────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <span className="clip-reveal inline-block text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
            Multi-Tenant
          </span>
          <h2 className="reveal-up font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-foreground mb-4 max-w-2xl">
            Built for teams.
          </h2>
          <p className="reveal-up text-base text-muted-foreground max-w-xl leading-relaxed mb-16">
            Full workspace isolation with granular access levels. Invite teammates, manage API keys,
            and keep every team&apos;s data strictly scoped — all the way down to the Redis cache prefix.
          </p>

          <div className="reveal-stagger grid md:grid-cols-3 gap-5 mb-12">
            {roles.map((role) => (
              <div
                key={role.name}
                className={`stagger-child rounded-xl border ${role.border} bg-card p-6 card-glow`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-9 h-9 rounded-lg ${role.bg} border ${role.border} flex items-center justify-center`}
                  >
                    <role.icon className={`w-4 h-4 ${role.color}`} />
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${role.color} opacity-60`}>
                    {role.level}
                  </span>
                </div>
                <h3 className="text-sm font-mono font-medium text-foreground mb-3">{role.name}</h3>
                <ul className="space-y-1.5">
                  {role.perms.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${role.color} opacity-60`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Per-server auth callout */}
          <div className="reveal-up rounded-xl border border-border bg-card p-6 card-glow">
            <div className="flex items-start gap-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Key className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-medium text-foreground mb-2">
                  Per-server auth configuration
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Each MCP server can be configured with its own auth credentials — bearer token, API key header,
                  or HTTP basic auth. Credentials are masked in responses and forwarded transparently by the proxy
                  and health prober. No changes to existing server infrastructure required.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Bearer token', 'API key header', 'HTTP basic auth'].map((method) => (
                    <span
                      key={method}
                      className="text-[10px] font-mono text-primary/70 bg-primary/5 border border-primary/10 px-2.5 py-1 rounded"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOL PLAYGROUND ──────────────────────────────────── */}
      <section className="py-24 px-6 bg-surface/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <span className="clip-reveal inline-block text-[10px] font-mono uppercase tracking-[0.3em] text-violet-400 mb-4">
            Tool Playground
          </span>
          <h2 className="reveal-up font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-foreground mb-4 max-w-2xl">
            Discover and test every tool — live.
          </h2>
          <p className="reveal-up text-base text-muted-foreground max-w-xl leading-relaxed mb-16">
            MCPHub dynamically fetches the full tool manifest from any registered server via JSON-RPC{' '}
            <code className="text-[11px] bg-surface/60 border border-border/50 px-1.5 py-0.5 rounded font-mono">
              tools/list
            </code>
            , renders each tool&apos;s JSON Schema as an interactive form, and lets admins invoke them
            — all logged to the audit trail as{' '}
            <code className="text-[11px] bg-surface/60 border border-border/50 px-1.5 py-0.5 rounded font-mono">
              mcphub-playground
            </code>.
          </p>

          <div className="reveal-stagger grid md:grid-cols-3 gap-5">
            {[
              {
                icon: FlaskConical,
                title: 'Dynamic discovery',
                desc: 'Fetches the live tool list from any server on demand. Results are Redis-cached for 5 minutes with a manual refresh option.',
                color: 'text-violet-400',
                bg: 'bg-violet-400/10',
                border: 'border-violet-400/20',
              },
              {
                icon: Zap,
                title: 'Interactive invocation',
                desc: 'JSON Schema input fields are rendered as a form automatically. Raw JSON mode available for complex nested schemas.',
                color: 'text-primary',
                bg: 'bg-primary/10',
                border: 'border-primary/20',
              },
              {
                icon: Database,
                title: 'Full audit trail',
                desc: 'Every playground invocation is logged to tool_calls with caller_agent="mcphub-playground" — visible in the audit log immediately.',
                color: 'text-sky-400',
                bg: 'bg-sky-400/10',
                border: 'border-sky-400/20',
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`stagger-child rounded-xl border ${item.border} bg-card p-6 card-glow transition-all duration-300 hover:-translate-y-1`}
              >
                <div
                  className={`w-9 h-9 rounded-lg ${item.bg} border ${item.border} flex items-center justify-center mb-4`}
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <h3 className="text-sm font-mono font-medium text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Flow diagram */}
          <div className="reveal-up mt-10 rounded-xl border border-violet-400/20 bg-card p-8 card-glow">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-6 text-center">
              Tool Playground request flow
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { label: 'ToolsTab', sub: 'GET /servers/{id}/tools', accent: false },
                null,
                { label: 'MCPHub Backend', sub: 'Redis-cached 5min', accent: true, violet: true },
                null,
                { label: 'MCP Server', sub: 'tools/list · tools/call', accent: false },
              ].map((node, i) =>
                node === null ? (
                  <div key={i} className="flex items-center gap-1 text-muted-foreground/30">
                    <div className="w-8 h-px bg-border" />
                    <span className="text-xs">→</span>
                  </div>
                ) : (
                  <div
                    key={node.label}
                    className={`text-center px-5 py-3 rounded-lg border ${
                      node.violet
                        ? 'border-violet-400/30 bg-violet-400/10'
                        : node.accent
                        ? 'border-primary/30 bg-primary/10 accent-glow'
                        : 'border-border bg-surface/50'
                    }`}
                  >
                    <p
                      className={`text-xs font-mono font-medium mb-0.5 ${
                        node.violet ? 'text-violet-400' : node.accent ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {node.label}
                    </p>
                    <p className="text-[9px] font-mono text-muted-foreground">{node.sub}</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <span className="clip-reveal inline-block text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
            Architecture
          </span>
          <h2 className="reveal-up font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-foreground mb-4 max-w-2xl">
            How it works.
          </h2>
          <p className="reveal-up text-base text-muted-foreground max-w-xl leading-relaxed mb-16">
            MCPHub sits as a transparent reverse proxy in front of your MCP servers. Zero changes
            required to existing infrastructure.
          </p>

          <div className="reveal-stagger grid md:grid-cols-2 gap-8 mb-16">
            {steps.map((step) => (
              <div key={step.number} className="stagger-child flex gap-5">
                <div className="flex-shrink-0 w-14">
                  <span className="text-[2.8rem] font-mono font-medium text-primary/15 leading-none select-none">
                    {step.number}
                  </span>
                </div>
                <div className="pt-1.5">
                  <h3 className="text-sm font-mono font-medium text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture diagram */}
          <div className="reveal-up rounded-xl border border-border bg-card p-8 card-glow">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-6 text-center">
              Request flow
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { label: 'MCP Client', sub: 'Claude / Agent', accent: false },
                null,
                { label: 'MCPHub Proxy', sub: '/proxy/{id}/mcp', accent: true },
                null,
                { label: 'MCP Server', sub: 'filesystem / github', accent: false },
              ].map((node, i) =>
                node === null ? (
                  <div key={i} className="flex items-center gap-1 text-muted-foreground/30">
                    <div className="w-8 h-px bg-border" />
                    <span className="text-xs">→</span>
                  </div>
                ) : (
                  <div
                    key={node.label}
                    className={`text-center px-5 py-3 rounded-lg border ${
                      node.accent
                        ? 'border-primary/30 bg-primary/10 accent-glow'
                        : 'border-border bg-surface/50'
                    }`}
                  >
                    <p
                      className={`text-xs font-mono font-medium mb-0.5 ${
                        node.accent ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {node.label}
                    </p>
                    <p className="text-[9px] font-mono text-muted-foreground">{node.sub}</p>
                  </div>
                )
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-border flex items-center justify-center gap-10 flex-wrap">
              {[
                { label: 'PostgreSQL', sub: 'audit log + analytics' },
                { label: 'Redis', sub: 'pub/sub · streams · cache' },
                { label: 'WebSocket', sub: 'real-time push' },
                { label: 'JWT + API Keys', sub: 'workspace-scoped auth' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-[10px] font-mono text-muted-foreground/50">{item.label}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/25">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.05] blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center reveal-up">
          <span className="inline-block text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-6">
            Get Started
          </span>
          <h2 className="font-serif italic text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[0.92] tracking-tight text-foreground mb-4">
            Start monitoring your
          </h2>
          <h2 className="font-serif italic text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[0.92] tracking-tight text-primary mb-8">
            MCP layer today.
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
            The gap is wide open. Be the team with visibility before everyone else catches up.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-mono px-8 py-4 rounded-lg accent-glow hover:bg-primary/90 transition-all duration-200"
            >
              Create free workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground px-8 py-4 rounded-lg border border-border hover:border-primary/30 hover:text-foreground transition-all duration-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-border py-7 px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
              <Activity className="w-2.5 h-2.5 text-primary" />
            </div>
            <span className="font-serif italic text-sm text-foreground">MCPHub</span>
            <span className="text-[10px] font-mono text-muted-foreground/30 ml-2">v0.2</span>
          </div>

          {/* Made by */}
          <p className="text-[11px] font-mono text-muted-foreground/50 flex items-center gap-1.5">
            Made with{' '}
            <span className="text-red-400/70">❤️</span>
            {' '}by{' '}
            <a
              href="https://aniruddha.fyi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/70 hover:text-primary transition-colors duration-200 inline-flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              Aniruddha Bagal
            </a>
          </p>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aniruddhabagal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/40 hover:text-primary transition-colors duration-200"
              aria-label="GitHub"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://aniruddha.fyi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/40 hover:text-primary transition-colors duration-200"
              aria-label="Portfolio"
            >
              <Globe className="w-3.5 h-3.5" />
            </a>
            <span className="text-[10px] font-mono text-muted-foreground/25">
              Grafana for your MCP layer
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
