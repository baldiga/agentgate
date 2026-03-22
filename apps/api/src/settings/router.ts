import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'

export const settingsRouter = Router()

const ALLOWED_KEYS = new Set([
  'platform_name',
  'embedding_provider',
  'openai_api_key',
  'anthropic_api_key',
  'gemini_api_key',
])

settingsRouter.get('/', requireSuperadmin, async (_req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM platform_settings')
    const settings: Record<string, string> = {}
    for (const row of result.rows) settings[row.key] = row.value
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

settingsRouter.put('/', requireSuperadmin, async (req, res) => {
  try {
    const updates = Object.entries(req.body as Record<string, string>).filter(([k]) => ALLOWED_KEYS.has(k))
    for (const [key, value] of updates) {
      await db.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})
