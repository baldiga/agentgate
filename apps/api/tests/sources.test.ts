// apps/api/tests/sources.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let agentId: string
let sourceId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
  const agent = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Source Agent', slug: 'source-agent', description: 'test' })
  agentId = agent.body.agent.id
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'source-agent'")
  await db.end()
})

it('adds an API key source', async () => {
  const res = await request(app).post(`/api/sources/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
    .send({ type: 'api_key', name: 'HubSpot', config: { key: 'hs_test_key', endpoint: 'https://api.hubspot.com' } })
  expect(res.status).toBe(201)
  expect(res.body.source.name).toBe('HubSpot')
  sourceId = res.body.source.id
})

it('lists sources without exposing config', async () => {
  const res = await request(app).get(`/api/sources/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.sources.some((s: any) => s.id === sourceId)).toBe(true)
  // config must never appear in list response
  expect(res.body.sources[0].config_encrypted).toBeUndefined()
  expect(res.body.sources[0].config).toBeUndefined()
})

it('deletes a source', async () => {
  const res = await request(app).delete(`/api/sources/${agentId}/${sourceId}`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(204)
})
