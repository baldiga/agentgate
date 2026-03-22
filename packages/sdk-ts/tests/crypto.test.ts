import { createHmac } from 'node:crypto'
import { verifyPayloadHmac } from '../src/crypto'

type SortableValue = string | number | boolean | null | SortableObject | SortableValue[]
type SortableObject = { [key: string]: SortableValue }
function sortKeys(value: SortableValue): SortableValue {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value as SortableObject)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys((value as SortableObject)[key])
        return acc
      }, {} as SortableObject)
  }
  return value
}

function signPayload(payload: object, token: string): string {
  const canonical = JSON.stringify(sortKeys(payload as SortableValue))
  return createHmac('sha256', token).update(canonical).digest('hex')
}

const TOKEN = 'sdk-token-for-testing-hmac'

const BASE_CONTEXT = {
  message: 'What is Q1 budget?',
  user: { id: 'u_1', name: 'Sara M.', email: 'sara@acme.com' },
  role: 'MARKETING_MANAGER',
  permissions: ['read', 'query'],
  thread_id: 't_456',
  channel_id: null,
  is_superadmin: false,
  sources: { files: [], api_keys: [], repos: [] },
}

describe('verifyPayloadHmac', () => {
  it('returns true for a correctly signed payload', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, hmac }, TOKEN)).toBe(true)
  })

  it('returns false when hmac field is tampered', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, hmac: hmac + 'x' }, TOKEN)).toBe(false)
  })

  it('returns false when payload content is modified after signing', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, role: 'SUPERADMIN', hmac }, TOKEN)).toBe(false)
  })

  it('returns false when token is wrong', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, hmac }, 'wrong-token')).toBe(false)
  })

  it('is invariant to key ordering in the received payload', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    const reordered = {
      hmac,
      sources: BASE_CONTEXT.sources,
      message: BASE_CONTEXT.message,
      is_superadmin: BASE_CONTEXT.is_superadmin,
      channel_id: BASE_CONTEXT.channel_id,
      thread_id: BASE_CONTEXT.thread_id,
      permissions: BASE_CONTEXT.permissions,
      role: BASE_CONTEXT.role,
      user: BASE_CONTEXT.user,
    }
    expect(verifyPayloadHmac(reordered, TOKEN)).toBe(true)
  })

  it('returns false when hmac field is missing', () => {
    expect(verifyPayloadHmac(BASE_CONTEXT as any, TOKEN)).toBe(false)
  })
})
