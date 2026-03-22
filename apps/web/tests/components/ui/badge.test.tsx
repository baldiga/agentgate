import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders label', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders variant=danger with red styles', () => {
    render(<Badge variant="danger">Error</Badge>)
    expect(screen.getByText('Error').className).toContain('bg-danger')
  })
})
