import { render, screen } from '@testing-library/react'
import { MessageList } from '@/components/chat/message-list'
import type { Message } from '@/lib/types'

const messages: Message[] = [
  { id: '1', thread_id: 't1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
  { id: '2', thread_id: 't1', role: 'agent', content: 'Hi', created_at: new Date().toISOString() },
]

describe('MessageList', () => {
  it('renders all messages', () => {
    render(<MessageList messages={messages} loading={false} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi')).toBeInTheDocument()
  })

  it('shows loading indicator when loading=true', () => {
    render(<MessageList messages={[]} loading={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
