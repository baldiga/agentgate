import { MessageContext } from '../src/message-context'
import { UserContext } from '../src/types'

const PAYLOAD: UserContext = {
  message: 'What is Q1 budget?',
  user: { id: 'u_1', name: 'Sara', email: 'sara@acme.com' },
  role: 'MARKETING_MANAGER',
  permissions: ['read', 'query'],
  thread_id: 't_1',
  channel_id: null,
  is_superadmin: false,
  sources: { files: [], api_keys: [], repos: [] },
}

function makeMockWs() {
  return { send: jest.fn() }
}

describe('MessageContext', () => {
  it('exposes all UserContext fields directly', () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    expect(ctx.message).toBe('What is Q1 budget?')
    expect(ctx.user).toEqual({ id: 'u_1', name: 'Sara', email: 'sara@acme.com' })
    expect(ctx.role).toBe('MARKETING_MANAGER')
    expect(ctx.permissions).toEqual(['read', 'query'])
    expect(ctx.thread_id).toBe('t_1')
    expect(ctx.channel_id).toBeNull()
    expect(ctx.is_superadmin).toBe(false)
    expect(ctx.sources).toEqual({ files: [], api_keys: [], repos: [] })
  })

  it('reply() sends a single done=true frame', async () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    await ctx.reply('Here is your budget summary.')

    expect(ws.send).toHaveBeenCalledTimes(1)
    expect(ws.send).toHaveBeenCalledWith({
      type: 'reply',
      messageId: 'msg-1',
      content: 'Here is your budget summary.',
      done: true,
    })
  })

  it('replyStream() sends one done=false chunk per iteration then a done=true closer', async () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    async function* generate() {
      yield 'chunk-1'
      yield 'chunk-2'
      yield 'chunk-3'
    }

    await ctx.replyStream(generate())

    expect(ws.send).toHaveBeenCalledTimes(4)
    expect(ws.send).toHaveBeenNthCalledWith(1, { type: 'reply', messageId: 'msg-1', content: 'chunk-1', done: false })
    expect(ws.send).toHaveBeenNthCalledWith(2, { type: 'reply', messageId: 'msg-1', content: 'chunk-2', done: false })
    expect(ws.send).toHaveBeenNthCalledWith(3, { type: 'reply', messageId: 'msg-1', content: 'chunk-3', done: false })
    expect(ws.send).toHaveBeenNthCalledWith(4, { type: 'reply', messageId: 'msg-1', content: '', done: true })
  })

  it('replyStream() with empty generator sends only the done=true closer', async () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    async function* empty() {}
    await ctx.replyStream(empty())

    expect(ws.send).toHaveBeenCalledTimes(1)
    expect(ws.send).toHaveBeenCalledWith({ type: 'reply', messageId: 'msg-1', content: '', done: true })
  })
})
