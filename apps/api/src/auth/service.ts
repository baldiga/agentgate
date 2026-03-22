// apps/api/src/auth/service.ts
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db'
import { signToken } from './jwt'

const setupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  platformName: z.string().min(1),
})

export async function setupSuperadmin(raw: unknown) {
  const data = setupSchema.parse(raw)

  const existing = await db.query('SELECT id FROM users LIMIT 1')
  if (existing.rowCount && existing.rowCount > 0) throw new Error('ALREADY_SETUP')

  const password_hash = await bcrypt.hash(data.password, 12)

  const roleResult = await db.query(
    `INSERT INTO roles (name, slug, is_superadmin) VALUES ('Super Admin', 'superadmin', true)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`
  )
  const roleId = roleResult.rows[0].id

  const userResult = await db.query(
    `INSERT INTO users (email, name, password_hash, auth_provider) VALUES ($1, $2, $3, 'local') RETURNING id, email, name`,
    [data.email, data.name, password_hash]
  )
  const user = userResult.rows[0]
  await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId])

  return { user, token: signToken({ userId: user.id, email: user.email, isSuperadmin: true }) }
}

export async function loginUser(email: string, password: string) {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.mfa_enabled,
            bool_or(r.is_superadmin) AS is_superadmin,
            bool_or(r.mfa_required) AS role_requires_mfa
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1 AND u.is_active = true
     GROUP BY u.id`,
    [email]
  )
  const user = result.rows[0]
  if (!user) throw new Error('INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  if (user.mfa_enabled || user.role_requires_mfa) {
    return { requiresMfa: true, userId: user.id }
  }

  return {
    token: signToken({ userId: user.id, email: user.email, isSuperadmin: user.is_superadmin }),
    user: { id: user.id, email: user.email, name: user.name },
  }
}
