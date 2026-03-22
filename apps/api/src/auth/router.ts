// apps/api/src/auth/router.ts
import { Router } from 'express'
import { z } from 'zod'
import { setupSuperadmin, loginUser } from './service'

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
