import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Agent, SdkToken } from '@/lib/types'
import { TokenPanel } from '@/components/admin/token-panel'

export default async function SdkTokensPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const headers = { Authorization: `Bearer ${token}` }
  const agents = await apiFetch<Agent[]>('/api/agents', { headers })

  const agentTokens = await Promise.all(
    agents.map(async a => ({
      agent: a,
      tokens: await apiFetch<SdkToken[]>(`/api/agents/${a.id}/sdk-tokens`, { headers }),
    }))
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold text-text-primary">SDK Tokens</h1>
      {agentTokens.map(({ agent, tokens }) => (
        <div key={agent.id} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-secondary">{agent.name}</h2>
          <TokenPanel agentId={agent.id} initialTokens={tokens} />
        </div>
      ))}
    </div>
  )
}
