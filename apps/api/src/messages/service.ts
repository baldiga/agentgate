// apps/api/src/messages/service.ts
import { db } from '../db'
import { encrypt, decrypt } from '../crypto'
import { config } from '../config'

export async function getOrCreateThread(userId: string, agentId: string) {
  const existing = await db.query(
    `SELECT * FROM threads WHERE user_id = $1 AND agent_id = $2 AND type = 'private' LIMIT 1`,
    [userId, agentId]
  )
  if (existing.rows[0]) return existing.rows[0]
  return (await db.query(`INSERT INTO threads (user_id, agent_id, type) VALUES ($1, $2, 'private') RETURNING *`, [userId, agentId])).rows[0]
}

export async function saveMessage(threadId: string, senderType: 'user' | 'agent', senderId: string | null, content: string) {
  const encrypted = encrypt(content, config.AGENTGATE_SECRET)
  return (await db.query(
    `INSERT INTO messages (thread_id, sender_type, sender_id, content_encrypted) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [threadId, senderType, senderId, encrypted]
  )).rows[0]
}

export async function getThreadMessages(threadId: string, userId: string) {
  const thread = (await db.query(`SELECT * FROM threads WHERE id = $1`, [threadId])).rows[0]
  if (!thread) throw new Error('FORBIDDEN')

  if (thread.type === 'private') {
    if (thread.user_id !== userId) throw new Error('FORBIDDEN')
  } else {
    const access = await db.query(
      `SELECT 1 FROM channel_roles cr JOIN user_roles ur ON ur.role_id = cr.role_id
       WHERE cr.channel_id = $1 AND ur.user_id = $2 LIMIT 1`,
      [thread.channel_id, userId]
    )
    if ((access.rowCount ?? 0) === 0) throw new Error('FORBIDDEN')
  }

  const messages = await db.query(
    `SELECT id, sender_type, sender_id, content_encrypted, created_at FROM messages WHERE thread_id = $1 ORDER BY created_at ASC`,
    [threadId]
  )
  return messages.rows.map((m) => ({ ...m, content: decrypt(m.content_encrypted, config.AGENTGATE_SECRET), content_encrypted: undefined }))
}
