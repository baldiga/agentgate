// apps/api/tests/messages.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let testAgentId: string
let threadId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token

  const agentRes = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Msg Agent', slug: 'msg-test-agent', description: 'test' })
  testAgentId = agentRes.body.agent?.id

  if (testAgentId) {
    const superRole = await db.query("SELECT id FROM roles WHERE is_superadmin = true LIMIT 1")
    if (superRole.rows[0]) {
      await db.query(
        `INSERT INTO agent_role_permissions (agent_id, role_id, actions) VALUES ($1, $2, ARRAY['read','query','instruct']) ON CONFLICT DO NOTHING`,
        [testAgentId, superRole.rows[0].id]
      )
    }
  }
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'msg-test-agent'")
  await db.end()
})

it('creates a private thread', async () => {
  const res = await request(app).post('/api/messages/threads')
    .set('Authorization', `Bearer ${adminToken}`).send({ agentId: testAgentId })
  expect(res.status).toBe(201)
  expect(res.body.thread.type).toBe('private')
  threadId = res.body.thread.id
})

it('sends a message — returns 503 when agent offline', async () => {
  const res = await request(app).post('/api/messages/send')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ threadId, content: 'Hello', agentId: testAgentId })
  expect([200, 503]).toContain(res.status)
  if (res.status === 503) expect(res.body.error).toMatch(/offline/i)
})

it('fetches private thread message history', async () => {
  const res = await request(app).get(`/api/messages/threads/${threadId}`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.messages)).toBe(true)
})
