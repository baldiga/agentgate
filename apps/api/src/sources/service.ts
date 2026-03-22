// apps/api/src/sources/service.ts
import { db } from '../db'
import { encrypt, decrypt } from '../crypto'
import { config } from '../config'

export async function addSource(agentId: string, data: { type: string; name: string; config: Record<string, string>; expiresAt?: Date }) {
  const configEncrypted = encrypt(JSON.stringify(data.config), config.AGENTGATE_SECRET)
  return (await db.query(
    `INSERT INTO agent_sources (agent_id, type, name, config_encrypted, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, agent_id, type, name, expires_at, created_at`,
    [agentId, data.type, data.name, configEncrypted, data.expiresAt ?? null]
  )).rows[0]
}

export async function listSources(agentId: string) {
  return (await db.query(
    `SELECT id, agent_id, type, name, expires_at, created_at FROM agent_sources WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  )).rows // config_encrypted deliberately excluded
}

export async function getSourceConfig(sourceId: string): Promise<Record<string, string>> {
  const row = (await db.query('SELECT config_encrypted FROM agent_sources WHERE id = $1', [sourceId])).rows[0]
  if (!row) throw new Error('Source not found')
  return JSON.parse(decrypt(row.config_encrypted, config.AGENTGATE_SECRET))
}

export async function deleteSource(id: string) {
  await db.query('DELETE FROM agent_sources WHERE id = $1', [id])
}
