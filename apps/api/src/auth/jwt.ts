// apps/api/src/auth/jwt.ts
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface TokenPayload {
  userId: string
  email: string
  isSuperadmin: boolean
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '8h' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload
}
