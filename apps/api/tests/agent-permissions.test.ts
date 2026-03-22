// apps/api/tests/agent-permissions.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let agentId: string
let roleId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token

  const agent = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Perm API Agent', slug: 'perm-api-agent', description: 'test' })
  agentId = agent.body.agent.id

  const role = await db.query(`INSERT INTO roles (name, slug) VALUES ('Perm API Role', 'perm-api-role') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)
  roleId = role.rows[0].id
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'perm-api-agent'")
  await db.query("DELETE FROM roles WHERE slug = 'perm-api-role'")
  await db.end()
})

it('sets permissions for a role on an agent', async () => {
  const res = await request(app).put(`/api/agents/${agentId}/permissions/${roleId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ actions: ['read', 'query', 'invalid_action'] })
  expect(res.status).toBe(200)
  // invalid_action must be filtered out
  expect(res.body.permission.actions).toEqual(expect.arrayContaining(['read', 'query']))
  expect(res.body.permission.actions).not.toContain('invalid_action')
})

it('gets permissions for an agent', async () => {
  const res = await request(app).get(`/api/agents/${agentId}/permissions`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.permissions.some((p: any) => p.role_id === roleId)).toBe(true)
})

it('deletes permissions for a role', async () => {
  const res = await request(app).delete(`/api/agents/${agentId}/permissions/${roleId}`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(204)
})
