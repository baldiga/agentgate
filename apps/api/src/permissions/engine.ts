// apps/api/src/permissions/engine.ts
import { db } from '../db'

export interface UserRole {
  id: string
  slug: string
  is_superadmin: boolean
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const result = await db.query(
    `SELECT r.id, r.slug, r.is_superadmin FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`,
    [userId]
  )
  return result.rows
}

export async function checkAccess(agentId: string, roles: UserRole[]): Promise<boolean> {
  if (roles.some((r) => r.is_superadmin)) return true
  const result = await db.query(
    `SELECT 1 FROM agent_role_permissions WHERE agent_id = $1 AND role_id = ANY($2::uuid[]) LIMIT 1`,
    [agentId, roles.map((r) => r.id)]
  )
  return (result.rowCount ?? 0) > 0
}

export async function getEffectiveActions(agentId: string, roles: UserRole[]): Promise<string[]> {
  if (roles.some((r) => r.is_superadmin)) return ['read', 'query', 'request', 'instruct', 'trigger_subagents']
  const result = await db.query(
    `SELECT array_agg(DISTINCT a) AS actions FROM agent_role_permissions, unnest(actions) AS a
     WHERE agent_id = $1 AND role_id = ANY($2::uuid[])`,
    [agentId, roles.map((r) => r.id)]
  )
  return result.rows[0]?.actions ?? []
}

export async function checkAction(agentId: string, roles: UserRole[], action: string): Promise<boolean> {
  return (await getEffectiveActions(agentId, roles)).includes(action)
}
