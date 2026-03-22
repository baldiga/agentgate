import { EventEmitter } from 'node:events'
import { WsClient } from '../src/ws-client'

jest.mock('ws')
import WebSocket from 'ws'
const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>

function makeMockWs() {
  const emitter = new EventEmitter()
  const mockWs = Object.assign(emitter, {
    readyState: WebSocket.OPEN,
    send: jest.fn(),
    close: jest.fn(),
  })
  return mockWs
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('WsClient', () => {
  it('connects by creating a WebSocket with the given URL', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    client.connect()

    expect(MockWebSocket).toHaveBeenCalledWith('ws://test')
  })

  it('emits "open" when WebSocket opens', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    const openSpy = jest.fn()
    client.on('open', openSpy)

    client.connect()
    mockWs.emit('open')

    expect(openSpy).toHaveBeenCalledTimes(1)
  })

  it('emits "message" with parsed JSON when a frame arrives', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    const msgSpy = jest.fn()
    client.on('message', msgSpy)

    client.connect()
    mockWs.emit('message', Buffer.from(JSON.stringify({ type: 'message', messageId: 'x' })))

    expect(msgSpy).toHaveBeenCalledWith({ type: 'message', messageId: 'x' })
  })

  it('ignores malformed (non-JSON) frames', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    const msgSpy = jest.fn()
    client.on('message', msgSpy)

    client.connect()
    expect(() => mockWs.emit('message', Buffer.from('not-json'))).not.toThrow()
    expect(msgSpy).not.toHaveBeenCalled()
  })

  it('sends JSON-serialised data when WebSocket is open', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    client.connect()
    client.send({ type: 'reply', content: 'hello' })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'reply', content: 'hello' }))
  })

  it('does not send when WebSocket is not open', () => {
    const mockWs = makeMockWs()
    ;(mockWs as any).readyState = WebSocket.CLOSED
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    client.connect()
    client.send({ type: 'reply' })

    expect(mockWs.send).not.toHaveBeenCalled()
  })

  it('schedules reconnect after close when reconnect=true', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: true, reconnectMaxDelay: 30000 })
    client.connect()
    mockWs.emit('close')

    expect(jest.getTimerCount()).toBeGreaterThan(0)
  })

  it('does not reconnect when reconnect=false', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: false, reconnectMaxDelay: 30000 })
    client.connect()
    mockWs.emit('close')

    expect(jest.getTimerCount()).toBe(0)
  })

  it('disconnect() closes the WebSocket and stops reconnecting', () => {
    const mockWs = makeMockWs()
    MockWebSocket.mockReturnValue(mockWs as any)

    const client = new WsClient({ url: 'ws://test', reconnect: true, reconnectMaxDelay: 30000 })
    client.connect()
    client.disconnect()

    expect(mockWs.close).toHaveBeenCalled()

    mockWs.emit('close')
    expect(jest.getTimerCount()).toBe(0)
  })
})
