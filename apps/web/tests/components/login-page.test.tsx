import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows error on bad credentials', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'x@x.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
  })
})
