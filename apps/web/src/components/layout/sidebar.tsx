'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Agent } from '@/lib/types'
import { Footer } from './footer'

interface SidebarProps {
  agents: Agent[]
}

export function Sidebar({ agents }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <span className="font-display text-lg font-bold text-text-primary">AgentGate</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted">Agents</p>
        {agents.map(agent => {
          const active = pathname === `/${agent.slug}`
          return (
            <Link
              key={agent.id}
              href={`/${agent.slug}`}
              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-accent/10 text-text-primary'
                  : agent.locked
                  ? 'cursor-not-allowed text-muted'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
              aria-disabled={agent.locked}
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                {agent.online && !agent.locked ? (
                  <span aria-label="online" className="h-2 w-2 rounded-full bg-online" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-border" />
                )}
              </span>
              <span className="flex-1 truncate">{agent.name}</span>
              {agent.locked && (
                <span aria-label="locked" className="text-muted">🔒</span>
              )}
            </Link>
          )
        })}
      </nav>

      <Footer />
    </aside>
  )
}
