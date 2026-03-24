import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from 'next/font/google'
import { Sidebar } from '@/components/layout/Sidebar'
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

export const metadata: Metadata = {
  title: {
    default: 'MCPHub — MCP Server Monitor',
    template: '%s · MCPHub',
  },
  description:
    'Central dashboard to discover, monitor health, track tool calls, and audit analytics across all MCP servers.',
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
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-56 flex-1 min-w-0">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
