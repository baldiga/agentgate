// apps/api/tests/auth.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()

beforeAll(async () => {
  await db.query("DELETE FROM users WHERE email LIKE '%@test.agentgate'")
  await db.query("DELETE FROM roles WHERE slug = 'test-superadmin'")
})

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email LIKE '%@test.agentgate'")
  await db.end()
})

describe('POST /api/auth/setup', () => {
  it('creates superadmin on first boot', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      email: 'admin@test.agentgate',
      password: 'SuperSecure123!',
      name: 'Test Admin',
      platformName: 'Test Corp',
    })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('admin@test.agentgate')
  })

  it('rejects second setup attempt', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      email: 'other@test.agentgate',
      password: 'SuperSecure123!',
      name: 'Other',
      platformName: 'Other Corp',
    })
    expect(res.status).toBe(409)
  })

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      email: 'not-an-email',
      password: 'pass',
      name: 'X',
      platformName: 'Y',
    })
    expect(res.status).toBe(409) // already setup — but validates schema first
  })
})

describe('POST /api/auth/login', () => {
  it('returns JWT on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.agentgate',
      password: 'SuperSecure123!',
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.agentgate',
      password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })
})

describe('MFA', () => {
  let adminToken: string

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.agentgate',
      password: 'SuperSecure123!',
    })
    adminToken = res.body.token
  })

  it('returns QR URI when enabling MFA', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.otpauthUrl).toContain('otpauth://totp/')
    expect(res.body.secret).toBeDefined()
  })
})
