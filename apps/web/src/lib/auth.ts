interface JwtPayload {
  sub: string
  role: 'superadmin' | 'user'
  exp: number
}

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as JwtPayload
    return payload
  } catch {
    return null
  }
}

export function isExpired(payload: JwtPayload): boolean {
  return Date.now() / 1000 > payload.exp
}
