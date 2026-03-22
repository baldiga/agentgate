'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/lib/types'
import { AgentTable } from './agent-table'
import { Button } from '@/components/ui/button'
interface AgentsPageClientProps {
  initialAgents: Agent[]
}

export function AgentsPageClient({ initialAgents }: AgentsPageClientProps) {
  const router = useRouter()
  const [agents, setAgents] = useState(initialAgents)

  async function handleDelete(id: string) {
    if (!confirm('Delete this agent?')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push('/admin/agents/new')}>+ New Agent</Button>
      </div>
      <AgentTable agents={agents} onDelete={handleDelete} />
    </div>
  )
}
