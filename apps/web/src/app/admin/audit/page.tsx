import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { AuditLog } from '@/lib/types'
import { AuditTable } from '@/components/admin/audit-table'

export default async function AuditPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const logs = await apiFetch<AuditLog[]>('/api/audit', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Audit Log</h1>
      <AuditTable logs={logs} />
    </div>
  )
}
