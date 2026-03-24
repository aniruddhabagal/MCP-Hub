import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0c0c0f',
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Amber radial glow behind icon */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: -70,
            marginLeft: -70,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(245,158,11,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Icon container */}
        <div
          style={{
            width: 80,
            height: 80,
            border: '1.5px solid rgba(245,158,11,0.4)',
            background: 'rgba(245,158,11,0.07)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <polyline
              points="22,12 18,12 15,21 9,3 6,12 2,12"
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  )
}
