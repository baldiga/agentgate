'use client'

import { useState } from 'react'
import type { Role } from '@/lib/types'
import { RoleMatrix } from './role-matrix'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface RolesPageClientProps {
  initialRoles: Role[]
}

export function RolesPageClient({ initialRoles }: RolesPageClientProps) {
  const [roles, setRoles] = useState(initialRoles)
  const [newName, setNewName] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)

  async function createRole() {
    if (!newName.trim()) return
    const role = await apiFetch<Role>('/api/roles', {
      method: 'POST',
      body: JSON.stringify({ name: newName, mfa_required: mfaRequired }),
    })
    setRoles(prev => [...prev, role])
    setNewName('')
    setMfaRequired(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return
    await apiFetch(`/api/roles/${id}`, { method: 'DELETE' })
    setRoles(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm text-text-secondary">Role name</label>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Support Team" />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={mfaRequired} onChange={e => setMfaRequired(e.target.checked)} className="accent-accent" />
          MFA required
        </label>
        <Button onClick={createRole}>Create Role</Button>
      </div>
      <RoleMatrix roles={roles} onDelete={handleDelete} />
    </div>
  )
}
