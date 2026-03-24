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
} from 'lucide-react'

const agents = [
  {
    icon: Server,
    name: 'Server Registry',
    desc: "Catalog of all MCP servers with metadata, version, and owner. One place to discover what's running.",
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
]

const steps = [
  {
    number: '01',
    title: 'Register your servers',
    desc: 'Add MCP server endpoints to the registry. MCPHub stores metadata, ownership, and connection details.',
  },
  {
    number: '02',
    title: 'Route through the proxy',
    desc: "Point your MCP clients to MCPHub's transparent proxy. Zero changes to your existing servers required.",
  },
  {
    number: '03',
    title: 'Monitor in real-time',
    desc: 'Watch live health status, tool call volume, and latency on the dashboard via WebSocket push.',
  },
  {
    number: '04',
    title: 'Get alerted on failures',
    desc: 'Configurable alert rules fire via Slack or webhook when servers degrade or go offline.',
  },
]

const mockServers = [
  { name: 'filesystem-mcp', status: 'healthy', latency: '2ms', calls: 1247 },
  { name: 'github-mcp', status: 'healthy', latency: '18ms', calls: 891 },
  { name: 'postgres-mcp', status: 'warning', latency: '124ms', calls: 432 },
  { name: 'slack-mcp', status: 'healthy', latency: '34ms', calls: 203 },
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

      // Guard: if React strict-mode already unmounted us while we were
      // awaiting the dynamic imports, bail out — don't create orphaned
      // Lenis / GSAP instances.
      if (cancelled) return

      gsapRef = gsap
      gsap.registerPlugin(ScrollTrigger)

      // autoRaf: false — GSAP's ticker drives Lenis; without this flag
      // Lenis also runs its own RAF loop → double-update conflicts.
      lenis = new Lenis({ lerp: 0.08, smoothWheel: true, autoRaf: false })
      lenis.on('scroll', ScrollTrigger.update)

      rafCb = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(rafCb)
      gsap.ticker.lagSmoothing(0)

      ctx = gsap.context(() => {
        // ── Hero entrance ────────────────────────────────────────
        // set() + to() instead of from() — explicit start & end values
        // so React strict-mode double-fire can't read a mid-animation
        // intermediate value as the target.
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

        // ── Parallax orb ─────────────────────────────────────────
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

        // ── Scroll reveals: set() + to() ─────────────────────────
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

        // ── Stagger containers ───────────────────────────────────
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

        // ── Clip-path wipe on section labels ─────────────────────
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
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-mono bg-primary text-primary-foreground px-3.5 py-2 rounded hover:bg-primary/90 transition-colors"
        >
          Open Dashboard
          <ArrowRight className="w-3 h-3" />
        </Link>
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
              Monitor · Audit · Alert · Discover
            </span>
            <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
          </div>

          {/* Headline — each word wraps in overflow:hidden for masked slide-up */}
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
          <p className="hero-desc max-w-[520px] mx-auto text-base text-muted-foreground leading-relaxed mt-7 mb-10">
            Teams run 10–20 MCP servers with no visibility into which are slow,
            which fail silently, or which tools are called most.
            MCPHub is the control plane they&apos;re missing.
          </p>

          {/* CTAs */}
          <div className="hero-cta flex items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-mono px-6 py-3 rounded accent-glow hover:bg-primary/90 transition-all duration-200"
            >
              Open Dashboard
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
                    mcphub.dev/dashboard
                  </span>
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
                  <div className="grid grid-cols-4 gap-4 px-3 py-2 border-b border-border/40 bg-surface/40">
                    {['Server', 'Status', 'Latency', 'Calls (24h)'].map((h) => (
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
                      className={`grid grid-cols-4 gap-4 px-3 py-2 text-[11px] font-mono ${
                        i < mockServers.length - 1 ? 'border-b border-border/30' : ''
                      }`}
                    >
                      <span className="text-foreground/75 truncate">{s.name}</span>
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
              { value: '<1s', label: 'Real-time Latency', sub: 'WebSocket push' },
              { value: '<5s', label: 'Alert Delivery', sub: 'Slack + webhook' },
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
            Five agents. One control plane.
          </h2>
          <p className="reveal-up text-base text-muted-foreground max-w-xl leading-relaxed mb-16">
            Each agent handles a specific layer of the ops stack. Together they give you complete
            coverage of your MCP infrastructure — from discovery to alerting.
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

            {/* Placeholder to complete 3-col grid (5 agents → 6th cell) */}
            <div className="stagger-child rounded-xl border border-dashed border-border/30 bg-card/30 p-6 flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/30">
                More in v0.2
              </span>
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
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-mono px-8 py-4 rounded-lg accent-glow hover:bg-primary/90 transition-all duration-200"
          >
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
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
            <span className="text-[10px] font-mono text-muted-foreground/30 ml-2">v0.1</span>
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
