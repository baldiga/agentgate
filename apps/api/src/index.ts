// apps/api/src/index.ts
import 'dotenv/config'
import { config } from './config'
import { checkDb } from './db'
import { runMigrations } from './migrate'
import { createApp } from './app'
import { createServer } from 'http'
import { attachWebSocketServer } from './ws/handler'

async function main() {
  await runMigrations()
  await checkDb()
  const app = createApp()
  const server = createServer(app)
  attachWebSocketServer(server)
  server.listen(config.PORT, () => console.log(`AgentGate API on port ${config.PORT}`))
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1) })
