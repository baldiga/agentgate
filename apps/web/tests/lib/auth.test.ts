import { parseJwtPayload } from '@/lib/auth'

describe('parseJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    const payloadB64 = Buffer.from(JSON.stringify({ sub: '1', role: 'superadmin', exp: 9999999999 })).toString('base64')
    const token = `header.${payloadB64}.sig`
    const payload = parseJwtPayload(token)
    expect(payload).toMatchObject({ sub: '1', role: 'superadmin' })
  })

  it('returns null for malformed token', () => {
    expect(parseJwtPayload('bad')).toBeNull()
  })
})
