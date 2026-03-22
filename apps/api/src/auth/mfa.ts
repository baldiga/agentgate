// apps/api/src/auth/mfa.ts
import speakeasy from 'speakeasy'
import { db } from '../db'
import { encrypt, decrypt } from '../crypto'
import { config } from '../config'

export function generateMfaSecret(email: string) {
  const secret = speakeasy.generateSecret({ name: `AgentGate:${email}`, issuer: 'AgentGate' })
  return { secret: secret.base32, otpauthUrl: secret.otpauth_url! }
}

export async function saveMfaSecret(userId: string, secret: string) {
  const encrypted = encrypt(secret, config.AGENTGATE_SECRET)
  await db.query('UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2', [encrypted, userId])
}

export async function verifyAndEnableMfa(userId: string, token: string): Promise<boolean> {
  const result = await db.query('SELECT mfa_secret FROM users WHERE id = $1', [userId])
  const user = result.rows[0]
  if (!user?.mfa_secret) return false
  const secret = decrypt(user.mfa_secret, config.AGENTGATE_SECRET)
  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 })
  if (valid) await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId])
  return valid
}

export async function verifyMfaToken(userId: string, token: string): Promise<boolean> {
  const result = await db.query('SELECT mfa_secret FROM users WHERE id = $1', [userId])
  const user = result.rows[0]
  if (!user?.mfa_secret) return false
  const secret = decrypt(user.mfa_secret, config.AGENTGATE_SECRET)
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 })
}
