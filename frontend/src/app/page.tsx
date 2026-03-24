import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mcp-hub.aniruddha.fyi'

export const metadata: Metadata = {
  title: 'MCPHub — MCP Server Registry, Health Monitor & Dashboard',
  description:
    'The ops layer MCP was missing. One dashboard to discover, monitor health, track tool calls, and audit analytics across all your MCP servers.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    url: siteUrl,
    title: 'MCPHub — MCP Server Registry, Health Monitor & Dashboard',
    description:
      'The ops layer MCP was missing. One dashboard to discover, monitor health, track tool calls, and audit analytics across all your MCP servers.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MCPHub',
  applicationCategory: 'DeveloperApplication',
  description:
    'MCP server registry, health monitor, and analytics dashboard. The ops layer for teams running multiple Model Context Protocol servers.',
  url: siteUrl,
  author: {
    '@type': 'Person',
    name: 'Aniruddha Bagal',
    url: 'https://aniruddha.fyi',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'MCP server registry and discovery',
    'Real-time health monitoring and uptime tracking',
    'Tool call audit log and proxy interception',
    'Usage analytics and latency histograms',
    'Alert rules and event notifications',
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
