import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuditTable } from '@/components/admin/audit-table'
import type { AuditLog } from '@/lib/types'

const logs: AuditLog[] = [
  { id: '1', user_id: 'u1', agent_id: 'a1', action: 'message', outcome: 'delivered', created_at: new Date().toISOString(), encrypted_content: null, role_snapshot: null },
  { id: '2', user_id: 'u2', agent_id: 'a1', action: 'message', outcome: 'rejected', created_at: new Date().toISOString(), encrypted_content: null, role_snapshot: null },
]

describe('AuditTable', () => {
  it('renders log entries', () => {
    render(<AuditTable logs={logs} />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 rows
  })

  it('shows outcome badges', () => {
    render(<AuditTable logs={logs} />)
    expect(screen.getByText('delivered')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })

  it('filters rows by outcome when filter is selected', async () => {
    render(<AuditTable logs={logs} />)
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'rejected')
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + 1
  })
})
