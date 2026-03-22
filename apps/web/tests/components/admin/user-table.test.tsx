import { render, screen } from '@testing-library/react'
import { UserTable } from '@/components/admin/user-table'
import type { User } from '@/lib/types'

const users: User[] = [
  { id: '1', email: 'alice@test.com', name: 'Alice', system_role: 'user', roles: [{ id: 'r1', name: 'Support Team' }], mfa_required: false, active: true },
  { id: '2', email: 'bob@test.com', name: 'Bob', system_role: 'user', roles: [], mfa_required: true, active: false },
]

describe('UserTable', () => {
  it('renders user emails', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('shows Active/Inactive badge', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows MFA required badge when applicable', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('MFA')).toBeInTheDocument()
  })

  it('shows assigned role names', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('Support Team')).toBeInTheDocument()
  })
})
