import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetupPage from '@/app/setup/page'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('SetupPage', () => {
  it('renders the setup form', () => {
    render(<SetupPage />)
    expect(screen.getByText(/create superadmin/i)).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    render(<SetupPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@test.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123')
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
  })
})
