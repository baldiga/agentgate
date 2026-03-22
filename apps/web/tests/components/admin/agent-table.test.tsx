import { render, screen } from '@testing-library/react'
import { AgentTable } from '@/components/admin/agent-table'
import type { Agent } from '@/lib/types'

const agents: Agent[] = [
  { id: '1', name: 'Support Bot', slug: 'support', description: 'Support', ws_endpoint: 'ws://x', online: true, locked: false },
  { id: '2', name: 'Finance AI', slug: 'finance', description: 'Finance', ws_endpoint: 'ws://y', online: false, locked: false },
]

describe('AgentTable', () => {
  it('renders agent names in rows', () => {
    render(<AgentTable agents={agents} onDelete={jest.fn()} />)
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
    expect(screen.getByText('Finance AI')).toBeInTheDocument()
  })

  it('shows online badge for online agents', () => {
    render(<AgentTable agents={agents} onDelete={jest.fn()} />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders Edit and Delete actions for each row', () => {
    render(<AgentTable agents={agents} onDelete={jest.fn()} />)
    expect(screen.getAllByRole('link', { name: /edit/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })
})
