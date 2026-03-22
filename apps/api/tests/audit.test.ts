import { auditLog } from '../src/audit/logger'
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
  const user = await db.query("SELECT id FROM users WHERE email = 'admin@test.agentgate'")
  if (user.rows[0]) {
    await auditLog({ userId: user.rows[0].id, action: 'test_action', outcome: 'delivered', content: 'test content' })
  }
})

afterAll(async () => { await db.end() })

it('audit log returns entries for superadmin', async () => {
  const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.entries)).toBe(true)
  expect(res.body.entries.length).toBeGreaterThan(0)
  expect(res.body.entries[0].content).toBeDefined()
})

it('filters by outcome', async () => {
  const res = await request(app).get('/api/audit?outcome=delivered').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.entries.every((e: any) => e.outcome === 'delivered')).toBe(true)
})
