import { render, screen } from '@testing-library/react'
import { MessageBubble } from '@/components/chat/message-bubble'
import type { Message } from '@/lib/types'

const userMsg: Message = { id: '1', thread_id: 't1', role: 'user', content: 'Hello', created_at: new Date().toISOString() }
const agentMsg: Message = { id: '2', thread_id: 't1', role: 'agent', content: 'Hi there', created_at: new Date().toISOString() }

describe('MessageBubble', () => {
  it('renders user message content', () => {
    render(<MessageBubble message={userMsg} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders agent message content', () => {
    render(<MessageBubble message={agentMsg} />)
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('applies different alignment for user vs agent', () => {
    const { container: c1 } = render(<MessageBubble message={userMsg} />)
    const { container: c2 } = render(<MessageBubble message={agentMsg} />)
    expect(c1.firstChild).toHaveClass('justify-end')
    expect(c2.firstChild).toHaveClass('justify-start')
  })
})
