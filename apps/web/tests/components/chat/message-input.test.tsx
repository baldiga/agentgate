import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '@/components/chat/message-input'

describe('MessageInput', () => {
  it('renders textarea', () => {
    render(<MessageInput onSend={jest.fn()} disabled={false} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('calls onSend with trimmed text when Enter is pressed', async () => {
    const onSend = jest.fn()
    render(<MessageInput onSend={onSend} disabled={false} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hello')
  })

  it('does not call onSend when disabled', async () => {
    const onSend = jest.fn()
    render(<MessageInput onSend={onSend} disabled={true} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clears input after send', async () => {
    render(<MessageInput onSend={jest.fn()} disabled={false} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello{Enter}')
    expect(input).toHaveValue('')
  })
})
