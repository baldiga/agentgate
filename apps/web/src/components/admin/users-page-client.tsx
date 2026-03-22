'use client'

import { useState } from 'react'
import type { User } from '@/lib/types'
import { UserTable } from './user-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface UsersPageClientProps {
  initialUsers: User[]
}

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  async function handleDeactivate(id: string) {
    await apiFetch(`/api/users/${id}/deactivate`, { method: 'POST' })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: false } : u))
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const user = await apiFetch<User>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail }),
    })
    setUsers(prev => [...prev, user])
    setInviteEmail('')
    setInviting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input
          type="email"
          placeholder="email@company.com"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
          {inviting ? 'Inviting…' : 'Invite user'}
        </Button>
      </div>
      <UserTable users={users} onDeactivate={handleDeactivate} />
    </div>
  )
}
