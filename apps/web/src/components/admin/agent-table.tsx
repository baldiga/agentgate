'use client'

import Link from 'next/link'
import type { Agent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AgentTableProps {
  agents: Agent[]
  onDelete: (id: string) => void
}

export function AgentTable({ agents, onDelete }: AgentTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-surface/50">
              <td className="px-4 py-3 font-medium text-text-primary">{agent.name}</td>
              <td className="px-4 py-3 font-mono text-text-secondary">{agent.slug}</td>
              <td className="px-4 py-3">
                <Badge variant={agent.status === 'online' ? 'success' : 'default'}>
                  {agent.status === 'online' ? 'Online' : 'Offline'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{agent.description ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/agents/${agent.id}`} aria-label="edit" className="text-xs text-accent hover:underline">Edit</Link>
                  <Button variant="danger" size="sm" aria-label="delete" onClick={() => onDelete(agent.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
