// apps/api/src/agents/router.ts
import { Router } from 'express'
import { requireSuperadmin, AuthRequest } from '../auth/middleware'
import { createAgent, listAgents, getAgent, updateAgent, deleteAgent, rotateToken } from './service'

export const agentsRouter = Router()

agentsRouter.post('/', requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    res.status(201).json(await createAgent(req.body))
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' })
    res.status(500).json({ error: 'Failed to create agent' })
  }
})

agentsRouter.get('/', async (_req, res) => {
  try {
    res.json({ agents: await listAgents() })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list agents' })
  }
})

agentsRouter.get('/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id)
    if (!agent) return res.status(404).json({ error: 'Not found' })
    res.json({ agent })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent' })
  }
})

agentsRouter.put('/:id', requireSuperadmin, async (req, res) => {
  try {
    const agent = await updateAgent(req.params.id, req.body)
    if (!agent) return res.status(404).json({ error: 'Not found' })
    res.json({ agent })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agent' })
  }
})

agentsRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    await deleteAgent(req.params.id)
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete agent' })
  }
})

agentsRouter.post('/:id/rotate-token', requireSuperadmin, async (req, res) => {
  try {
    const sdkToken = await rotateToken(req.params.id)
    res.json({ sdkToken, gracePeriodMinutes: 15 })
  } catch (err) {
    res.status(500).json({ error: 'Failed to rotate token' })
  }
})
