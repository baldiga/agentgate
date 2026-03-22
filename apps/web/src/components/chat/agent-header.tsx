'use client'

import type { Agent } from '@/lib/types'

interface AgentHeaderProps {
  agent: Agent
}

export function AgentHeader({ agent }: AgentHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-3">
      <div>
        <h2 className="font-display text-base font-semibold text-text-primary">{agent.name}</h2>
        <p className="text-xs text-muted">
          {agent.online ? (
            <span className="text-online">● Online</span>
          ) : (
            <span>● Offline</span>
          )}
          {agent.description ? ` · ${agent.description}` : ''}
        </p>
      </div>
    </div>
  )
}
