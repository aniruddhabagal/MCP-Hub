import { ImageResponse } from 'next/og'
import type { ImageResponseOptions } from 'next/server'

export const runtime = 'edge'
export const alt = 'MCPHub — Grafana for your MCP layer'
export const size = { width: 1200, height: 600 }
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

  const fonts: ImageResponseOptions['fonts'] = []
  if (monoFont) fonts.push({ name: 'IBMPlexMono', data: monoFont, weight: 400, style: 'normal' })
  if (serifFont) fonts.push({ name: 'InstrumentSerif', data: serifFont, weight: 400, style: 'italic' })

  const features = ['Server Registry', 'Health Monitor', 'Tool Call Audit', 'Analytics', 'Alerts']

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0c0c0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left amber glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(245,158,11,0.07) 0%, transparent 65%)',
          }}
        />

        {/* Right dim glow */}
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(34,197,94,0.04) 0%, transparent 65%)',
          }}
        />

        {/* Dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0 80px',
            width: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.08)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <polyline
                  points="22,12 18,12 15,21 9,3 6,12 2,12"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 20,
                color: '#e8e8f0',
                fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
                fontStyle: 'italic',
              }}
            >
              MCPHub
            </span>
          </div>

          {/* Tagline chip */}
          <div
            style={{
              display: 'flex',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#f59e0b',
                fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 5,
                padding: '5px 12px',
              }}
            >
              Grafana for your MCP layer
            </div>
          </div>

          {/* Big headline */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
            <span
              style={{
                fontSize: 72,
                color: '#e8e8f0',
                fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
                fontStyle: 'italic',
                lineHeight: 1.0,
                letterSpacing: '-0.025em',
              }}
            >
              The ops layer
            </span>
            <span
              style={{
                fontSize: 72,
                color: '#f59e0b',
                fontFamily: serifFont ? 'InstrumentSerif' : 'serif',
                fontStyle: 'italic',
                lineHeight: 1.0,
                letterSpacing: '-0.025em',
              }}
            >
              MCP was missing.
            </span>
          </div>

          {/* Feature chips row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {features.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#1a1a22',
                  border: '1px solid #26262f',
                  borderRadius: 6,
                  padding: '6px 12px',
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    opacity: 0.7,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: '#858594',
                    fontFamily: monoFont ? 'IBMPlexMono' : 'monospace',
                  }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom amber strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(to right, transparent, rgba(245,158,11,0.6) 30%, rgba(245,158,11,0.6) 70%, transparent)',
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  )
}
