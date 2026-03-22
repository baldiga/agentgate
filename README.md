# AgentGate

**Open-source enterprise permission layer for AI agents.**

AgentGate sits between your users and your AI agents. It enforces who can talk to which agent, what actions they can take, and logs everything.

## Features

- Role-based access control (3-layer RBAC)
- Slack-like chat UI per agent
- SuperAdmin panel — manage agents, users, roles, audit logs
- Framework-agnostic SDK (TypeScript + Python)
- Single `docker-compose up` deployment

## Quick Start

```bash
git clone https://github.com/amirbaldiga/agentgate
cd agentgate
cp .env.example .env
# Edit .env — set JWT_SECRET and AGENTGATE_SECRET (use: openssl rand -hex 32)
docker-compose up --build
```

Open http://localhost:3000 → complete the setup wizard → add your first agent.

## Connecting an Agent (TypeScript)

```typescript
import { AgentGate } from 'agentgate-sdk'

const gate = new AgentGate({
  endpoint: 'ws://localhost:4000/ws/agents',
  token: 'your-sdk-token',
})

gate.onMessage(async ctx => {
  await ctx.reply(`Hello from ${ctx.agentSlug}!`)
})

gate.connect()
```

## Connecting an Agent (Python)

```python
from agentgate import AgentGate

gate = AgentGate(
    endpoint="ws://localhost:4000/ws/agents",
    token="your-sdk-token",
)

@gate.on_message
async def handle(ctx):
    await ctx.reply(f"Hello from {ctx.agent_slug}!")

asyncio.run(gate.connect())
```

## Architecture

```
┌─────────┐    REST/WS     ┌──────────┐   WebSocket   ┌──────────┐
│  Users  │◄──────────────►│ AgentGate│◄─────────────►│  Agents  │
│(browser)│                │  (api)   │               │ (your AI)│
└─────────┘                └──────────┘               └──────────┘
                                │
                           ┌────▼─────┐
                           │PostgreSQL│
                           │  Redis   │
                           └──────────┘
```

## License

MIT — Built by [Amir Baldiga](https://linkedin.com/in/amirbaldiga)
