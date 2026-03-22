// apps/api/src/messages/router.ts
import { Router } from 'express'
import { AuthRequest } from '../auth/middleware'
import { attachPermissions, requireAgentAccess } from '../permissions/middleware'
import { getOrCreateThread, saveMessage, getThreadMessages } from './service'
import { sendToAgent, waitForResponse } from './streaming'
import { getAgent } from '../agents/service'
import { auditLog } from '../audit/logger'

export const messagesRouter = Router()
messagesRouter.use(attachPermissions)

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  try {
    const thread = await getOrCreateThread(req.user!.userId, req.body.agentId)
    res.status(201).json({ thread })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create thread' })
  }
})

messagesRouter.get('/threads/:id', async (req: AuthRequest, res) => {
  try {
    res.json({ messages: await getThreadMessages(req.params.id, req.user!.userId) })
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Access denied' })
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

messagesRouter.post('/send', requireAgentAccess, async (req: AuthRequest, res) => {
  try {
    const { threadId, content, agentId } = req.body
    const agent = await getAgent(agentId)

    if (!agent || agent.status !== 'online') {
      await auditLog({ userId: req.user!.userId, agentId, threadId, action: 'send_message', outcome: 'rejected' })
      return res.status(503).json({ error: 'Agent is offline' })
    }

    await saveMessage(threadId, 'user', req.user!.userId, content)

    const roles = req.userRoles ?? []
    await sendToAgent(agentId, {
      message: content,
      user: { id: req.user!.userId, email: req.user!.email },
      role: roles.map((r) => r.slug).join(','),
      permissions: req.effectiveActions ?? [],
      thread_id: threadId,
      is_superadmin: req.user!.isSuperadmin,
    })

    const response = await waitForResponse(threadId, (agent.timeout_seconds ?? 30) * 1000)

    if (!response) {
      await auditLog({ userId: req.user!.userId, agentId, threadId, action: 'send_message', outcome: 'timed_out', content })
      return res.status(504).json({ error: 'Agent did not respond in time. Please try again.' })
    }

    await saveMessage(threadId, 'agent', agentId, response)
    await auditLog({ userId: req.user!.userId, agentId, threadId, action: 'send_message', outcome: 'delivered', content })
    res.json({ message: { content: response, sender_type: 'agent' } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})
