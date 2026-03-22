import { render, screen } from '@testing-library/react'
import { RoleMatrix } from '@/components/admin/role-matrix'
import type { Role } from '@/lib/types'

const roles: Role[] = [
  { id: '1', name: 'Support Team', mfa_required: false },
  { id: '2', name: 'Finance Team', mfa_required: true },
]

describe('RoleMatrix', () => {
  it('renders role names', () => {
    render(<RoleMatrix roles={roles} onDelete={jest.fn()} />)
    expect(screen.getByText('Support Team')).toBeInTheDocument()
    expect(screen.getByText('Finance Team')).toBeInTheDocument()
  })

  it('shows MFA badge for roles with mfa_required', () => {
    render(<RoleMatrix roles={roles} onDelete={jest.fn()} />)
    expect(screen.getByText('MFA required')).toBeInTheDocument()
  })
})
