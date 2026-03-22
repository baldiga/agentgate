import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { inviteUser, listUsers, updateUserRoles, deactivateUser } from './service'

export const usersRouter = Router()

usersRouter.get('/', requireSuperadmin, async (_req, res) => {
  try {
    res.json({ users: await listUsers() })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users' })
  }
})

usersRouter.post('/invite', requireSuperadmin, async (req, res) => {
  try {
    res.status(201).json(await inviteUser(req.body))
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'User already exists' })
    res.status(500).json({ error: 'Failed to invite user' })
  }
})

usersRouter.put('/:id/roles', requireSuperadmin, async (req, res) => {
  try {
    await updateUserRoles(req.params.id, req.body.roleIds)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update roles' })
  }
})

usersRouter.put('/:id/deactivate', requireSuperadmin, async (req, res) => {
  try {
    await deactivateUser(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user' })
  }
})
