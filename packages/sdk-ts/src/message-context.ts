import type { UserContext, Permission, AgentUser, AgentSources, ReplyFrame } from './types'
import type { WsClient } from './ws-client'

export class MessageContext {
  readonly message: string
  readonly user: AgentUser
  readonly role: string
  readonly permissions: Permission[]
  readonly thread_id: string
  readonly channel_id: string | null
  readonly is_superadmin: boolean
  readonly sources: AgentSources

  constructor(
    private readonly messageId: string,
    payload: UserContext,
    private readonly ws: Pick<WsClient, 'send'>
  ) {
    this.message = payload.message
    this.user = payload.user
    this.role = payload.role
    this.permissions = payload.permissions
    this.thread_id = payload.thread_id
    this.channel_id = payload.channel_id
    this.is_superadmin = payload.is_superadmin
    this.sources = payload.sources
  }

  async reply(content: string): Promise<void> {
    const frame: ReplyFrame = {
      type: 'reply',
      messageId: this.messageId,
      content,
      done: true,
    }
    this.ws.send(frame)
  }

  async replyStream(generator: AsyncIterable<string>): Promise<void> {
    for await (const chunk of generator) {
      const frame: ReplyFrame = {
        type: 'reply',
        messageId: this.messageId,
        content: chunk,
        done: false,
      }
      this.ws.send(frame)
    }
    const closer: ReplyFrame = {
      type: 'reply',
      messageId: this.messageId,
      content: '',
      done: true,
    }
    this.ws.send(closer)
  }
}
