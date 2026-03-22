import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentConfigTabs } from '@/components/admin/agent-config-tabs'
import type { Agent } from '@/lib/types'

const agent: Agent = { id: '1', name: 'Support Bot', slug: 'support', description: 'Help', ws_endpoint: 'ws://x', online: true, locked: false }

describe('AgentConfigTabs', () => {
  it('renders General, Permissions, and Sources tabs', () => {
    render(<AgentConfigTabs agent={agent} roles={[]} permissions={[]} />)
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sources/i })).toBeInTheDocument()
  })

  it('shows General tab content by default', () => {
    render(<AgentConfigTabs agent={agent} roles={[]} permissions={[]} />)
    expect(screen.getByDisplayValue('Support Bot')).toBeInTheDocument()
  })

  it('switches to Permissions tab on click', async () => {
    render(<AgentConfigTabs agent={agent} roles={[]} permissions={[]} />)
    await userEvent.click(screen.getByRole('tab', { name: /permissions/i }))
    expect(screen.getByText(/role permissions/i)).toBeInTheDocument()
  })
})
