// apps/api/src/agents/service.ts
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { db } from '../db'

export async function createAgent(data: { name: string; slug: string; description?: string; icon?: string }) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(rawToken, 10)
  const agent = (await db.query(
    `INSERT INTO agents (name, slug, description, icon) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.name, data.slug, data.description ?? '', data.icon ?? '🤖']
  )).rows[0]
  await db.query(`INSERT INTO sdk_tokens (agent_id, token_hash) VALUES ($1, $2)`, [agent.id, tokenHash])
  return { agent, sdkToken: rawToken }
}

export async function listAgents() {
  return (await db.query(
    `SELECT a.*, (SELECT count(*) FROM threads t WHERE t.agent_id = a.id) AS conversation_count FROM agents a ORDER BY a.created_at DESC`
  )).rows
}

export async function getAgent(id: string) {
  return (await db.query('SELECT * FROM agents WHERE id = $1', [id])).rows[0] ?? null
}

export async function updateAgent(id: string, data: Partial<{ name: string; description: string; icon: string; timeout_seconds: number }>) {
  const entries = Object.entries(data)
  const fields = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  return (await db.query(`UPDATE agents SET ${fields} WHERE id = $1 RETURNING *`, [id, ...entries.map(([, v]) => v)])).rows[0]
}

export async function deleteAgent(id: string) {
  await db.query('DELETE FROM agents WHERE id = $1', [id])
}

export async function rotateToken(agentId: string, gracePeriodMinutes = 15) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(rawToken, 10)
  const graceExpiry = new Date(Date.now() + gracePeriodMinutes * 60 * 1000)
  await db.query(
    `UPDATE sdk_tokens SET previous_token_hash = token_hash, token_hash = $1, grace_period_expires_at = $2 WHERE agent_id = $3`,
    [tokenHash, graceExpiry, agentId]
  )
  return rawToken
}

export async function validateSdkToken(agentId: string, rawToken: string): Promise<boolean> {
  const row = (await db.query(`SELECT token_hash, previous_token_hash, grace_period_expires_at FROM sdk_tokens WHERE agent_id = $1`, [agentId])).rows[0]
  if (!row) return false
  if (await bcrypt.compare(rawToken, row.token_hash)) return true
  if (row.previous_token_hash && row.grace_period_expires_at > new Date()) return bcrypt.compare(rawToken, row.previous_token_hash)
  return false
}

export async function setAgentStatus(agentId: string, status: 'online' | 'offline') {
  await db.query('UPDATE agents SET status = $1 WHERE id = $2', [status, agentId])
}
