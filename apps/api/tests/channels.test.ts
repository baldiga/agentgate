import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let channelId: string
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
    .send({ name: 'Channel Agent', slug: 'channel-agent', description: 'test' })
  agentId = agent.body.agent.id

  const role = await db.query(`INSERT INTO roles (name, slug) VALUES ('Channel Role', 'channel-role') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)
  roleId = role.rows[0].id
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'channel-agent'")
  await db.query("DELETE FROM roles WHERE slug = 'channel-role'")
  await db.end()
})

it('creates a group channel', async () => {
  const res = await request(app).post('/api/channels').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Marketing Channel', agentId, roleIds: [roleId] })
  expect(res.status).toBe(201)
  expect(res.body.channel.name).toBe('Marketing Channel')
  channelId = res.body.channel.id
})

it('lists all channels as superadmin', async () => {
  const res = await request(app).get('/api/channels').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.channels.some((c: any) => c.id === channelId)).toBe(true)
})

it('deletes a channel', async () => {
  const res = await request(app).delete(`/api/channels/${channelId}`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(204)
})
