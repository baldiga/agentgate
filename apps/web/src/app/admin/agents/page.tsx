import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'
import { AgentsPageClient } from '@/components/admin/agents-page-client'

async function getAgents(token: string): Promise<Agent[]> {
  return apiFetch<Agent[]>('/api/agents', { headers: { Authorization: `Bearer ${token}` } })
}

export default async function AgentsPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const agents = await getAgents(token)
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Agents</h1>
      <AgentsPageClient initialAgents={agents} />
    </div>
  )
}
