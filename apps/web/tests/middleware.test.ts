/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

describe('middleware', () => {
  it('redirects to /login when agentgate_token cookie is absent on protected route', async () => {
    const req = new NextRequest('http://localhost:3000/support')
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('does not redirect when token cookie is present', async () => {
    const req = new NextRequest('http://localhost:3000/support', {
      headers: { cookie: 'agentgate_token=abc.def.ghi' },
    })
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('does not redirect on /login when no cookie', async () => {
    const req = new NextRequest('http://localhost:3000/login')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('redirects /login to / when token cookie is present', async () => {
    const req = new NextRequest('http://localhost:3000/login', {
      headers: { cookie: 'agentgate_token=abc.def.ghi' },
    })
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/')
  })

  it('redirects /setup to / when token cookie is present', async () => {
    const req = new NextRequest('http://localhost:3000/setup', {
      headers: { cookie: 'agentgate_token=abc.def.ghi' },
    })
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/')
  })
})
