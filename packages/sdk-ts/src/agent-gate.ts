import { WsClient } from './ws-client'
import { MessageContext } from './message-context'
import { verifyPayloadHmac } from './crypto'
import type { AgentGateOptions, IncomingFrame, UserContext } from './types'

type MessageHandler = (ctx: MessageContext) => Promise<void>

export class AgentGate {
  private readonly ws: WsClient
  private handler: MessageHandler | null = null

  constructor(private readonly options: AgentGateOptions) {
    const { agentId, token, gatewayUrl } = options
    const url = `${gatewayUrl}/ws/agent?agentId=${agentId}&token=${token}`

    this.ws = new WsClient({
      url,
      reconnect: options.reconnect ?? true,
      reconnectMaxDelay: options.reconnectMaxDelay ?? 30000,
    })

    this.ws.on('message', (msg: unknown) => void this.dispatch(msg))
    this.ws.on('open', () => console.log('[AgentGate] Connected'))
    this.ws.on('close', () => console.log('[AgentGate] Disconnected'))
    this.ws.on('error', (err: Error) => console.error('[AgentGate] Error:', err.message))
  }

  onMessage(handler: MessageHandler): this {
    this.handler = handler
    return this
  }

  connect(): this {
    this.ws.connect()
    return this
  }

  disconnect(): void {
    this.ws.disconnect()
  }

  private async dispatch(msg: unknown): Promise<void> {
    if (!isIncomingFrame(msg)) return

    const { messageId, payload } = msg

    if (!verifyPayloadHmac(payload as unknown as Record<string, unknown>, this.options.token)) {
      console.warn('[AgentGate] Dropping message — HMAC verification failed.')
      return
    }

    if (!this.handler) {
      console.warn('[AgentGate] Received a message but no handler is registered.')
      return
    }

    const { hmac: _hmac, ...userContext } = payload
    const ctx = new MessageContext(messageId, userContext as UserContext, this.ws)

    try {
      await this.handler(ctx)
    } catch (err) {
      console.error('[AgentGate] Handler threw an error:', err)
    }
  }
}

function isIncomingFrame(msg: unknown): msg is IncomingFrame {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as IncomingFrame).type === 'message' &&
    typeof (msg as IncomingFrame).messageId === 'string' &&
    typeof (msg as IncomingFrame).payload === 'object' &&
    (msg as IncomingFrame).payload !== null
  )
}
