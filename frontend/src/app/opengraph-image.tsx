import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'MCPHub — MCP Server Registry, Health Monitor & Dashboard'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const [monoFont, serifFont] = await Promise.all([
    loadFont(
      'https://fonts.gstatic.com/s/ibmplexmono/v19/-F63fjptAgt5VM-kVkqdyU8n3pQP.woff'
    ),
    loadFont(
      'https://fonts.gstatic.com/s/instrumentserif/v1/Qw3PZQlNHBaD8vyI4YnydwHmNH9h.woff'
    ),
  ])

  const fonts: ConstructorParameters<typeof ImageResponse>[1]['fonts'] = []
  if (monoFont) fonts.push({ name: 'IBMPlexMono', data: monoFont, weight: 400, style: 'normal' })
  if (serifFont) fonts.push({ name: 'InstrumentSerif', data: serifFont, weight: 400, style: 'italic' })

  const bars = [35, 55, 42, 72, 58, 88, 64, 80, 70, 92, 78, 100]
  const servers = [
    { name: 'filesystem-server', latency: '42ms', status: 'healthy' },
    { name: 'github-mcp', latency: '128ms', status: 'healthy' },
    { name: 'postgres-mcp', latency: '89ms', status: 'warning' },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0c0c0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
        }}
      >
        {/* Amber ambient glow — top center */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: '50%',
            marginLeft: -400,
            width: 800,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(245,158,11,0.09) 0%, rgba(245,158,11,0.03) 45%, transparent 70%)',
          }}
        />

        {/* Subtle dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Left content — branding */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '56px 52px',
            width: 580,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo mark + wordmark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                border: '1px solid rgba(245,158,11,0.35)',
                background: 'rgba(245,158,11,0.08)',
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polyline
                  points="22,12 18,12 15,21 9,3 6,12 2,12"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 24,
                color: '#e8e8f0',
                fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
              }}
            >
              MCPHub
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'rgba(133,133,148,0.4)',
                fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                marginLeft: 6,
              }}
            >
              v0.1
            </span>
          </div>

          {/* Hero headline */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 18 }}>
            <span
              style={{
                fontSize: 56,
                color: '#e8e8f0',
                fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
                fontStyle: 'italic',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              The ops layer
            </span>
            <span
              style={{
                fontSize: 56,
                color: '#f59e0b',
                fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
                fontStyle: 'italic',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              MCP was missing.
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 15,
              color: 'rgba(133,133,148,0.85)',
              fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
              lineHeight: 1.65,
              marginBottom: 32,
              maxWidth: 440,
            }}
          >
            Monitor · Audit · Alert · Discover across all MCP
            servers in one dashboard.
          </p>

          {/* Status pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: '6 servers online', dot: '#22c55e' },
              { label: '99.2% uptime', dot: '#22c55e' },
              { label: '2,847 tool calls', dot: '#f59e0b' },
            ].map((pill) => (
              <div
                key={pill.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: '#111118',
                  border: '1px solid #26262f',
                  borderRadius: 7,
                  padding: '7px 13px',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: pill.dot,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: '#858594',
                    fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                  }}
                >
                  {pill.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            position: 'absolute',
            left: 580,
            top: 48,
            bottom: 48,
            width: 1,
            background: 'linear-gradient(to bottom, transparent, #26262f 20%, #26262f 80%, transparent)',
          }}
        />

        {/* Right — dashboard mock */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 620,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 44px 48px 52px',
          }}
        >
          <div
            style={{
              width: '100%',
              background: '#111118',
              border: '1px solid rgba(245,158,11,0.18)',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Panel header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: '#858594',
                  fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Dashboard
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: '#858594',
                    fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                    letterSpacing: '0.08em',
                  }}
                >
                  LIVE
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'SERVERS', value: '6', sub: '5 healthy' },
                { label: 'UPTIME', value: '99.2%', sub: '30d avg' },
                { label: 'TOOL CALLS', value: '2.8k', sub: 'last 24h' },
                { label: 'ALERTS', value: '1', sub: 'firing' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    flex: 1,
                    background: '#1a1a22',
                    border: '1px solid #26262f',
                    borderRadius: 8,
                    padding: '10px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: '#858594',
                      fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {stat.label}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      color: '#e8e8f0',
                      fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                      fontWeight: 500,
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: 'rgba(133,133,148,0.6)',
                      fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                    }}
                  >
                    {stat.sub}
                  </span>
                </div>
              ))}
            </div>

            {/* Bar chart — health overview */}
            <div
              style={{
                background: '#1a1a22',
                border: '1px solid #26262f',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: '#858594',
                  fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Health Overview — 12h
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 3,
                  height: 44,
                }}
              >
                {bars.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h * 0.85}%`,
                      background:
                        i >= 10
                          ? '#22c55e'
                          : `rgba(34,197,94,${0.18 + (i / 11) * 0.45})`,
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Server rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {servers.map((srv) => (
                <div
                  key={srv.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    background: '#1a1a22',
                    border: '1px solid #26262f',
                    borderRadius: 7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: srv.status === 'healthy' ? '#22c55e' : '#eab308',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: '#e8e8f0',
                        fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                      }}
                    >
                      {srv.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#f59e0b',
                      fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                    }}
                  >
                    {srv.latency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  )
}
