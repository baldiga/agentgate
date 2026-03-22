'use client'

import type { Role } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface RoleMatrixProps {
  roles: Role[]
  onDelete: (id: string) => void
}

export function RoleMatrix({ roles, onDelete }: RoleMatrixProps) {
  return (
    <div className="flex flex-col gap-2">
      {roles.map(role => (
        <div key={role.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary">{role.name}</span>
            {role.mfa_required && <Badge variant="warning">MFA required</Badge>}
          </div>
          <Button variant="danger" size="sm" onClick={() => onDelete(role.id)}>Delete</Button>
        </div>
      ))}
    </div>
  )
}
