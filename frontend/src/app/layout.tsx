import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from 'next/font/google'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { Providers } from './providers'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex-sans',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mcp-hub.aniruddha.fyi'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MCPHub — MCP Server Monitor',
    template: '%s · MCPHub',
  },
  description:
    'The ops layer MCP was missing. Discover, monitor health, track tool calls, and audit analytics across all MCP servers.',
  keywords: [
    'MCP',
    'Model Context Protocol',
    'MCP server',
    'MCP monitoring',
    'MCP dashboard',
    'AI tool calls',
    'server health monitor',
    'ops dashboard',
    'LLM tooling',
    'agent observability',
  ],
  authors: [{ name: 'Aniruddha Bagal', url: 'https://aniruddha.fyi' }],
  creator: 'Aniruddha Bagal',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'MCPHub',
    title: 'MCPHub — MCP Server Monitor',
    description:
      'The ops layer MCP was missing. Monitor, audit, alert, and discover across all MCP servers in one dashboard.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MCPHub — MCP Server Registry, Health Monitor & Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCPHub — MCP Server Monitor',
    description:
      'The ops layer MCP was missing. Monitor, audit, alert, and discover across all MCP servers.',
    images: ['/twitter-card.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`dark ${plexSans.variable} ${plexMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  )
}
