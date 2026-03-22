// apps/api/src/ws/handler.ts
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage, Server } from 'http'
import { redis } from '../redis'
import { validateSdkToken, setAgentStatus } from '../agents/service'
import { publishResponse } from '../messages/streaming'

const INBOX_KEY = (agentId: string) => `agent:${agentId}:inbox`

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/agent' })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)
    const agentId = url.searchParams.get('agentId')
    const token = url.searchParams.get('token')

    if (!agentId || !token) return ws.close(1008, 'Missing agentId or token')

    try {
      if (!(await validateSdkToken(agentId, token))) return ws.close(1008, 'Invalid SDK token')
    } catch {
      return ws.close(1011, 'Auth check failed')
    }

    await setAgentStatus(agentId, 'online')
    console.log(`Agent connected: ${agentId}`)
    let lastId = '$'

    const poll = setInterval(async () => {
      if (ws.readyState !== WebSocket.OPEN) { clearInterval(poll); return }
      try {
        const result = await redis.xread('COUNT', 10, 'STREAMS', INBOX_KEY(agentId), lastId)
        if (!result) return
        for (const [, entries] of result) {
          for (const [id, fields] of entries) {
            lastId = id
            const pi = fields.indexOf('payload')
            if (pi >= 0) ws.send(fields[pi + 1])
          }
        }
      } catch (err) {
        console.error('WS poll error:', err)
      }
    }, 100)

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'response' && msg.thread_id && msg.content) {
          await publishResponse(msg.thread_id, msg.content)
        }
      } catch {}
    })

    ws.on('close', async () => {
      clearInterval(poll)
      try {
        await setAgentStatus(agentId, 'offline')
      } catch {}
      console.log(`Agent disconnected: ${agentId}`)
    })

    ws.on('error', (err) => {
      console.error(`WS error for agent ${agentId}:`, err)
    })
  })
}
