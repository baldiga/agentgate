// apps/api/src/agents/permissions-router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'

export const agentPermissionsRouter = Router({ mergeParams: true })

const VALID_ACTIONS = ['read', 'query', 'request', 'instruct', 'trigger_subagents']

agentPermissionsRouter.get('/', requireSuperadmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT arp.id, arp.role_id, r.name AS role_name, r.slug, arp.actions FROM agent_role_permissions arp JOIN roles r ON r.id = arp.role_id WHERE arp.agent_id = $1`,
      [req.params.agentId]
    )
    res.json({ permissions: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list permissions' })
  }
})

agentPermissionsRouter.put('/:roleId', requireSuperadmin, async (req, res) => {
  try {
    const rawActions: unknown = req.body.actions
    if (!Array.isArray(rawActions)) return res.status(400).json({ error: 'actions must be an array' })
    const actions = (rawActions as string[]).filter((a) => VALID_ACTIONS.includes(a))
    const result = await db.query(
      `INSERT INTO agent_role_permissions (agent_id, role_id, actions) VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, role_id) DO UPDATE SET actions = EXCLUDED.actions RETURNING *`,
      [req.params.agentId, req.params.roleId, actions]
    )
    res.json({ permission: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to set permissions' })
  }
})

agentPermissionsRouter.delete('/:roleId', requireSuperadmin, async (req, res) => {
  try {
    await db.query('DELETE FROM agent_role_permissions WHERE agent_id = $1 AND role_id = $2', [req.params.agentId, req.params.roleId])
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete permissions' })
  }
})
