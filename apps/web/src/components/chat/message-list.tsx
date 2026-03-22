'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: Message[]
  loading: boolean
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
      {messages.map(m => <MessageBubble key={m.id} message={m} />)}
      {loading && (
        <div role="status" className="flex items-center gap-2 text-sm text-muted">
          <span className="animate-pulse">Agent is thinking…</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
