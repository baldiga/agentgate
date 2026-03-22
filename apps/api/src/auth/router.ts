// apps/api/src/auth/router.ts
import { Router } from 'express'
import { z } from 'zod'
import { setupSuperadmin, loginUser } from './service'
import { generateMfaSecret, saveMfaSecret, verifyAndEnableMfa, verifyMfaToken } from './mfa'
import { requireAuth, AuthRequest } from './middleware'
import { signToken } from './jwt'
import { db } from '../db'
import rateLimit from 'express-rate-limit'

export const authRouter = Router()

authRouter.post('/setup', async (req, res) => {
  try {
    const result = await setupSuperadmin(req.body)
    res.status(201).json(result)
  } catch (err: any) {
    if (err.message === 'ALREADY_SETUP') return res.status(409).json({ error: 'Platform already set up' })
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    console.error(err)
    res.status(500).json({ error: 'Setup failed' })
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body)
    res.json(await loginUser(email, password))
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' })
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Login failed' })
  }
})

const mfaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many MFA attempts' } })

authRouter.post('/mfa/enable', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { secret, otpauthUrl } = generateMfaSecret(req.user!.email)
    await saveMfaSecret(req.user!.userId, secret)
    res.json({ secret, otpauthUrl })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to enable MFA' })
  }
})

authRouter.post('/mfa/verify-setup', requireAuth, async (req: AuthRequest, res) => {
  try {
    const valid = await verifyAndEnableMfa(req.user!.userId, req.body.token)
    if (!valid) return res.status(400).json({ error: 'Invalid MFA token' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'MFA verification failed' })
  }
})

authRouter.post('/mfa/login', mfaLimiter, async (req, res) => {
  try {
    const { userId, token } = z.object({ userId: z.string().uuid(), token: z.string() }).parse(req.body)
    const valid = await verifyMfaToken(userId, token)
    if (!valid) return res.status(401).json({ error: 'Invalid MFA token' })
    const result = await db.query(
      `SELECT u.id, u.email, bool_or(r.is_superadmin) AS is_superadmin FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1 GROUP BY u.id`,
      [userId]
    )
    const u = result.rows[0]
    if (!u) return res.status(404).json({ error: 'User not found' })
    res.json({ token: signToken({ userId: u.id, email: u.email, isSuperadmin: u.is_superadmin }) })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    console.error(err)
    res.status(500).json({ error: 'MFA login failed' })
  }
})
