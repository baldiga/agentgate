// apps/api/src/messages/streaming.ts
import { redis } from '../redis'

const INBOX_KEY = (agentId: string) => `agent:${agentId}:inbox`
const RESPONSE_KEY = (threadId: string) => `thread:${threadId}:response`

export async function sendToAgent(agentId: string, payload: object): Promise<void> {
  await redis.xadd(INBOX_KEY(agentId), '*', 'payload', JSON.stringify(payload))
}

export async function waitForResponse(threadId: string, timeoutMs: number): Promise<string | null> {
  const key = RESPONSE_KEY(threadId)
  const result = await redis.xread('BLOCK', timeoutMs, 'STREAMS', key, '0-0')
  if (!result) return null
  const fields = result[0][1][result[0][1].length - 1][1]
  const idx = fields.indexOf('content')
  const content = idx >= 0 ? fields[idx + 1] : null
  await redis.del(key)
  return content
}

export async function publishResponse(threadId: string, content: string): Promise<void> {
  const key = RESPONSE_KEY(threadId)
  await redis.xadd(key, '*', 'content', content)
  await redis.expire(key, 60)
}
