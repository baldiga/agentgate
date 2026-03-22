import { Router } from 'express'
import { requireAuth, requireSuperadmin, AuthRequest } from '../auth/middleware'
import { createChannel, getChannelsForUser, listAllChannels, deleteChannel } from './service'

export const channelsRouter = Router()

channelsRouter.post('/', requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    res.status(201).json({ channel: await createChannel({ ...req.body, createdBy: req.user!.userId }) })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create channel' })
  }
})

channelsRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const channels = req.user!.isSuperadmin ? await listAllChannels() : await getChannelsForUser(req.user!.userId)
    res.json({ channels })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' })
  }
})

channelsRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    const deleted = await deleteChannel(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Channel not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete channel' })
  }
})
