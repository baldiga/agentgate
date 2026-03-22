import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let newUserId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
})

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email = 'invited@test.agentgate'")
  await db.end()
})

it('invites a user and returns temp password', async () => {
  const res = await request(app).post('/api/users/invite').set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'invited@test.agentgate', name: 'Invited User', roleIds: [] })
  expect(res.status).toBe(201)
  expect(res.body.tempPassword).toBeDefined()
  newUserId = res.body.user.id
})

it('lists users', async () => {
  const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.users.some((u: any) => u.id === newUserId)).toBe(true)
})

it('deactivates a user', async () => {
  const res = await request(app).put(`/api/users/${newUserId}/deactivate`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
})
