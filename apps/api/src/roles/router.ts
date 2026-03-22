import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'

export const rolesRouter = Router()

rolesRouter.get('/', async (_req, res) => {
  try {
    res.json((await db.query('SELECT * FROM roles ORDER BY name')).rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to list roles' })
  }
})

rolesRouter.post('/', requireSuperadmin, async (req, res) => {
  try {
    const { name, slug } = req.body
    res.status(201).json({ role: (await db.query(`INSERT INTO roles (name, slug) VALUES ($1, $2) RETURNING *`, [name, slug])).rows[0] })
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Role slug already exists' })
    res.status(500).json({ error: 'Failed to create role' })
  }
})

rolesRouter.put('/:id/mfa-required', requireSuperadmin, async (req, res) => {
  try {
    await db.query('UPDATE roles SET mfa_required = $1 WHERE id = $2 AND is_superadmin = false', [req.body.mfaRequired, req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' })
  }
})

rolesRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    await db.query('DELETE FROM roles WHERE id = $1 AND is_superadmin = false', [req.params.id])
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete role' })
  }
})
