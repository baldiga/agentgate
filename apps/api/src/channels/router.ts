import { Router } from 'express'
import { requireSuperadmin, AuthRequest } from '../auth/middleware'
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

channelsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const channels = req.user!.isSuperadmin ? await listAllChannels() : await getChannelsForUser(req.user!.userId)
    res.json({ channels })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' })
  }
})

channelsRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    await deleteChannel(req.params.id)
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete channel' })
  }
})
