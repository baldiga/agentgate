// apps/api/src/permissions/middleware.ts
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../auth/middleware'
import { getUserRoles, checkAccess, getEffectiveActions, UserRole } from './engine'

declare global {
  namespace Express {
    interface Request {
      userRoles?: UserRole[]
      effectiveActions?: string[]
    }
  }
}

export async function attachPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return next()
  req.userRoles = await getUserRoles(req.user.userId)
  next()
}

export async function requireAgentAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const agentId = req.params.agentId || req.body.agentId
  if (!agentId) return res.status(400).json({ error: 'agentId required' })
  const allowed = await checkAccess(agentId, req.userRoles!)
  if (!allowed) return res.status(403).json({ error: 'Access denied to this agent' })
  req.effectiveActions = await getEffectiveActions(agentId, req.userRoles!)
  next()
}
