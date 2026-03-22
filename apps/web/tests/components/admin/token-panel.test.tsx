import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TokenPanel } from '@/components/admin/token-panel'
import type { SdkToken } from '@/lib/types'

const tokens: SdkToken[] = [
  { id: '1', agent_id: 'a1', label: 'Production', created_at: new Date().toISOString(), last_used_at: null, grace_until: null },
]

global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ id: '2', agent_id: 'a1', label: 'New', token: 'sk.abc123', created_at: new Date().toISOString(), last_used_at: null, grace_until: null }),
  })
})

describe('TokenPanel', () => {
  it('renders existing tokens', () => {
    render(<TokenPanel agentId="a1" initialTokens={tokens} />)
    expect(screen.getByText('Production')).toBeInTheDocument()
  })

  it('shows generated token once after creation', async () => {
    render(<TokenPanel agentId="a1" initialTokens={tokens} />)
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(await screen.findByText(/sk\./)).toBeInTheDocument()
  })

  it('renders revoke button for each token', () => {
    render(<TokenPanel agentId="a1" initialTokens={tokens} />)
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
  })
})
