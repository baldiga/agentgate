// apps/api/src/auth/middleware.ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from './jwt'

export interface AuthRequest extends Request {
  user?: TokenPayload
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isSuperadmin) return res.status(403).json({ error: 'Superadmin required' })
  next()
}
