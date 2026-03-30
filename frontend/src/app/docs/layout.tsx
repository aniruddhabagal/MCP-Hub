import type { ReactNode } from 'react'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider'
import { source } from '@/lib/docs-source'
import 'fumadocs-ui/style.css'
import './docs-theme.css'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: (
            <span className="font-serif italic text-base tracking-tight">
              MCPHub Docs
            </span>
          ),
          transparentMode: 'none',
        }}
        sidebar={{
          defaultOpenLevel: 1,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
