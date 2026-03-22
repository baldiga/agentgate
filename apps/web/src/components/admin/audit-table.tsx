'use client'

import { useState } from 'react'
import type { AuditLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface AuditTableProps {
  logs: AuditLog[]
}

export function AuditTable({ logs }: AuditTableProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<'' | 'delivered' | 'rejected' | 'timed_out' | 'redacted'>('')

  const filtered = outcomeFilter ? logs.filter(l => l.outcome === outcomeFilter) : logs

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select
          value={outcomeFilter}
          onChange={e => setOutcomeFilter(e.target.value as '' | 'delivered' | 'rejected' | 'timed_out' | 'redacted')}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">All outcomes</option>
          <option value="delivered">Delivered</option>
          <option value="rejected">Rejected</option>
          <option value="timed_out">Timed out</option>
          <option value="redacted">Redacted</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                <td className="px-4 py-3 text-muted font-mono text-xs">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.user_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.agent_id}</td>
                <td className="px-4 py-3 text-text-secondary">{log.action}</td>
                <td className="px-4 py-3">
                  <Badge variant={log.outcome === 'delivered' ? 'success' : log.outcome === 'rejected' ? 'danger' : 'warning'}>
                    {log.outcome}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
