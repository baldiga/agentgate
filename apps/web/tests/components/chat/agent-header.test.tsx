import { render, screen } from '@testing-library/react'
import { AgentHeader } from '@/components/chat/agent-header'
import type { Agent } from '@/lib/types'

const agent: Agent = { id: '1', name: 'Support Bot', slug: 'support', description: 'Helps with support', ws_endpoint: '', online: true, locked: false }

describe('AgentHeader', () => {
  it('renders agent name', () => {
    render(<AgentHeader agent={agent} />)
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
  })

  it('shows online status', () => {
    render(<AgentHeader agent={agent} />)
    expect(screen.getByText(/online/i)).toBeInTheDocument()
  })
})
