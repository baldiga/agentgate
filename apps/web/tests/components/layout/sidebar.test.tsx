import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/layout/sidebar'
import type { Agent } from '@/lib/types'

const agents: Agent[] = [
  { id: '1', name: 'Support Bot', slug: 'support', description: '', ws_endpoint: '', online: true, locked: false },
  { id: '2', name: 'Finance AI', slug: 'finance', description: '', ws_endpoint: '', online: false, locked: true },
]

jest.mock('next/navigation', () => ({ usePathname: () => '/support' }))

describe('Sidebar', () => {
  it('renders agent names', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
    expect(screen.getByText('Finance AI')).toBeInTheDocument()
  })

  it('shows lock icon for locked agents', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByLabelText('locked')).toBeInTheDocument()
  })

  it('shows online indicator for online agents', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByLabelText('online')).toBeInTheDocument()
  })

  it('renders footer credit', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByText(/Built by Amir Baldiga/)).toBeInTheDocument()
  })
})
