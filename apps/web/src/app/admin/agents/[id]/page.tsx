import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { Agent, Role, Permission } from '@/lib/types'
import { AgentConfigTabs } from '@/components/admin/agent-config-tabs'

export default async function AgentConfigPage({ params }: { params: { id: string } }) {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const headers = { Authorization: `Bearer ${token}` }

  try {
    const [agent, roles, permissions] = await Promise.all([
      apiFetch<Agent>(`/api/agents/${params.id}`, { headers }),
      apiFetch<Role[]>('/api/roles', { headers }),
      apiFetch<Permission[]>(`/api/agents/${params.id}/permissions`, { headers }),
    ])
    return (
      <div>
        <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">{agent.name}</h1>
        <AgentConfigTabs agent={agent} roles={roles} permissions={permissions} />
      </div>
    )
  } catch {
    notFound()
  }
}
