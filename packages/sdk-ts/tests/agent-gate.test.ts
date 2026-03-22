import { EventEmitter } from 'node:events'
import { createHmac } from 'node:crypto'
import { AgentGate } from '../src/agent-gate'

jest.mock('../src/ws-client')
import { WsClient } from '../src/ws-client'
const MockWsClient = WsClient as jest.MockedClass<typeof WsClient>

const TOKEN = 'test-sdk-token-for-agentgate'
const AGENT_ID = 'cmo-agent'
const GATEWAY = 'ws://localhost:3001'

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

function makeWsInstance() {
  const emitter = new EventEmitter()
  return Object.assign(emitter, { send: jest.fn(), connect: jest.fn(), disconnect: jest.fn() })
}

const BASE_CONTEXT = {
  message: 'Hello agent',
  user: { id: 'u_1', name: 'Sara', email: 'sara@acme.com' },
  role: 'MARKETING_MANAGER',
  permissions: ['read'],
  thread_id: 't_1',
  channel_id: null,
  is_superadmin: false,
  sources: {},
}

describe('AgentGate', () => {
  let mockWsInstance: ReturnType<typeof makeWsInstance>

  beforeEach(() => {
    jest.clearAllMocks()
    mockWsInstance = makeWsInstance()
    MockWsClient.mockImplementation(() => mockWsInstance as any)
  })

  it('constructs WsClient with correct WebSocket URL', () => {
    new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    expect(MockWsClient).toHaveBeenCalledWith(expect.objectContaining({
      url: `${GATEWAY}/ws/agent?agentId=${AGENT_ID}&token=${TOKEN}`,
    }))
  })

  it('connect() calls ws.connect()', () => {
    const agent = new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    agent.connect()
    expect(mockWsInstance.connect).toHaveBeenCalled()
  })

  it('disconnect() calls ws.disconnect()', () => {
    const agent = new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    agent.disconnect()
    expect(mockWsInstance.disconnect).toHaveBeenCalled()
  })

  it('calls handler with MessageContext when a valid HMAC message arrives', async () => {
    const agent = new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    const handler = jest.fn().mockResolvedValue(undefined)
    agent.onMessage(handler)
    agent.connect()

    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    mockWsInstance.emit('message', {
      type: 'message',
      messageId: 'msg-1',
      payload: { ...BASE_CONTEXT, hmac },
    })

    await new Promise(r => setImmediate(r))

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0][0]
    expect(ctx.message).toBe('Hello agent')
    expect(ctx.role).toBe('MARKETING_MANAGER')
  })

  it('drops message and does not call handler when HMAC is invalid', async () => {
    const agent = new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    const handler = jest.fn().mockResolvedValue(undefined)
    agent.onMessage(handler)
    agent.connect()

    mockWsInstance.emit('message', {
      type: 'message',
      messageId: 'msg-bad',
      payload: { ...BASE_CONTEXT, hmac: 'tampered' },
    })

    await new Promise(r => setImmediate(r))
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores frames with type !== "message"', async () => {
    const agent = new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    const handler = jest.fn()
    agent.onMessage(handler)
    agent.connect()

    mockWsInstance.emit('message', { type: 'connected', agentId: AGENT_ID })

    await new Promise(r => setImmediate(r))
    expect(handler).not.toHaveBeenCalled()
  })

  it('onMessage() returns this for chaining', () => {
    const agent = new AgentGate({ token: TOKEN, agentId: AGENT_ID, gatewayUrl: GATEWAY })
    expect(agent.onMessage(jest.fn())).toBe(agent)
  })
})
