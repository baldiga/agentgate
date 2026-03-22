export type Permission = 'read' | 'query' | 'request' | 'instruct' | 'trigger_subagents'

export interface AgentUser {
  id: string
  name: string
  email: string
}

export interface FileSource {
  name: string
  retrieval_query_url: string
}

export interface ApiKeySource {
  name: string
  endpoint: string
  token: string
}

export interface RepoSource {
  name: string
  clone_url: string
  branch: string
}

export interface AgentSources {
  files?: FileSource[]
  api_keys?: ApiKeySource[]
  repos?: RepoSource[]
}

export interface UserContext {
  message: string
  user: AgentUser
  role: string
  permissions: Permission[]
  thread_id: string
  channel_id: string | null
  is_superadmin: boolean
  sources: AgentSources
}

export interface AgentGateOptions {
  token: string
  agentId: string
  gatewayUrl: string
  reconnect?: boolean
  reconnectMaxDelay?: number
}

export interface IncomingFrame {
  type: 'message'
  messageId: string
  payload: UserContext & { hmac: string }
}

export interface ReplyFrame {
  type: 'reply'
  messageId: string
  content: string
  done: boolean
}
