'use client'

import type { User } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface UserTableProps {
  users: User[]
  onDeactivate: (id: string) => void
}

export function UserTable({ users, onDeactivate }: UserTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">2FA</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface/50">
              <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
              <td className="px-4 py-3 text-text-secondary">{user.email}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {user.roles.length === 0
                    ? <span className="text-xs text-muted">—</span>
                    : user.roles.map(r => <Badge key={r.id} variant="default">{r.name}</Badge>)
                  }
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={user.active ? 'success' : 'default'}>
                  {user.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {user.mfa_required && <Badge variant="warning">MFA</Badge>}
              </td>
              <td className="px-4 py-3">
                {user.active && (
                  <Button variant="ghost" size="sm" onClick={() => onDeactivate(user.id)}>Deactivate</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
