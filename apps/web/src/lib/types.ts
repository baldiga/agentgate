export interface User {
  id: string
  email: string
  name: string
  system_role: 'superadmin' | 'user'
  roles: Pick<Role, 'id' | 'name'>[]
  mfa_required: boolean
  active: boolean
}

export interface Agent {
  id: string
  name: string
  slug: string
  description: string
  ws_endpoint: string
  online: boolean
  locked: boolean
}

export interface Message {
  id: string
  thread_id: string
  role: 'user' | 'agent'
  content: string
  created_at: string
}

export interface Thread {
  id: string
  agent_slug: string
  user_id: string
  created_at: string
}

export interface Role {
  id: string
  name: string
  mfa_required: boolean
}

export interface Permission {
  agent_id: string
  role_id: string
  allowed: boolean
  allowed_actions: string[]
}

export interface AuditLog {
  id: string
  user_id: string
  agent_id: string
  action: string
  outcome: 'delivered' | 'rejected' | 'timed_out' | 'redacted'
  role_snapshot: string | null
  created_at: string
  encrypted_content: string | null
}

export interface SdkToken {
  id: string
  agent_id: string
  label: string
  created_at: string
  last_used_at: string | null
  grace_until: string | null
}

export interface ApiError extends Error {
  status: number
  message: string
}
