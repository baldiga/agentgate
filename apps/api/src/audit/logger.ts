import { db } from '../db'
import { encrypt } from '../crypto'
import { config } from '../config'

export interface AuditEntry {
  userId: string
  agentId?: string
  threadId?: string
  action: string
  outcome: 'delivered' | 'rejected' | 'timed_out'
  content?: string
  roleSnapshot?: string[]
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  const contentEncrypted = entry.content ? encrypt(entry.content, config.AGENTGATE_SECRET) : null
  await db.query(
    `INSERT INTO audit_log (user_id, role_snapshot, agent_id, thread_id, action, content_encrypted, outcome) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [entry.userId, entry.roleSnapshot ?? [], entry.agentId ?? null, entry.threadId ?? null, entry.action, contentEncrypted, entry.outcome]
  )
}
