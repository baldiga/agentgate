import useSWR from 'swr'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'

export function useAgents() {
  const { data, error, isLoading } = useSWR<Agent[]>('/api/agents', apiFetch, {
    refreshInterval: 30_000,
  })
  return { agents: data ?? [], error, isLoading }
}
