// apps/api/tests/permissions.test.ts
import { checkAccess, checkAction, getUserRoles } from '../src/permissions/engine'
import { db } from '../src/db'
import { v4 as uuid } from 'uuid'

let agentId: string, roleId: string, userId: string

beforeAll(async () => {
  const role = await db.query(`INSERT INTO roles (name, slug) VALUES ('Perm Role', 'perm-role-${uuid().slice(0,8)}') RETURNING id`)
  roleId = role.rows[0].id
  const user = await db.query(`INSERT INTO users (email, name, auth_provider) VALUES ('perm@test.agentgate', 'Perm User', 'local') RETURNING id`)
  userId = user.rows[0].id
  await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId])
  const agent = await db.query(`INSERT INTO agents (name, slug) VALUES ('Perm Agent', 'perm-agent-${uuid().slice(0,8)}') RETURNING id`)
  agentId = agent.rows[0].id
  await db.query(`INSERT INTO agent_role_permissions (agent_id, role_id, actions) VALUES ($1, $2, ARRAY['read','query'])`, [agentId, roleId])
})

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email = 'perm@test.agentgate'")
  await db.end()
})

it('grants access when role has permission', async () => {
  expect(await checkAccess(agentId, await getUserRoles(userId))).toBe(true)
})

it('denies access when role has no permission', async () => {
  expect(await checkAccess(agentId, [{ id: uuid(), slug: 'none', is_superadmin: false }])).toBe(false)
})

it('allows permitted actions', async () => {
  const roles = await getUserRoles(userId)
  expect(await checkAction(agentId, roles, 'read')).toBe(true)
  expect(await checkAction(agentId, roles, 'query')).toBe(true)
})

it('denies unpermitted actions', async () => {
  expect(await checkAction(agentId, await getUserRoles(userId), 'instruct')).toBe(false)
})

it('superadmin bypasses all checks', async () => {
  const superRoles = [{ id: uuid(), slug: 'superadmin', is_superadmin: true }]
  expect(await checkAccess(agentId, superRoles)).toBe(true)
  expect(await checkAction(agentId, superRoles, 'instruct')).toBe(true)
})
