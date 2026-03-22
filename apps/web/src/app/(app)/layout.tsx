import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'

async function getAgents(token: string): Promise<Agent[]> {
  try {
    return await apiFetch<Agent[]>('/api/agents', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return []
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const token = cookieStore.get('agentgate_token')?.value
  if (!token) redirect('/login')

  const agents = await getAgents(token)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar agents={agents} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
