// apps/api/tests/agents.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let agentId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug LIKE 'test-%'")
  await db.end()
})

describe('Agent CRUD', () => {
  it('creates an agent and returns plaintext SDK token', async () => {
    const res = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test CMO Agent', slug: 'test-cmo', description: 'CMO agent', icon: '🤖' })
    expect(res.status).toBe(201)
    expect(res.body.agent.slug).toBe('test-cmo')
    expect(res.body.sdkToken).toMatch(/^[0-9a-f]{64}$/)
    agentId = res.body.agent.id
  })

  it('lists agents', async () => {
    const res = await request(app).get('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.agents.some((a: any) => a.id === agentId)).toBe(true)
  })

  it('gets a single agent', async () => {
    const res = await request(app).get(`/api/agents/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.agent.id).toBe(agentId)
  })

  it('updates an agent name', async () => {
    const res = await request(app).put(`/api/agents/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated CMO Agent' })
    expect(res.status).toBe(200)
    expect(res.body.agent.name).toBe('Updated CMO Agent')
  })

  it('rotates SDK token with grace period', async () => {
    const res = await request(app).post(`/api/agents/${agentId}/rotate-token`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.sdkToken).toMatch(/^[0-9a-f]{64}$/)
    expect(res.body.gracePeriodMinutes).toBe(15)
  })

  it('deletes an agent', async () => {
    const res = await request(app).delete(`/api/agents/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
  })
})
