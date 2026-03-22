import bcrypt from 'bcrypt'
import { db } from '../db'

export async function inviteUser(data: { email: string; name: string; roleIds: string[] }) {
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
  const password_hash = await bcrypt.hash(tempPassword, 12)
  const user = (await db.query(
    `INSERT INTO users (email, name, password_hash, auth_provider) VALUES ($1, $2, $3, 'local') RETURNING id, email, name`,
    [data.email, data.name, password_hash]
  )).rows[0]
  for (const roleId of data.roleIds) {
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, roleId])
  }
  return { user, tempPassword }
}

export async function listUsers() {
  return (await db.query(
    `SELECT u.id, u.email, u.name, u.is_active, u.auth_provider, u.mfa_enabled, u.created_at,
            array_agg(r.slug) FILTER (WHERE r.id IS NOT NULL) AS roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id ORDER BY u.created_at DESC`
  )).rows
}

export async function updateUserRoles(userId: string, roleIds: string[]) {
  await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId])
  for (const roleId of roleIds) {
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId])
  }
}

export async function deactivateUser(userId: string) {
  await db.query('UPDATE users SET is_active = false WHERE id = $1', [userId])
}
