# AgentGate — Plan 2: TypeScript & Python SDKs

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two language-native SDKs (TypeScript/npm and Python/PyPI) that allow enterprise agents to connect to AgentGate, receive permission-enriched messages, verify payload integrity via HMAC, and reply synchronously or via streaming.

**Architecture:** Each SDK is a standalone package in the Turborepo monorepo. TypeScript SDK uses the `ws` npm package for WebSocket with auto-reconnect + exponential backoff. Python SDK uses the `websockets` asyncio library. Both expose an identical logical API: instantiate → register handler → connect. The WebSocket protocol is: platform sends `{ type: 'message', messageId, payload: UserContext & { hmac } }`, agent replies with `{ type: 'reply', messageId, content, done }`. HMAC verification (HMAC-SHA256 with canonical key-sorted JSON) protects against tampered payloads — agents must drop messages that fail verification.

**Prerequisite:** Plan 1 (backend) must be complete. The backend WebSocket handler (`apps/api/src/ws/handler.ts`) computes the HMAC before sending and is the counterpart to both SDKs.

**Tech Stack:** TypeScript 5, `ws@8`, `tsup` (build/bundle), Jest + ts-jest. Python 3.10+, `websockets@12`, `pytest` + `pytest-asyncio`, `setuptools`.

**Next:** See `2026-03-22-agentgate-plan3-frontend.md`

---

## File Map

### TypeScript SDK (`packages/sdk-ts/`)

| File | Responsibility |
|---|---|
| `package.json` | Package config, deps (`ws`), scripts (build/test) |
| `tsconfig.json` | TypeScript compiler — strict, ESNext, source in `src/` |
| `jest.config.ts` | Jest config with ts-jest, test match `tests/**/*.test.ts` |
| `src/types.ts` | All exported types: `UserContext`, `AgentGateOptions`, `Permission`, `AgentUser`, `AgentSources` |
| `src/crypto.ts` | `verifyPayloadHmac(payload, token)` — HMAC-SHA256 over canonical key-sorted JSON |
| `src/ws-client.ts` | `WsClient` class — raw WebSocket wrapper with auto-reconnect (exponential backoff, jitter) |
| `src/message-context.ts` | `MessageContext` class — exposes `reply()` and `replyStream()`, holds `UserContext` fields |
| `src/agent-gate.ts` | `AgentGate` class — constructs WS URL, manages handler, verifies HMAC before dispatch |
| `src/index.ts` | Re-exports all public API |
| `tests/crypto.test.ts` | Unit: HMAC valid/tampered/modified |
| `tests/ws-client.test.ts` | Unit: connect, send, reconnect schedule, disconnect (mock `ws`) |
| `tests/message-context.test.ts` | Unit: reply sends correct frame, replyStream sends chunks then done |
| `tests/agent-gate.test.ts` | Unit: handler called, invalid HMAC dropped, no handler warning |
| `tests/integration.test.ts` | Integration: real WsServer, full send/reply cycle |

### Python SDK (`packages/sdk-py/`)

| File | Responsibility |
|---|---|
| `pyproject.toml` | Package config, deps (`websockets`), dev deps, pytest config |
| `src/agentgate/__init__.py` | Re-exports public API |
| `src/agentgate/types.py` | `UserContext`, `AgentUser`, `AgentSources`, `Permission` dataclasses |
| `src/agentgate/crypto.py` | `verify_payload_hmac(payload, token)` — HMAC-SHA256, matches TS canonical format |
| `src/agentgate/ws_client.py` | `WsClient` asyncio class — auto-reconnect with exponential backoff |
| `src/agentgate/message_context.py` | `MessageContext` — `reply()`, `reply_stream()`, holds `UserContext` fields |
| `src/agentgate/agent_gate.py` | `AgentGate` class — decorator `on_message`, async `connect()`, HMAC verification |
| `tests/test_crypto.py` | Unit: HMAC valid/tampered/modified/key-order invariant |
| `tests/test_ws_client.py` | Unit: connect loop, reconnect, disconnect (mock websockets) |
| `tests/test_message_context.py` | Unit: reply frame, reply_stream chunks + done |
| `tests/test_agent_gate.py` | Unit: handler called, invalid HMAC dropped |
| `tests/test_integration.py` | Integration: real websockets server, full send/reply cycle |

---

## Chunk 1: TypeScript SDK — Scaffold, Types, Crypto

### Task 1: TypeScript SDK package scaffold

**Files:**
- Create: `packages/sdk-ts/package.json`
- Create: `packages/sdk-ts/tsconfig.json`
- Create: `packages/sdk-ts/jest.config.ts`

- [ ] **Step 1: Create `packages/sdk-ts/package.json`**

```json
{
  "name": "agentgate-sdk",
  "version": "0.1.0",
  "description": "Official TypeScript SDK for AgentGate — enterprise agent permission framework",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "test": "jest --runInBand",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "keywords": ["agentgate", "agents", "enterprise", "rbac", "sdk"],
  "license": "MIT",
  "dependencies": {
    "ws": "^8.17.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/ws": "^8.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/sdk-ts/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create `packages/sdk-ts/jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}

export default config
```

- [ ] **Step 4: Install dependencies**

Run: `cd packages/sdk-ts && npm install`

Expected: `node_modules/` created, `ws`, `jest`, `ts-jest`, `tsup` present.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-ts/package.json packages/sdk-ts/tsconfig.json packages/sdk-ts/jest.config.ts
git commit -m "feat(sdk-ts): initialise TypeScript SDK package scaffold"
```

---

### Task 2: Types + HMAC crypto (`src/types.ts`, `src/crypto.ts`)

**Files:**
- Create: `packages/sdk-ts/src/types.ts`
- Create: `packages/sdk-ts/src/crypto.ts`
- Create: `packages/sdk-ts/tests/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sdk-ts/tests/crypto.test.ts`:

```typescript
import { createHmac } from 'node:crypto'
import { verifyPayloadHmac } from '../src/crypto'

// Helper: build a signed payload using the same algorithm as the backend
type SortableValue = string | number | boolean | null | SortableObject | SortableValue[]
type SortableObject = { [key: string]: SortableValue }
function sortKeys(value: SortableValue): SortableValue {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value as SortableObject)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys((value as SortableObject)[key])
        return acc
      }, {} as SortableObject)
  }
  return value
}

function signPayload(payload: object, token: string): string {
  const canonical = JSON.stringify(sortKeys(payload as SortableValue))
  return createHmac('sha256', token).update(canonical).digest('hex')
}

const TOKEN = 'sdk-token-for-testing-hmac'

const BASE_CONTEXT = {
  message: 'What is Q1 budget?',
  user: { id: 'u_1', name: 'Sara M.', email: 'sara@acme.com' },
  role: 'MARKETING_MANAGER',
  permissions: ['read', 'query'],
  thread_id: 't_456',
  channel_id: null,
  is_superadmin: false,
  sources: { files: [], api_keys: [], repos: [] },
}

describe('verifyPayloadHmac', () => {
  it('returns true for a correctly signed payload', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, hmac }, TOKEN)).toBe(true)
  })

  it('returns false when hmac field is tampered', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, hmac: hmac + 'x' }, TOKEN)).toBe(false)
  })

  it('returns false when payload content is modified after signing', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, role: 'SUPERADMIN', hmac }, TOKEN)).toBe(false)
  })

  it('returns false when token is wrong', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    expect(verifyPayloadHmac({ ...BASE_CONTEXT, hmac }, 'wrong-token')).toBe(false)
  })

  it('is invariant to key ordering in the received payload', () => {
    const hmac = signPayload(BASE_CONTEXT, TOKEN)
    // Reorder top-level keys in the payload object received
    const reordered = {
      hmac,
      sources: BASE_CONTEXT.sources,
      message: BASE_CONTEXT.message,
      is_superadmin: BASE_CONTEXT.is_superadmin,
      channel_id: BASE_CONTEXT.channel_id,
      thread_id: BASE_CONTEXT.thread_id,
      permissions: BASE_CONTEXT.permissions,
      role: BASE_CONTEXT.role,
      user: BASE_CONTEXT.user,
    }
    expect(verifyPayloadHmac(reordered, TOKEN)).toBe(true)
  })

  it('returns false when hmac field is missing', () => {
    expect(verifyPayloadHmac(BASE_CONTEXT as any, TOKEN)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk-ts && npm test -- tests/crypto.test.ts`

Expected: FAIL — `Cannot find module '../src/crypto'`

- [ ] **Step 3: Create `packages/sdk-ts/src/types.ts`**

```typescript
export type Permission = 'read' | 'query' | 'request' | 'instruct' | 'trigger_subagents'

export interface AgentUser {
  id: string
  name: string
  email: string
}

export interface FileSource {
  name: string
  retrieval_query_url: string
}

export interface ApiKeySource {
  name: string
  endpoint: string
  token: string
}

export interface RepoSource {
  name: string
  clone_url: string
  branch: string
}

export interface AgentSources {
  files?: FileSource[]
  api_keys?: ApiKeySource[]
  repos?: RepoSource[]
}

export interface UserContext {
  message: string
  user: AgentUser
  role: string
  permissions: Permission[]
  thread_id: string
  channel_id: string | null
  is_superadmin: boolean
  sources: AgentSources
}

export interface AgentGateOptions {
  /** Plaintext SDK token shown at generation time */
  token: string
  /** Agent ID registered in AgentGate */
  agentId: string
  /** WebSocket gateway URL, e.g. "ws://localhost:3001" or "wss://gate.acme.com" */
  gatewayUrl: string
  /** Auto-reconnect on disconnect. Default: true */
  reconnect?: boolean
  /** Maximum reconnect delay in ms. Default: 30000 */
  reconnectMaxDelay?: number
}

/** Protocol frame from platform to agent */
export interface IncomingFrame {
  type: 'message'
  messageId: string
  payload: UserContext & { hmac: string }
}

/** Protocol frame from agent to platform */
export interface ReplyFrame {
  type: 'reply'
  messageId: string
  content: string
  done: boolean
}
```

- [ ] **Step 4: Create `packages/sdk-ts/src/crypto.ts`**

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

type SortableValue = string | number | boolean | null | SortableObject | SortableValue[]
type SortableObject = { [key: string]: SortableValue }

/**
 * Recursively sort object keys for canonical JSON serialisation.
 * Arrays are NOT reordered — only object keys are sorted.
 */
function sortKeys(value: SortableValue): SortableValue {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value as SortableObject)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys((value as SortableObject)[key])
        return acc
      }, {} as SortableObject)
  }
  return value
}

/**
 * Verify the HMAC-SHA256 signature attached to an incoming payload.
 *
 * The platform computes: HMAC-SHA256(JSON.stringify(sortKeys(userContext)), token)
 * and sends the result as payload.hmac. We verify by recomputing the same digest
 * over the payload minus the hmac field.
 *
 * Returns false if hmac is missing, tampered, or the token is wrong.
 */
export function verifyPayloadHmac(payload: Record<string, unknown>, token: string): boolean {
  const { hmac, ...rest } = payload
  if (typeof hmac !== 'string' || !hmac) return false

  const canonical = JSON.stringify(sortKeys(rest as SortableValue))
  const expected = createHmac('sha256', token).update(canonical).digest('hex')

  // Use Node.js native timingSafeEqual — both strings are hex (same length if valid)
  // Guard on length first to satisfy Buffer.from requirement of equal-length buffers
  if (expected.length !== hmac.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/sdk-ts && npm test -- tests/crypto.test.ts`

Expected: PASS — 6 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add packages/sdk-ts/src/types.ts packages/sdk-ts/src/crypto.ts packages/sdk-ts/tests/crypto.test.ts
git commit -m "feat(sdk-ts): add types and HMAC crypto verification"
```

---

## Chunk 2: TypeScript SDK — WebSocket Client + MessageContext

### Task 3: WebSocket client with auto-reconnect (`src/ws-client.ts`)

**Files:**
- Create: `packages/sdk-ts/src/ws-client.ts`
- Create: `packages/sdk-ts/tests/ws-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sdk-ts/tests/ws-client.test.ts`:

```typescript
import { EventEmitter } from 'node:events'
import { WsClient } from '../src/ws-client'

// Mock the 'ws' module before importing WsClient
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
    mockWs.readyState = WebSocket.CLOSED
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

    // Timer should be scheduled for reconnect
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

    // Emit close after disconnect — should not schedule reconnect
    mockWs.emit('close')
    expect(jest.getTimerCount()).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk-ts && npm test -- tests/ws-client.test.ts`

Expected: FAIL — `Cannot find module '../src/ws-client'`

- [ ] **Step 3: Create `packages/sdk-ts/src/ws-client.ts`**

```typescript
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
      this.reconnectDelay = 1000 // reset backoff on successful connection
      this.emit('open')
    })

    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString('utf8')) as unknown
        this.emit('message', msg)
      } catch {
        // Silently drop malformed frames — not recoverable
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
    // Exponential backoff with ±25% jitter to avoid thundering herd
    const jitter = (Math.random() - 0.5) * 0.5 * this.reconnectDelay
    const delay = Math.min(this.reconnectDelay + jitter, this.options.reconnectMaxDelay)
    setTimeout(() => this.connect(), delay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.options.reconnectMaxDelay)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk-ts && npm test -- tests/ws-client.test.ts`

Expected: PASS — 9 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-ts/src/ws-client.ts packages/sdk-ts/tests/ws-client.test.ts
git commit -m "feat(sdk-ts): add WsClient with auto-reconnect and exponential backoff"
```

---

### Task 4: MessageContext (`src/message-context.ts`)

**Files:**
- Create: `packages/sdk-ts/src/message-context.ts`
- Create: `packages/sdk-ts/tests/message-context.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sdk-ts/tests/message-context.test.ts`:

```typescript
import { MessageContext } from '../src/message-context'
import { UserContext } from '../src/types'

const PAYLOAD: UserContext = {
  message: 'What is Q1 budget?',
  user: { id: 'u_1', name: 'Sara', email: 'sara@acme.com' },
  role: 'MARKETING_MANAGER',
  permissions: ['read', 'query'],
  thread_id: 't_1',
  channel_id: null,
  is_superadmin: false,
  sources: { files: [], api_keys: [], repos: [] },
}

function makeMockWs() {
  return { send: jest.fn() }
}

describe('MessageContext', () => {
  it('exposes all UserContext fields directly', () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    expect(ctx.message).toBe('What is Q1 budget?')
    expect(ctx.user).toEqual({ id: 'u_1', name: 'Sara', email: 'sara@acme.com' })
    expect(ctx.role).toBe('MARKETING_MANAGER')
    expect(ctx.permissions).toEqual(['read', 'query'])
    expect(ctx.thread_id).toBe('t_1')
    expect(ctx.channel_id).toBeNull()
    expect(ctx.is_superadmin).toBe(false)
    expect(ctx.sources).toEqual({ files: [], api_keys: [], repos: [] })
  })

  it('reply() sends a single done=true frame', async () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    await ctx.reply('Here is your budget summary.')

    expect(ws.send).toHaveBeenCalledTimes(1)
    expect(ws.send).toHaveBeenCalledWith({
      type: 'reply',
      messageId: 'msg-1',
      content: 'Here is your budget summary.',
      done: true,
    })
  })

  it('replyStream() sends one done=false chunk per iteration then a done=true closer', async () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    async function* generate() {
      yield 'chunk-1'
      yield 'chunk-2'
      yield 'chunk-3'
    }

    await ctx.replyStream(generate())

    expect(ws.send).toHaveBeenCalledTimes(4) // 3 chunks + 1 closer
    expect(ws.send).toHaveBeenNthCalledWith(1, {
      type: 'reply', messageId: 'msg-1', content: 'chunk-1', done: false,
    })
    expect(ws.send).toHaveBeenNthCalledWith(2, {
      type: 'reply', messageId: 'msg-1', content: 'chunk-2', done: false,
    })
    expect(ws.send).toHaveBeenNthCalledWith(3, {
      type: 'reply', messageId: 'msg-1', content: 'chunk-3', done: false,
    })
    expect(ws.send).toHaveBeenNthCalledWith(4, {
      type: 'reply', messageId: 'msg-1', content: '', done: true,
    })
  })

  it('replyStream() with empty generator sends only the done=true closer', async () => {
    const ws = makeMockWs()
    const ctx = new MessageContext('msg-1', PAYLOAD, ws as any)

    async function* empty() {}
    await ctx.replyStream(empty())

    expect(ws.send).toHaveBeenCalledTimes(1)
    expect(ws.send).toHaveBeenCalledWith({
      type: 'reply', messageId: 'msg-1', content: '', done: true,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk-ts && npm test -- tests/message-context.test.ts`

Expected: FAIL — `Cannot find module '../src/message-context'`

- [ ] **Step 3: Create `packages/sdk-ts/src/message-context.ts`**

```typescript
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

  /** Send a single complete response. */
  async reply(content: string): Promise<void> {
    const frame: ReplyFrame = {
      type: 'reply',
      messageId: this.messageId,
      content,
      done: true,
    }
    this.ws.send(frame)
  }

  /** Stream response chunks, then send a done=true closer. */
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
    // Always send closer so the platform knows streaming is finished
    const closer: ReplyFrame = {
      type: 'reply',
      messageId: this.messageId,
      content: '',
      done: true,
    }
    this.ws.send(closer)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk-ts && npm test -- tests/message-context.test.ts`

Expected: PASS — 4 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-ts/src/message-context.ts packages/sdk-ts/tests/message-context.test.ts
git commit -m "feat(sdk-ts): add MessageContext with reply() and replyStream()"
```

---

## Chunk 3: TypeScript SDK — AgentGate Class, Integration Test, Build

### Task 5: AgentGate class + index (`src/agent-gate.ts`, `src/index.ts`)

**Files:**
- Create: `packages/sdk-ts/src/agent-gate.ts`
- Create: `packages/sdk-ts/src/index.ts`
- Create: `packages/sdk-ts/tests/agent-gate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sdk-ts/tests/agent-gate.test.ts`:

```typescript
import { EventEmitter } from 'node:events'
import { createHmac } from 'node:crypto'
import { AgentGate } from '../src/agent-gate'

// Mock WsClient so tests don't open real sockets
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

    // Handler is async — wait for microtasks
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk-ts && npm test -- tests/agent-gate.test.ts`

Expected: FAIL — `Cannot find module '../src/agent-gate'`

- [ ] **Step 3: Create `packages/sdk-ts/src/agent-gate.ts`**

```typescript
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

  /** Register the async function that handles incoming messages. */
  onMessage(handler: MessageHandler): this {
    this.handler = handler
    return this
  }

  /** Start the WebSocket connection. Auto-reconnects unless reconnect=false. */
  connect(): this {
    this.ws.connect()
    return this
  }

  /** Close the connection and stop reconnecting. */
  disconnect(): void {
    this.ws.disconnect()
  }

  private async dispatch(msg: unknown): Promise<void> {
    if (!isIncomingFrame(msg)) return

    const { messageId, payload } = msg

    if (!verifyPayloadHmac(payload as Record<string, unknown>, this.options.token)) {
      console.warn('[AgentGate] Dropping message — HMAC verification failed. Payload may be tampered.')
      return
    }

    if (!this.handler) {
      console.warn('[AgentGate] Received a message but no handler is registered. Call agent.onMessage(handler) before connect().')
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
```

- [ ] **Step 4: Create `packages/sdk-ts/src/index.ts`**

```typescript
export { AgentGate } from './agent-gate'
export { MessageContext } from './message-context'
export type {
  AgentGateOptions,
  UserContext,
  AgentUser,
  AgentSources,
  FileSource,
  ApiKeySource,
  RepoSource,
  Permission,
  IncomingFrame,
  ReplyFrame,
} from './types'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/sdk-ts && npm test -- tests/agent-gate.test.ts`

Expected: PASS — 7 tests pass, 0 fail.

- [ ] **Step 6: Run all TypeScript SDK tests**

Run: `cd packages/sdk-ts && npm test`

Expected: PASS — all test suites green (crypto, ws-client, message-context, agent-gate).

- [ ] **Step 7: Commit**

```bash
git add packages/sdk-ts/src/agent-gate.ts packages/sdk-ts/src/index.ts packages/sdk-ts/tests/agent-gate.test.ts
git commit -m "feat(sdk-ts): add AgentGate class with HMAC verification and message dispatch"
```

---

### Task 6: TypeScript SDK integration test + build

**Files:**
- Create: `packages/sdk-ts/tests/integration.test.ts`

> **TDD note:** This task only creates a test file. The implementation was completed in Tasks 3-5. Integration tests exercise existing units over a real WebSocket, so the tests should pass immediately — there is no red step. If they fail, the bug is in a prior task's implementation, not missing code here.

- [ ] **Step 1: Write the integration test**

Create `packages/sdk-ts/tests/integration.test.ts`:

```typescript
/**
 * End-to-end integration test — spins up a real WebSocketServer
 * and verifies the full SDK message/reply cycle.
 */
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
    let agentInstance: AgentGate | null = null

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
  })

  it('drops tampered messages — server receives no reply', async () => {
    // Strategy: server sends tampered message, waits 150ms for a reply.
    // An absence-of-event test inherently requires a timeout — 150ms is
    // generous for any network I/O on localhost even in slow CI.
    const { server, port } = await startServer()
    let agentInstance: AgentGate | null = null

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
          // Resolve after brief window — if SDK was going to reply it would have by now
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
  })

  it('streaming: replyStream sends multiple chunks then done=true closer', async () => {
    const { server, port } = await startServer()
    let agentInstance: AgentGate | null = null

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

      expect(replies).toHaveLength(3) // 2 chunks + 1 closer
      expect(replies[0]).toMatchObject({ done: false, content: 'part-one ' })
      expect(replies[1]).toMatchObject({ done: false, content: 'part-two' })
      expect(replies[2]).toMatchObject({ done: true, content: '' })
    } finally {
      agentInstance?.disconnect()
      await closeServer(server)
    }
  })
})
```

- [ ] **Step 2: Run integration test**

Run: `cd packages/sdk-ts && npm test -- tests/integration.test.ts --testTimeout=10000`

Expected: PASS — 3 integration tests pass.

- [ ] **Step 3: Run full test suite**

Run: `cd packages/sdk-ts && npm test`

Expected: PASS — all 5 test files, all tests green.

- [ ] **Step 4: Build the package**

Run: `cd packages/sdk-ts && npm run build`

Expected: `dist/` created, `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types) all present.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-ts/tests/integration.test.ts
git commit -m "feat(sdk-ts): add integration tests — full send/reply cycle verified"
```

---

## Chunk 4: Python SDK — Scaffold, Types, Crypto

### Task 7: Python SDK package scaffold

**Files:**
- Create: `packages/sdk-py/pyproject.toml`
- Create: `packages/sdk-py/src/agentgate/__init__.py` (empty placeholder)

- [ ] **Step 1: Create `packages/sdk-py/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "agentgate-sdk"
version = "0.1.0"
description = "Official Python SDK for AgentGate — enterprise agent permission framework"
readme = "README.md"
license = { text = "MIT" }
requires-python = ">=3.10"
keywords = ["agentgate", "agents", "enterprise", "rbac", "sdk"]
dependencies = [
  "websockets>=12.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-asyncio>=0.23",
  "pytest-mock>=3.12",
]

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Create directory structure and empty `__init__.py`**

Create the file `packages/sdk-py/src/agentgate/__init__.py` — leave empty for now (populated in Task 10).

- [ ] **Step 3: Install the package in editable mode with dev dependencies**

Run: `cd packages/sdk-py && pip install -e ".[dev]"`

Expected: Package installed in editable mode. `pytest`, `pytest-asyncio`, `websockets` available.

- [ ] **Step 4: Verify pytest runs (zero tests is fine)**

Run: `cd packages/sdk-py && python -m pytest --collect-only`

Expected: `collected 0 items` — no error, setup is correct.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-py/pyproject.toml packages/sdk-py/src/agentgate/__init__.py
git commit -m "feat(sdk-py): initialise Python SDK package scaffold"
```

---

### Task 8: Python types + HMAC crypto

**Files:**
- Create: `packages/sdk-py/src/agentgate/types.py`
- Create: `packages/sdk-py/src/agentgate/crypto.py`
- Create: `packages/sdk-py/tests/test_crypto.py`

- [ ] **Step 1: Write the failing test**

Create `packages/sdk-py/tests/test_crypto.py`:

```python
import hmac as hmac_module
import hashlib
import json
import pytest
from agentgate.crypto import verify_payload_hmac

TOKEN = "sdk-token-for-testing-hmac"

BASE_CONTEXT: dict = {
    "message": "What is Q1 budget?",
    "user": {"id": "u_1", "name": "Sara M.", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read", "query"],
    "thread_id": "t_456",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {"files": [], "api_keys": [], "repos": []},
}


def _sort_keys(obj):
    """Mirror of the canonical key-sort used by the platform backend."""
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def sign_payload(payload: dict, token: str) -> str:
    canonical = json.dumps(_sort_keys(payload), separators=(",", ":"))
    return hmac_module.new(
        token.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def make_signed(**overrides):
    payload = {**BASE_CONTEXT, **overrides}
    hmac_val = sign_payload(payload, TOKEN)
    return {**payload, "hmac": hmac_val}


def test_returns_true_for_valid_hmac():
    payload = make_signed()
    assert verify_payload_hmac(payload, TOKEN) is True


def test_returns_false_when_hmac_is_tampered():
    payload = make_signed()
    payload["hmac"] = payload["hmac"] + "x"
    assert verify_payload_hmac(payload, TOKEN) is False


def test_returns_false_when_payload_content_modified_after_signing():
    payload = make_signed()
    payload["role"] = "SUPERADMIN"  # tamper after signing
    assert verify_payload_hmac(payload, TOKEN) is False


def test_returns_false_when_token_is_wrong():
    payload = make_signed()
    assert verify_payload_hmac(payload, "wrong-token") is False


def test_returns_false_when_hmac_field_missing():
    payload = dict(BASE_CONTEXT)  # no hmac field
    assert verify_payload_hmac(payload, TOKEN) is False


def test_invariant_to_key_ordering_in_received_payload():
    """HMAC must verify even if key order in the received dict differs."""
    payload = make_signed()
    # Reorder keys — Python dicts preserve insertion order, so we force a different order
    reordered = {
        "hmac": payload["hmac"],
        "sources": payload["sources"],
        "message": payload["message"],
        "is_superadmin": payload["is_superadmin"],
        "channel_id": payload["channel_id"],
        "thread_id": payload["thread_id"],
        "permissions": payload["permissions"],
        "role": payload["role"],
        "user": payload["user"],
    }
    assert verify_payload_hmac(reordered, TOKEN) is True


def test_null_channel_id_is_handled():
    """None (JSON null) must be serialised identically to TypeScript JSON.stringify(null)."""
    payload = make_signed(channel_id=None)
    assert verify_payload_hmac(payload, TOKEN) is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk-py && python -m pytest tests/test_crypto.py -v`

Expected: FAIL — `ModuleNotFoundError: No module named 'agentgate.crypto'`

- [ ] **Step 3: Create `packages/sdk-py/src/agentgate/types.py`**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

Permission = Literal["read", "query", "request", "instruct", "trigger_subagents"]


@dataclass
class AgentUser:
    id: str
    name: str
    email: str


@dataclass
class FileSource:
    name: str
    retrieval_query_url: str


@dataclass
class ApiKeySource:
    name: str
    endpoint: str
    token: str


@dataclass
class RepoSource:
    name: str
    clone_url: str
    branch: str


@dataclass
class AgentSources:
    files: list[FileSource] = field(default_factory=list)
    api_keys: list[ApiKeySource] = field(default_factory=list)
    repos: list[RepoSource] = field(default_factory=list)


@dataclass
class UserContext:
    message: str
    user: AgentUser
    role: str
    permissions: list[Permission]
    thread_id: str
    channel_id: str | None
    is_superadmin: bool
    sources: AgentSources
```

- [ ] **Step 4: Create `packages/sdk-py/src/agentgate/crypto.py`**

```python
"""
HMAC-SHA256 payload verification.

The platform backend computes:
  canonical = JSON.stringify(sortKeys(userContext))   # compact, keys sorted
  hmac = HMAC-SHA256(canonical, sdk_token)

We verify by recomputing over the payload minus the 'hmac' key.

CRITICAL: json.dumps must use separators=(',', ':') (compact) to match
TypeScript's JSON.stringify output exactly.
"""

import hashlib
import hmac as _hmac
import json


def _sort_keys(obj):
    """Recursively sort dict keys. Arrays are NOT reordered (only dict keys)."""
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def verify_payload_hmac(payload: dict, token: str) -> bool:
    """
    Return True if payload['hmac'] matches the HMAC-SHA256 computed over
    the payload (excluding the 'hmac' key) with the given token.

    Returns False if the 'hmac' field is missing, invalid, or the token is wrong.
    """
    hmac_value = payload.get("hmac")
    if not hmac_value or not isinstance(hmac_value, str):
        return False

    rest = {k: v for k, v in payload.items() if k != "hmac"}
    canonical = json.dumps(_sort_keys(rest), separators=(",", ":"))

    expected = _hmac.new(
        token.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Timing-safe comparison prevents timing attacks
    return _hmac.compare_digest(expected, hmac_value)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/sdk-py && python -m pytest tests/test_crypto.py -v`

Expected: PASS — 7 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add packages/sdk-py/src/agentgate/types.py packages/sdk-py/src/agentgate/crypto.py packages/sdk-py/tests/test_crypto.py
git commit -m "feat(sdk-py): add types and HMAC-SHA256 crypto verification"
```

---

## Chunk 5: Python SDK — WsClient, MessageContext, AgentGate, Integration

### Task 9: Python WebSocket client (`ws_client.py`)

**Files:**
- Create: `packages/sdk-py/src/agentgate/ws_client.py`
- Create: `packages/sdk-py/tests/test_ws_client.py`

- [ ] **Step 1: Write the failing test**

Create `packages/sdk-py/tests/test_ws_client.py`:

```python
import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from agentgate.ws_client import WsClient


@pytest.mark.asyncio
async def test_message_callback_called_with_parsed_json():
    """WsClient parses incoming JSON frames and calls the registered callback."""
    received = []

    async def on_msg(msg):
        received.append(msg)

    # Create an async iterable that yields one message then stops
    async def fake_ws_iter(messages):
        for m in messages:
            yield m

    class FakeWs:
        def __init__(self, messages):
            self._iter = fake_ws_iter(messages)
            self.closed = False

        def __aiter__(self):
            return self._iter

        async def send(self, data):
            pass

        async def close(self):
            self.closed = True

    msg_data = json.dumps({"type": "message", "messageId": "x"})

    # Patch websockets.connect to return our FakeWs as an async context manager
    fake_ws = FakeWs([msg_data])
    cm = AsyncMock()
    cm.__aenter__.return_value = fake_ws
    cm.__aexit__.return_value = False

    client = WsClient("ws://test", reconnect=False)
    client.on_message(on_msg)

    with patch("agentgate.ws_client.websockets.connect", return_value=cm):
        await client.connect()

    assert received == [{"type": "message", "messageId": "x"}]


@pytest.mark.asyncio
async def test_malformed_frames_are_ignored():
    """Non-JSON frames must not raise and must not call the callback."""
    received = []

    async def on_msg(msg):
        received.append(msg)

    async def fake_ws_iter(messages):
        for m in messages:
            yield m

    class FakeWs:
        def __init__(self, messages):
            self._iter = fake_ws_iter(messages)
            self.closed = False

        def __aiter__(self):
            return self._iter

        async def send(self, data):
            pass

    fake_ws = FakeWs(["not-valid-json"])
    cm = AsyncMock()
    cm.__aenter__.return_value = fake_ws
    cm.__aexit__.return_value = False

    client = WsClient("ws://test", reconnect=False)
    client.on_message(on_msg)

    with patch("agentgate.ws_client.websockets.connect", return_value=cm):
        await client.connect()

    assert received == []


@pytest.mark.asyncio
async def test_send_serialises_to_json():
    """send() JSON-serialises data and passes it to the underlying WebSocket."""
    import json as _json

    sent = []

    class FakeWs:
        closed = False

        async def send(self, data):
            sent.append(data)

    client = WsClient("ws://test", reconnect=False)
    client._ws = FakeWs()  # inject directly — testing send() in isolation

    await client.send({"type": "reply", "done": True})

    assert len(sent) == 1
    parsed = _json.loads(sent[0])
    assert parsed == {"type": "reply", "done": True}


def test_disconnect_sets_should_reconnect_to_false():
    """disconnect() must set _should_reconnect=False so the loop exits on its next check."""
    # Unit test — directly verify the flag mechanism without running the event loop.
    # The integration tests cover actual runtime reconnect-stop behaviour.
    client = WsClient("ws://test", reconnect=True, reconnect_max_delay=30.0)

    # Initially, the flag mirrors the reconnect option
    assert client._should_reconnect is True

    client.disconnect()

    # After disconnect(), flag is False — _run_loop()'s while-check will exit
    assert client._should_reconnect is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk-py && python -m pytest tests/test_ws_client.py -v`

Expected: FAIL — `ModuleNotFoundError: No module named 'agentgate.ws_client'`

- [ ] **Step 3: Create `packages/sdk-py/src/agentgate/ws_client.py`**

```python
"""
Async WebSocket client with auto-reconnect and exponential backoff.
"""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import websockets

logger = logging.getLogger(__name__)

MessageCallback = Callable[[dict], Awaitable[None]]


class WsClient:
    def __init__(
        self,
        url: str,
        reconnect: bool = True,
        reconnect_max_delay: float = 30.0,
    ) -> None:
        self._url = url
        self._reconnect = reconnect
        self._reconnect_max_delay = reconnect_max_delay
        self._should_reconnect = reconnect
        self._reconnect_delay = 1.0
        self._ws = None
        self._message_callback: MessageCallback | None = None
        self._open_callback: Callable[[], None] | None = None

    def on_message(self, callback: MessageCallback) -> None:
        self._message_callback = callback

    def on_open(self, callback: Callable[[], None]) -> None:
        self._open_callback = callback

    async def connect(self) -> None:
        """Connect (and reconnect) until disconnect() is called."""
        self._should_reconnect = self._reconnect
        await self._run_loop()

    async def _run_loop(self) -> None:
        while self._should_reconnect is not False:
            try:
                async with websockets.connect(self._url) as ws:
                    self._ws = ws
                    self._reconnect_delay = 1.0  # reset backoff on success
                    logger.info("[AgentGate] Connected to %s", self._url)
                    if self._open_callback:
                        self._open_callback()

                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                        except (json.JSONDecodeError, ValueError):
                            continue  # drop malformed frames silently
                        if self._message_callback:
                            await self._message_callback(msg)

            except Exception as exc:
                logger.error("[AgentGate] Connection error: %s", exc)
            finally:
                self._ws = None

            if not self._should_reconnect:
                break

            delay = self._reconnect_delay
            logger.info("[AgentGate] Reconnecting in %.1fs...", delay)
            await asyncio.sleep(delay)
            self._reconnect_delay = min(
                self._reconnect_delay * 2, self._reconnect_max_delay
            )

    async def send(self, data: Any) -> None:
        """Send JSON-serialised data. No-op if not connected."""
        if self._ws is not None and not self._ws.closed:
            await self._ws.send(json.dumps(data))

    def disconnect(self) -> None:
        """Stop reconnecting and close the current connection if open.

        Safe to call from both async contexts (e.g., signal handler inside
        asyncio.run()) and sync contexts. In sync contexts the close is
        best-effort — the loop will clean up when it next runs.
        """
        self._should_reconnect = False
        ws = self._ws
        if ws is not None:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(ws.close())
            except RuntimeError:
                # No running event loop — the connection will time out naturally
                pass
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk-py && python -m pytest tests/test_ws_client.py -v`

Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-py/src/agentgate/ws_client.py packages/sdk-py/tests/test_ws_client.py
git commit -m "feat(sdk-py): add async WsClient with auto-reconnect"
```

---

### Task 10: Python MessageContext + AgentGate class

**Files:**
- Create: `packages/sdk-py/src/agentgate/message_context.py`
- Create: `packages/sdk-py/src/agentgate/agent_gate.py`
- Modify: `packages/sdk-py/src/agentgate/__init__.py`
- Create: `packages/sdk-py/tests/test_message_context.py`
- Create: `packages/sdk-py/tests/test_agent_gate.py`

- [ ] **Step 1: Write failing tests for MessageContext**

Create `packages/sdk-py/tests/test_message_context.py`:

```python
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from agentgate.message_context import MessageContext
from agentgate.types import UserContext, AgentUser, AgentSources

PAYLOAD = UserContext(
    message="What is Q1 budget?",
    user=AgentUser(id="u_1", name="Sara", email="sara@acme.com"),
    role="MARKETING_MANAGER",
    permissions=["read", "query"],
    thread_id="t_1",
    channel_id=None,
    is_superadmin=False,
    sources=AgentSources(),
)


def make_ws():
    ws = MagicMock()
    ws.send = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_exposes_all_usercontext_fields():
    ws = make_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    assert ctx.message == "What is Q1 budget?"
    assert ctx.user.name == "Sara"
    assert ctx.role == "MARKETING_MANAGER"
    assert ctx.permissions == ["read", "query"]
    assert ctx.thread_id == "t_1"
    assert ctx.channel_id is None
    assert ctx.is_superadmin is False


@pytest.mark.asyncio
async def test_reply_sends_single_done_true_frame():
    ws = make_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    await ctx.reply("Here is your budget.")

    ws.send.assert_called_once_with({
        "type": "reply",
        "messageId": "msg-1",
        "content": "Here is your budget.",
        "done": True,
    })


@pytest.mark.asyncio
async def test_reply_stream_sends_chunks_then_closer():
    ws = make_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    async def gen():
        yield "chunk-one "
        yield "chunk-two"

    await ctx.reply_stream(gen())

    assert ws.send.call_count == 3
    calls = ws.send.call_args_list

    assert calls[0].args[0] == {"type": "reply", "messageId": "msg-1", "content": "chunk-one ", "done": False}
    assert calls[1].args[0] == {"type": "reply", "messageId": "msg-1", "content": "chunk-two", "done": False}
    assert calls[2].args[0] == {"type": "reply", "messageId": "msg-1", "content": "", "done": True}


@pytest.mark.asyncio
async def test_reply_stream_empty_generator_sends_only_closer():
    ws = make_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    async def empty():
        return
        yield  # make it an async generator

    await ctx.reply_stream(empty())

    ws.send.assert_called_once_with({
        "type": "reply",
        "messageId": "msg-1",
        "content": "",
        "done": True,
    })
```

- [ ] **Step 2: Write failing tests for AgentGate**

Create `packages/sdk-py/tests/test_agent_gate.py`:

```python
import asyncio
import hashlib
import hmac as hmac_module
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agentgate.agent_gate import AgentGate

TOKEN = "test-sdk-token-for-agentgate-py"
AGENT_ID = "cmo-agent"
GATEWAY = "ws://localhost:3001"


def _sort_keys(obj):
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def sign_payload(payload: dict, token: str) -> str:
    canonical = json.dumps(_sort_keys(payload), separators=(",", ":"))
    return hmac_module.new(
        token.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256
    ).hexdigest()


BASE_CONTEXT = {
    "message": "Hello agent",
    "user": {"id": "u_1", "name": "Sara", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read"],
    "thread_id": "t_1",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {},
}


@pytest.mark.asyncio
async def test_handler_called_with_message_context_on_valid_hmac():
    """Handler receives a MessageContext when HMAC is valid."""
    handler_calls = []

    async def handler(ctx):
        handler_calls.append(ctx)

    agent = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    agent.on_message(handler)

    hmac_val = sign_payload(BASE_CONTEXT, TOKEN)
    msg = {
        "type": "message",
        "messageId": "msg-1",
        "payload": {**BASE_CONTEXT, "hmac": hmac_val},
    }

    # Call the internal handler directly (unit test — no real WS needed)
    await agent._handle_message(msg)

    assert len(handler_calls) == 1
    ctx = handler_calls[0]
    assert ctx.message == "Hello agent"
    assert ctx.role == "MARKETING_MANAGER"


@pytest.mark.asyncio
async def test_drops_message_when_hmac_invalid():
    """Handler must NOT be called when HMAC verification fails."""
    handler_calls = []

    async def handler(ctx):
        handler_calls.append(ctx)

    agent = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    agent.on_message(handler)

    msg = {
        "type": "message",
        "messageId": "msg-bad",
        "payload": {**BASE_CONTEXT, "role": "SUPERADMIN", "hmac": "tampered"},
    }

    await agent._handle_message(msg)
    assert handler_calls == []


@pytest.mark.asyncio
async def test_ignores_non_message_frames():
    """Frames with type != 'message' are silently ignored."""
    handler_calls = []

    async def handler(ctx):
        handler_calls.append(ctx)

    agent = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    agent.on_message(handler)

    await agent._handle_message({"type": "connected", "agentId": AGENT_ID})
    assert handler_calls == []


@pytest.mark.asyncio
async def test_on_message_decorator_registers_handler():
    """@agent.on_message decorator must register the function as handler."""
    agent = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)

    @agent.on_message
    async def handle(ctx):
        pass

    # The decorated function is still the original callable
    assert callable(handle)
    assert agent._handler is handle
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/sdk-py && python -m pytest tests/test_message_context.py tests/test_agent_gate.py -v`

Expected: FAIL — `ModuleNotFoundError: No module named 'agentgate.message_context'`

- [ ] **Step 4: Create `packages/sdk-py/src/agentgate/message_context.py`**

```python
from __future__ import annotations

from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

from .types import UserContext, AgentUser, AgentSources, Permission

if TYPE_CHECKING:
    from .ws_client import WsClient


class MessageContext:
    """
    Passed to the user's message handler for each incoming message.
    Exposes the full UserContext as attributes and provides reply methods.
    """

    def __init__(
        self,
        message_id: str,
        payload: UserContext,
        ws: "WsClient",
    ) -> None:
        self._message_id = message_id
        self._ws = ws

        # Expose UserContext fields directly
        self.message: str = payload.message
        self.user: AgentUser = payload.user
        self.role: str = payload.role
        self.permissions: list[Permission] = payload.permissions
        self.thread_id: str = payload.thread_id
        self.channel_id: str | None = payload.channel_id
        self.is_superadmin: bool = payload.is_superadmin
        self.sources: AgentSources = payload.sources

    async def reply(self, content: str) -> None:
        """Send a single complete response."""
        await self._ws.send({
            "type": "reply",
            "messageId": self._message_id,
            "content": content,
            "done": True,
        })

    async def reply_stream(self, generator: AsyncIterator[str]) -> None:
        """Stream response chunks, then close with a done=True frame."""
        async for chunk in generator:
            await self._ws.send({
                "type": "reply",
                "messageId": self._message_id,
                "content": chunk,
                "done": False,
            })
        # Always send closer so the platform knows streaming is complete
        await self._ws.send({
            "type": "reply",
            "messageId": self._message_id,
            "content": "",
            "done": True,
        })
```

- [ ] **Step 5: Create `packages/sdk-py/src/agentgate/agent_gate.py`**

```python
from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from urllib.parse import urlencode

from .crypto import verify_payload_hmac
from .message_context import MessageContext
from .types import (
    AgentSources,
    AgentUser,
    ApiKeySource,
    FileSource,
    RepoSource,
    UserContext,
)
from .ws_client import WsClient

logger = logging.getLogger(__name__)

MessageHandler = Callable[["MessageContext"], Awaitable[None]]


class AgentGate:
    """
    Main SDK entry point. Connect an enterprise agent to AgentGate.

    Usage::

        agent = AgentGate(token="...", agent_id="...", gateway_url="ws://...")

        @agent.on_message
        async def handle(ctx):
            response = await my_logic(ctx.message, ctx.role)
            await ctx.reply(response)

        asyncio.run(agent.connect())
    """

    def __init__(
        self,
        token: str,
        agent_id: str,
        gateway_url: str,
        reconnect: bool = True,
        reconnect_max_delay: float = 30.0,
    ) -> None:
        self._token = token
        self._handler: MessageHandler | None = None

        params = urlencode({"agentId": agent_id, "token": token})
        ws_url = f"{gateway_url}/ws/agent?{params}"

        self._ws = WsClient(ws_url, reconnect=reconnect, reconnect_max_delay=reconnect_max_delay)
        self._ws.on_message(self._handle_message)
        self._ws.on_open(lambda: logger.info("[AgentGate] Connected"))

    def on_message(self, handler: MessageHandler) -> MessageHandler:
        """
        Register a message handler. Can be used as a decorator::

            @agent.on_message
            async def handle(ctx): ...
        """
        self._handler = handler
        return handler  # preserve the function so it's still callable after decoration

    async def connect(self) -> None:
        """Start the WebSocket connection. Blocks until disconnect() is called."""
        await self._ws.connect()

    def disconnect(self) -> None:
        """Close the connection and stop reconnecting."""
        self._ws.disconnect()

    async def _handle_message(self, msg: dict) -> None:
        if msg.get("type") != "message":
            return

        message_id = msg.get("messageId")
        payload = msg.get("payload")

        if not isinstance(message_id, str) or not isinstance(payload, dict):
            return

        if not verify_payload_hmac(payload, self._token):
            logger.warning(
                "[AgentGate] Dropping message %s — HMAC verification failed.", message_id
            )
            return

        if not self._handler:
            logger.warning(
                "[AgentGate] Received message %s but no handler registered. "
                "Call agent.on_message(handler) before connect().",
                message_id,
            )
            return

        user_context = self._parse_user_context(payload)
        ctx = MessageContext(message_id, user_context, self._ws)

        try:
            await self._handler(ctx)
        except Exception:
            logger.exception("[AgentGate] Handler raised an exception for message %s", message_id)

    @staticmethod
    def _parse_user_context(payload: dict) -> UserContext:
        user_data = payload.get("user") or {}
        sources_data = payload.get("sources") or {}

        return UserContext(
            message=payload.get("message", ""),
            user=AgentUser(
                id=user_data.get("id", ""),
                name=user_data.get("name", ""),
                email=user_data.get("email", ""),
            ),
            role=payload.get("role", ""),
            permissions=payload.get("permissions", []),
            thread_id=payload.get("thread_id", ""),
            channel_id=payload.get("channel_id"),
            is_superadmin=bool(payload.get("is_superadmin", False)),
            sources=AgentSources(
                files=[FileSource(**f) for f in sources_data.get("files", [])],
                api_keys=[ApiKeySource(**a) for a in sources_data.get("api_keys", [])],
                repos=[RepoSource(**r) for r in sources_data.get("repos", [])],
            ),
        )
```

- [ ] **Step 6: Update `packages/sdk-py/src/agentgate/__init__.py`**

```python
from .agent_gate import AgentGate
from .types import AgentSources, AgentUser, Permission, UserContext

__all__ = ["AgentGate", "UserContext", "AgentUser", "AgentSources", "Permission"]
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/sdk-py && python -m pytest tests/test_message_context.py tests/test_agent_gate.py -v`

Expected: PASS — all tests green.

- [ ] **Step 8: Commit**

```bash
git add \
  packages/sdk-py/src/agentgate/message_context.py \
  packages/sdk-py/src/agentgate/agent_gate.py \
  packages/sdk-py/src/agentgate/__init__.py \
  packages/sdk-py/tests/test_message_context.py \
  packages/sdk-py/tests/test_agent_gate.py
git commit -m "feat(sdk-py): add MessageContext, AgentGate class, and public __init__"
```

---

### Task 11: Python integration test + full suite

**Files:**
- Create: `packages/sdk-py/tests/test_integration.py`

- [ ] **Step 1: Write the integration test**

Create `packages/sdk-py/tests/test_integration.py`:

```python
"""
End-to-end integration test — starts a real websockets server and verifies
the full SDK message/reply cycle without any mocks.
"""
import asyncio
import hashlib
import hmac as hmac_module
import json
import pytest
import websockets
from websockets.server import WebSocketServerProtocol
from agentgate import AgentGate

TOKEN = "integration-test-token-py-32chars!"
AGENT_ID = "integration-agent-py"


def _sort_keys(obj):
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def sign_payload(payload: dict, token: str) -> str:
    canonical = json.dumps(_sort_keys(payload), separators=(",", ":"))
    return hmac_module.new(
        token.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256
    ).hexdigest()


USER_CONTEXT = {
    "message": "What is Q1 budget?",
    "user": {"id": "u_1", "name": "Sara", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read", "query"],
    "thread_id": "t_1",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {"files": [], "api_keys": [], "repos": []},
}


@pytest.mark.asyncio
async def test_full_message_reply_cycle():
    """Agent receives signed message, handler runs, reply arrives at server."""
    reply_future: asyncio.Future = asyncio.get_running_loop().create_future()

    async def platform_handler(ws: WebSocketServerProtocol):
        hmac_val = sign_payload(USER_CONTEXT, TOKEN)
        await ws.send(json.dumps({
            "type": "message",
            "messageId": "msg-e2e-1",
            "payload": {**USER_CONTEXT, "hmac": hmac_val},
        }))
        raw = await ws.recv()
        reply_future.set_result(json.loads(raw))

    async with websockets.serve(platform_handler, "localhost", 0) as server:
        port = server.sockets[0].getsockname()[1]

        agent = AgentGate(
            token=TOKEN,
            agent_id=AGENT_ID,
            gateway_url=f"ws://localhost:{port}",
            reconnect=False,
        )

        @agent.on_message
        async def handle(ctx):
            await ctx.reply(f"Processed: {ctx.message}")

        agent_task = asyncio.create_task(agent.connect())

        reply = await asyncio.wait_for(reply_future, timeout=5.0)
        agent.disconnect()
        await asyncio.wait_for(agent_task, timeout=2.0)

    assert reply == {
        "type": "reply",
        "messageId": "msg-e2e-1",
        "content": "Processed: What is Q1 budget?",
        "done": True,
    }


@pytest.mark.asyncio
async def test_tampered_message_receives_no_reply():
    """Server sends a message with bad HMAC — agent must not reply."""
    no_reply_event = asyncio.Event()
    reply_received = False

    async def platform_handler(ws: WebSocketServerProtocol):
        nonlocal reply_received
        await ws.send(json.dumps({
            "type": "message",
            "messageId": "msg-tampered",
            "payload": {**USER_CONTEXT, "role": "SUPERADMIN", "hmac": "bad-hmac"},
        }))
        try:
            await asyncio.wait_for(ws.recv(), timeout=0.5)
            reply_received = True
        except asyncio.TimeoutError:
            pass
        no_reply_event.set()

    async with websockets.serve(platform_handler, "localhost", 0) as server:
        port = server.sockets[0].getsockname()[1]

        agent = AgentGate(
            token=TOKEN,
            agent_id=AGENT_ID,
            gateway_url=f"ws://localhost:{port}",
            reconnect=False,
        )

        @agent.on_message
        async def handle(ctx):
            await ctx.reply("should not reach here")

        agent_task = asyncio.create_task(agent.connect())
        await asyncio.wait_for(no_reply_event.wait(), timeout=3.0)
        agent.disconnect()
        await asyncio.wait_for(agent_task, timeout=2.0)

    assert not reply_received


@pytest.mark.asyncio
async def test_streaming_reply_sends_chunks_then_done():
    """reply_stream() delivers multiple chunks followed by done=True closer."""
    frames: list[dict] = []
    done_event = asyncio.Event()

    async def platform_handler(ws: WebSocketServerProtocol):
        hmac_val = sign_payload(USER_CONTEXT, TOKEN)
        await ws.send(json.dumps({
            "type": "message",
            "messageId": "msg-stream",
            "payload": {**USER_CONTEXT, "hmac": hmac_val},
        }))
        async for raw in ws:
            frame = json.loads(raw)
            frames.append(frame)
            if frame.get("done"):
                done_event.set()
                break

    async with websockets.serve(platform_handler, "localhost", 0) as server:
        port = server.sockets[0].getsockname()[1]

        agent = AgentGate(
            token=TOKEN,
            agent_id=AGENT_ID,
            gateway_url=f"ws://localhost:{port}",
            reconnect=False,
        )

        @agent.on_message
        async def handle(ctx):
            async def chunks():
                yield "part-one "
                yield "part-two"

            await ctx.reply_stream(chunks())

        agent_task = asyncio.create_task(agent.connect())
        await asyncio.wait_for(done_event.wait(), timeout=5.0)
        agent.disconnect()
        await asyncio.wait_for(agent_task, timeout=2.0)

    assert len(frames) == 3
    assert frames[0] == {"type": "reply", "messageId": "msg-stream", "content": "part-one ", "done": False}
    assert frames[1] == {"type": "reply", "messageId": "msg-stream", "content": "part-two", "done": False}
    assert frames[2] == {"type": "reply", "messageId": "msg-stream", "content": "", "done": True}
```

- [ ] **Step 2: Run integration test**

Run: `cd packages/sdk-py && python -m pytest tests/test_integration.py -v --timeout=10`

Expected: PASS — 3 integration tests pass.

- [ ] **Step 3: Run full Python SDK test suite**

Run: `cd packages/sdk-py && python -m pytest -v`

Expected: PASS — all test files green (test_crypto, test_ws_client, test_message_context, test_agent_gate, test_integration).

- [ ] **Step 4: Verify package builds cleanly**

Run: `cd packages/sdk-py && pip install build && python -m build --wheel`

Expected: `dist/agentgate_sdk-0.1.0-py3-none-any.whl` created without errors.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk-py/tests/test_integration.py
git commit -m "feat(sdk-py): add integration tests — full send/reply cycle verified"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-22-agentgate-plan2-sdks.md`. Ready to execute?**

*(This plan has subagent support available — execution will use `superpowers:subagent-driven-development` with fresh subagent per task + two-stage review.)*
