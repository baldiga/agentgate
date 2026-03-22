// apps/api/src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { authRouter } from './auth/router'
import { agentsRouter } from './agents/router'
import { agentPermissionsRouter } from './agents/permissions-router'
import { messagesRouter } from './messages/router'
import { channelsRouter } from './channels/router'
import { sourcesRouter } from './sources/router'
import { auditRouter } from './audit/router'
import { usersRouter } from './users/router'
import { rolesRouter } from './roles/router'
import { requireAuth } from './auth/middleware'
import { settingsRouter } from './settings/router'

export function createApp() {
  const app = express()

  // Trust reverse proxy (required on Render/Heroku for rate limiting to work correctly)
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }))
  app.use(express.json({ limit: '10mb' }))

  app.use('/api/auth', authRouter)
  app.use('/api/agents', requireAuth, agentsRouter)
  app.use('/api/agents/:agentId/permissions', requireAuth, agentPermissionsRouter)
  app.use('/api/messages', requireAuth, messagesRouter)
  app.use('/api/channels', requireAuth, channelsRouter)
  app.use('/api/sources', requireAuth, sourcesRouter)
  app.use('/api/audit', requireAuth, auditRouter)
  app.use('/api/users', requireAuth, usersRouter)
  app.use('/api/roles', requireAuth, rolesRouter)

  app.use('/api/settings', requireAuth, settingsRouter)
  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  return app
}
