import { render, screen } from '@testing-library/react'
import { PermissionBar } from '@/components/chat/permission-bar'

describe('PermissionBar', () => {
  it('renders nothing when allowedActions is empty', () => {
    const { container } = render(<PermissionBar allowedActions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders each allowed action as a badge', () => {
    render(<PermissionBar allowedActions={['read', 'query']} />)
    expect(screen.getByText('read')).toBeInTheDocument()
    expect(screen.getByText('query')).toBeInTheDocument()
  })
})
