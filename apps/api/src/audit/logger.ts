export interface AuditEntry {
  userId: string
  agentId?: string
  threadId?: string
  action: string
  outcome: 'delivered' | 'rejected' | 'timed_out'
  content?: string
  roleSnapshot?: string[]
}

// Stub — fully implemented in Task 12
export async function auditLog(_entry: AuditEntry): Promise<void> {}
