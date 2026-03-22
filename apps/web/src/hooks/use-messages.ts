'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import type { Message } from '@/lib/types'

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 30_000

export function useMessages(agentSlug: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ thread_id: string; messages: Message[] } | null>(
      `/api/threads/by-agent/${agentSlug}`
    )
      .then(data => {
        if (data) {
          setThreadId(data.thread_id)
          setMessages(data.messages)
        }
      })
      .catch(() => {})
  }, [agentSlug])

  const sendMessage = useCallback(async (content: string) => {
    setLoading(true)
    setError(null)

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      thread_id: '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const sent = await apiFetch<{ thread_id: string; id: string }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ agent_slug: agentSlug, content }),
      })

      const currentThreadId = sent.thread_id
      const deadline = Date.now() + POLL_TIMEOUT_MS

      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
        const msgs = await apiFetch<Message[]>(`/api/threads/${currentThreadId}/messages`)
        const agentReplied = msgs.some(m => m.role === 'agent')
        setMessages(msgs)
        if (agentReplied) break
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setLoading(false)
    }
  }, [agentSlug])

  return { messages, loading, error, sendMessage }
}
