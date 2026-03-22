import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'
import { decrypt } from '../crypto'
import { config } from '../config'

export const auditRouter = Router()

auditRouter.get('/', requireSuperadmin, async (req, res) => {
  try {
    const { userId, agentId, outcome, from, to, limit = 100, offset = 0 } = req.query
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (userId) { conditions.push(`al.user_id = $${idx++}`); values.push(userId) }
    if (agentId) { conditions.push(`al.agent_id = $${idx++}`); values.push(agentId) }
    if (outcome) { conditions.push(`al.outcome = $${idx++}`); values.push(outcome) }
    if (from) { conditions.push(`al.created_at >= $${idx++}`); values.push(from) }
    if (to) { conditions.push(`al.created_at <= $${idx++}`); values.push(to) }

    values.push(limit, offset)
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await db.query(
      `SELECT al.id, al.user_id, u.name AS user_name, al.role_snapshot, al.agent_id,
              a.name AS agent_name, al.action, al.outcome, al.created_at, al.content_encrypted
       FROM audit_log al LEFT JOIN users u ON u.id = al.user_id LEFT JOIN agents a ON a.id = al.agent_id
       ${where} ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    )

    res.json({
      entries: result.rows.map((row) => ({
        ...row,
        content: row.content_encrypted ? decrypt(row.content_encrypted, config.AGENTGATE_SECRET) : null,
        content_encrypted: undefined,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch audit log' })
  }
})
