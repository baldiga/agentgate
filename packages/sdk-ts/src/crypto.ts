import { createHmac, timingSafeEqual } from 'node:crypto'

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

export function verifyPayloadHmac(payload: Record<string, unknown>, token: string): boolean {
  const { hmac, ...rest } = payload
  if (typeof hmac !== 'string' || !hmac) return false

  const canonical = JSON.stringify(sortKeys(rest as SortableValue))
  const expected = createHmac('sha256', token).update(canonical).digest('hex')

  if (expected.length !== hmac.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))
}
