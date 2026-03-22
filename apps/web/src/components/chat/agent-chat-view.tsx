'use client'

import type { Agent } from '@/lib/types'
import { AgentHeader } from './agent-header'
import { PermissionBar } from './permission-bar'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { useMessages } from '@/hooks/use-messages'

interface AgentChatViewProps {
  agent: Agent
  allowedActions: string[]
}

export function AgentChatView({ agent, allowedActions }: AgentChatViewProps) {
  const { messages, loading, sendMessage } = useMessages(agent.slug)

  if (agent.locked) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <p>You do not have permission to access this agent.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AgentHeader agent={agent} />
      <PermissionBar allowedActions={allowedActions} />
      <MessageList messages={messages} loading={loading} />
      <MessageInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
