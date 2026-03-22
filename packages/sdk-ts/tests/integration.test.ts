import { WebSocketServer } from 'ws'
import { createHmac } from 'node:crypto'
import { AgentGate } from '../src/agent-gate'

const TOKEN = 'integration-test-token-32-chars!'
const AGENT_ID = 'integration-agent'

type SortableValue = string | number | boolean | null | Record<string, unknown> | SortableValue[]
function sortKeys(v: SortableValue): SortableValue {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (typeof v === 'object' && v !== null) {
    return Object.keys(v as Record<string, unknown>).sort().reduce((acc, k) => {
      acc[k] = sortKeys((v as Record<string, unknown>)[k] as SortableValue)
      return acc
    }, {} as Record<string, unknown>)
  }
  return v
}
function signPayload(payload: object, token: string): string {
  return createHmac('sha256', token)
    .update(JSON.stringify(sortKeys(payload as SortableValue)))
    .digest('hex')
}

const USER_CONTEXT = {
  message: 'What is Q1 budget?',
  user: { id: 'u_1', name: 'Sara', email: 'sara@acme.com' },
  role: 'MARKETING_MANAGER',
  permissions: ['read', 'query'],
  thread_id: 't_1',
  channel_id: null,
  is_superadmin: false,
  sources: { files: [], api_keys: [], repos: [] },
}

function startServer(): Promise<{ server: WebSocketServer; port: number }> {
  return new Promise((resolve) => {
    const server = new WebSocketServer({ port: 0 }, () => {
      const addr = server.address() as { port: number }
      resolve({ server, port: addr.port })
    })
  })
}

function closeServer(server: WebSocketServer): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

describe('AgentGate integration', () => {
  it('full cycle: receives signed message, handler runs, reply sent to server', async () => {
    const { server, port } = await startServer()
    let agentInstance: AgentGate | undefined

    try {
      const received = await new Promise<unknown>((resolve, reject) => {
        server.on('connection', (ws) => {
          const hmac = signPayload(USER_CONTEXT, TOKEN)
          ws.send(JSON.stringify({
            type: 'message',
            messageId: 'msg-e2e-1',
            payload: { ...USER_CONTEXT, hmac },
          }))

          ws.on('message', (data: Buffer) => resolve(JSON.parse(data.toString())))
          ws.on('error', reject)
        })

        agentInstance = new AgentGate({
          token: TOKEN,
          agentId: AGENT_ID,
          gatewayUrl: `ws://localhost:${port}`,
          reconnect: false,
        })

        agentInstance.onMessage(async (ctx) => {
          await ctx.reply(`Processed: ${ctx.message}`)
        })

        agentInstance.connect()
      })

      expect(received).toMatchObject({
        type: 'reply',
        messageId: 'msg-e2e-1',
        content: 'Processed: What is Q1 budget?',
        done: true,
      })
    } finally {
      agentInstance?.disconnect()
      await closeServer(server)
    }
  }, 10000)

  it('drops tampered messages — server receives no reply', async () => {
    const { server, port } = await startServer()
    let agentInstance: AgentGate | undefined

    try {
      let replyReceived = false

      await new Promise<void>((resolve) => {
        server.on('connection', (ws) => {
          ws.send(JSON.stringify({
            type: 'message',
            messageId: 'msg-tampered',
            payload: { ...USER_CONTEXT, role: 'SUPERADMIN', hmac: 'bad-hmac' },
          }))
          ws.on('message', () => { replyReceived = true })
          setTimeout(resolve, 150)
        })

        agentInstance = new AgentGate({
          token: TOKEN,
          agentId: AGENT_ID,
          gatewayUrl: `ws://localhost:${port}`,
          reconnect: false,
        })

        agentInstance.onMessage(async (ctx) => { await ctx.reply('should not reach here') })
        agentInstance.connect()
      })

      expect(replyReceived).toBe(false)
    } finally {
      agentInstance?.disconnect()
      await closeServer(server)
    }
  }, 10000)

  it('streaming: replyStream sends multiple chunks then done=true closer', async () => {
    const { server, port } = await startServer()
    let agentInstance: AgentGate | undefined

    try {
      const replies: unknown[] = []

      await new Promise<void>((resolve, reject) => {
        server.on('connection', (ws) => {
          const hmac = signPayload(USER_CONTEXT, TOKEN)
          ws.send(JSON.stringify({
            type: 'message',
            messageId: 'msg-stream',
            payload: { ...USER_CONTEXT, hmac },
          }))

          ws.on('message', (data: Buffer) => {
            const frame = JSON.parse(data.toString()) as { done: boolean }
            replies.push(frame)
            if (frame.done) resolve()
          })
          ws.on('error', reject)
        })

        agentInstance = new AgentGate({
          token: TOKEN,
          agentId: AGENT_ID,
          gatewayUrl: `ws://localhost:${port}`,
          reconnect: false,
        })

        agentInstance.onMessage(async (ctx) => {
          async function* chunks() {
            yield 'part-one '
            yield 'part-two'
          }
          await ctx.replyStream(chunks())
        })

        agentInstance.connect()
      })

      expect(replies).toHaveLength(3)
      expect(replies[0]).toMatchObject({ done: false, content: 'part-one ' })
      expect(replies[1]).toMatchObject({ done: false, content: 'part-two' })
      expect(replies[2]).toMatchObject({ done: true, content: '' })
    } finally {
      agentInstance?.disconnect()
      await closeServer(server)
    }
  }, 10000)
})
