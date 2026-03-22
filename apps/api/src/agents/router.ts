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

agentsRouter.get('/', async (_req, res) => res.json({ agents: await listAgents() }))

agentsRouter.get('/:id', async (req, res) => {
  const agent = await getAgent(req.params.id)
  if (!agent) return res.status(404).json({ error: 'Not found' })
  res.json({ agent })
})

agentsRouter.put('/:id', requireSuperadmin, async (req, res) => {
  const agent = await updateAgent(req.params.id, req.body)
  if (!agent) return res.status(404).json({ error: 'Not found' })
  res.json({ agent })
})

agentsRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  await deleteAgent(req.params.id)
  res.status(204).send()
})

agentsRouter.post('/:id/rotate-token', requireSuperadmin, async (req, res) => {
  res.json({ sdkToken: await rotateToken(req.params.id), gracePeriodMinutes: 15 })
})
