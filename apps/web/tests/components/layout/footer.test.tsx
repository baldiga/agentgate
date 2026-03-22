import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/footer'

describe('Footer', () => {
  it('renders the credit line', () => {
    render(<Footer />)
    expect(screen.getByText(/Built by Amir Baldiga/)).toBeInTheDocument()
  })

  it('links to LinkedIn', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /connect on linkedin/i })
    expect(link).toHaveAttribute('href', 'https://linkedin.com/in/amirbaldiga')
  })
})
