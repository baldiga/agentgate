import WebSocket from 'ws'
import { EventEmitter } from 'node:events'

export interface WsClientOptions {
  url: string
  reconnect: boolean
  reconnectMaxDelay: number
}

export class WsClient extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectDelay = 1000
  private shouldReconnect: boolean

  constructor(private readonly options: WsClientOptions) {
    super()
    this.shouldReconnect = options.reconnect
  }

  connect(): void {
    this.ws = new WebSocket(this.options.url)

    this.ws.on('open', () => {
      this.reconnectDelay = 1000
      this.emit('open')
    })

    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString('utf8')) as unknown
        this.emit('message', msg)
      } catch {
        // Silently drop malformed frames
      }
    })

    this.ws.on('close', () => {
      this.emit('close')
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    })

    this.ws.on('error', (err: Error) => {
      this.emit('error', err)
    })
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.ws?.close()
  }

  private scheduleReconnect(): void {
    const jitter = (Math.random() - 0.5) * 0.5 * this.reconnectDelay
    const delay = Math.min(this.reconnectDelay + jitter, this.options.reconnectMaxDelay)
    setTimeout(() => this.connect(), delay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.options.reconnectMaxDelay)
  }
}
