import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { User } from '@/lib/types'
import { UsersPageClient } from '@/components/admin/users-page-client'

export default async function UsersPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const users = await apiFetch<User[]>('/api/users', { headers: { Authorization: `Bearer ${token}` } })
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Users</h1>
      <UsersPageClient initialUsers={users} />
    </div>
  )
}
