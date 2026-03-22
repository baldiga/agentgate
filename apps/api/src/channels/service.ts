import { db } from '../db'

export async function createChannel(data: { name: string; agentId: string; roleIds: string[]; createdBy: string }) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const ch = (await client.query(`INSERT INTO channels (name, agent_id, created_by) VALUES ($1, $2, $3) RETURNING *`, [data.name, data.agentId, data.createdBy])).rows[0]
    for (const roleId of data.roleIds) {
      await client.query(`INSERT INTO channel_roles (channel_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [ch.id, roleId])
    }
    await client.query('COMMIT')
    return ch
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getChannelsForUser(userId: string) {
  return (await db.query(
    `SELECT DISTINCT c.* FROM channels c JOIN channel_roles cr ON cr.channel_id = c.id JOIN user_roles ur ON ur.role_id = cr.role_id WHERE ur.user_id = $1`,
    [userId]
  )).rows
}

export async function listAllChannels() {
  return (await db.query(
    `SELECT c.*, array_agg(cr.role_id) FILTER (WHERE cr.role_id IS NOT NULL) AS role_ids FROM channels c LEFT JOIN channel_roles cr ON cr.channel_id = c.id GROUP BY c.id ORDER BY c.created_at DESC`
  )).rows
}

export async function deleteChannel(id: string): Promise<boolean> {
  const result = await db.query('DELETE FROM channels WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}
