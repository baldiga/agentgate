import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Role } from '@/lib/types'
import { RolesPageClient } from '@/components/admin/roles-page-client'

export default async function RolesPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const roles = await apiFetch<Role[]>('/api/roles', { headers: { Authorization: `Bearer ${token}` } })
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Roles</h1>
      <RolesPageClient initialRoles={roles} />
    </div>
  )
}
