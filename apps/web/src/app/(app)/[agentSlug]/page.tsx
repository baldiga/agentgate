import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'
import { AgentChatView } from '@/components/chat/agent-chat-view'

async function getAgent(slug: string, token: string): Promise<Agent | null> {
  try {
    return await apiFetch<Agent>(`/api/agents/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return null
  }
}

async function getAllowedActions(slug: string, token: string): Promise<string[]> {
  try {
    const perm = await apiFetch<{ allowed_actions: string[] }>(`/api/agents/${slug}/my-permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return perm.allowed_actions
  } catch {
    return []
  }
}

export default async function AgentPage({ params }: { params: { agentSlug: string } }) {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const [agent, allowedActions] = await Promise.all([
    getAgent(params.agentSlug, token),
    getAllowedActions(params.agentSlug, token),
  ])
  if (!agent) notFound()

  return <AgentChatView agent={agent} allowedActions={allowedActions} />
}
