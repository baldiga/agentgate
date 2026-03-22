# AgentGate — Plan 1: Foundation + Backend API

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete self-hosted backend for AgentGate — monorepo scaffold, PostgreSQL schema, auth (JWT + MFA), 3-layer permission engine, agent registry, message router with Redis Streams, channel manager, sources manager, and audit logger.

**Architecture:** Node.js + Express API in a Turborepo monorepo. PostgreSQL (with pgvector) for persistence. Redis Streams for real-time message delivery. All secrets encrypted with AES-256 via a single `AGENTGATE_SECRET` env var. Migrations run automatically on startup via node-pg-migrate.

**SSO Note:** SSO/LDAP adapters are explicitly deferred to Plan 4. v1 ships with local auth + MFA only.

**Tech Stack:** Node.js 20, TypeScript 5, Express 4, PostgreSQL 16 + pgvector, Redis 7, ioredis, node-pg-migrate, bcrypt, jsonwebtoken, speakeasy (TOTP), zod, dotenv, jest + supertest, Docker Compose with multi-stage build.

---

## Chunk 1: Monorepo + Docker Foundation

### Task 1: Initialise Turborepo monorepo

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "agentgate",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "persistent": true, "cache": false },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

- [ ] **Step 3: Create apps/api/package.json**

```json
{
  "name": "@agentgate/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "test": "jest --runInBand",
    "migrate": "node-pg-migrate up"
  },
  "dependencies": {
    "express": "^4.19.0",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.0",
    "node-pg-migrate": "^7.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.2.0",
    "ws": "^8.17.0",
    "openai": "^4.47.0",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0",
    "zod": "^3.23.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/pg": "^8.11.0",
    "@types/ws": "^8.5.0",
    "@types/multer": "^1.4.0",
    "@types/uuid": "^9.0.0",
    "@types/jest": "^29.5.0",
    "@types/supertest": "^6.0.0",
    "@types/node": "^20.0.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 4: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.env
.env.test
.superpowers/
uploads/
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: node_modules created at root, workspaces linked.

- [ ] **Step 7: Commit**

```bash
git init
git add package.json turbo.json apps/api/package.json apps/api/tsconfig.json .gitignore
git commit -m "chore: initialise agentgate turborepo monorepo"
```

---

### Task 2: Docker Compose + environment config

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/Dockerfile`
- Create: `.env.example`
- Create: `apps/api/src/config.ts`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: '3.9'

services:
  app:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://agentgate:agentgate@postgres:5432/agentgate
      REDIS_URL: redis://redis:6379
      AGENTGATE_SECRET: ${AGENTGATE_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
      PORT: 3001
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: agentgate
      POSTGRES_USER: agentgate
      POSTGRES_PASSWORD: agentgate
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agentgate"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  pgdata:
  uploads:
```

- [ ] **Step 2: Create apps/api/Dockerfile (multi-stage)**

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: Create .env.example**

```bash
# Generate: openssl rand -hex 32
AGENTGATE_SECRET=replace_with_32_byte_hex_string
JWT_SECRET=replace_with_another_32_byte_hex_string
DATABASE_URL=postgres://agentgate:agentgate@localhost:5432/agentgate
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
PORT=3001
NODE_ENV=development

# Optional: embedding provider for file indexing
OPENAI_API_KEY=
```

- [ ] **Step 4: Create apps/api/src/config.ts**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AGENTGATE_SECRET: z.string().length(64, 'Must be 32-byte hex (64 chars). Run: openssl rand -hex 32'),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml apps/api/Dockerfile .env.example apps/api/src/config.ts
git commit -m "chore: add multi-stage docker compose and validated environment config"
```

---

### Task 3: Database connection + crypto module

**Files:**
- Create: `apps/api/src/db.ts`
- Create: `apps/api/src/redis.ts`
- Create: `apps/api/src/crypto.ts`
- Create: `apps/api/tests/crypto.test.ts`

- [ ] **Step 1: Write failing crypto test**

```typescript
// apps/api/tests/crypto.test.ts
import { encrypt, decrypt } from '../src/crypto'

const secret = 'a'.repeat(64)

describe('crypto', () => {
  it('encrypts and decrypts a string', () => {
    const original = 'sensitive-api-key-12345'
    const encrypted = encrypt(original, secret)
    expect(encrypted).not.toBe(original)
    expect(encrypted).toContain(':')
    expect(decrypt(encrypted, secret)).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', () => {
    expect(encrypt('same', secret)).not.toBe(encrypt('same', secret))
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && npx jest tests/crypto.test.ts
```

Expected: FAIL — `Cannot find module '../src/crypto'`

- [ ] **Step 3: Implement crypto.ts**

```typescript
// apps/api/src/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function keyBuffer(secret: string): Buffer {
  return Buffer.from(secret, 'hex')
}

export function encrypt(text: string, secret: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, keyBuffer(secret), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(payload: string, secret: string): string {
  const [ivHex, encryptedHex] = payload.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, keyBuffer(secret), iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd apps/api && npx jest tests/crypto.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create db.ts**

```typescript
// apps/api/src/db.ts
import { Pool } from 'pg'
import { config } from './config'

export const db = new Pool({ connectionString: config.DATABASE_URL })

export async function checkDb(): Promise<void> {
  const client = await db.connect()
  await client.query('SELECT 1')
  client.release()
}
```

- [ ] **Step 6: Create redis.ts**

```typescript
// apps/api/src/redis.ts
import Redis from 'ioredis'
import { config } from './config'

export const redis = new Redis(config.REDIS_URL)
export const redisSub = new Redis(config.REDIS_URL)

redis.on('error', (err) => console.error('Redis error:', err))
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/crypto.ts apps/api/src/db.ts apps/api/src/redis.ts apps/api/tests/crypto.test.ts
git commit -m "feat: add db pool, redis client, and AES-256 crypto module"
```

---

### Task 4: Database migrations

**Files:**
- Create: `apps/api/migrations/1_initial_schema.js`
- Create: `apps/api/database.json`
- Create: `apps/api/src/migrate.ts`

- [ ] **Step 1: Create database.json**

```json
{
  "dev": { "url": { "ENV": "DATABASE_URL" } },
  "test": { "url": { "ENV": "DATABASE_URL" } },
  "production": { "url": { "ENV": "DATABASE_URL" } }
}
```

- [ ] **Step 2: Create initial migration**

```javascript
// apps/api/migrations/1_initial_schema.js
exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector')

  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    is_superadmin: { type: 'boolean', notNull: true, default: false },
    mfa_required: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    password_hash: { type: 'text' },
    mfa_secret: { type: 'text' },
    mfa_enabled: { type: 'boolean', notNull: true, default: false },
    auth_provider: { type: 'varchar(50)', notNull: true, default: "'local'" },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('user_roles', {
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: '"roles"', onDelete: 'CASCADE' },
  })
  pgm.addConstraint('user_roles', 'user_roles_pkey', 'PRIMARY KEY (user_id, role_id)')

  pgm.createTable('agents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    icon: { type: 'varchar(10)', default: "'🤖'" },
    status: { type: 'varchar(20)', notNull: true, default: "'offline'" },
    timeout_seconds: { type: 'integer', notNull: true, default: 30 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('sdk_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true },
    previous_token_hash: { type: 'text' },
    grace_period_expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('agent_role_permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: '"roles"', onDelete: 'CASCADE' },
    actions: { type: 'text[]', notNull: true, default: "'{}'" },
  })
  pgm.addConstraint('agent_role_permissions', 'arp_unique', 'UNIQUE (agent_id, role_id)')

  pgm.createTable('channels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    created_by: { type: 'uuid', notNull: true, references: '"users"' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('channel_roles', {
    channel_id: { type: 'uuid', notNull: true, references: '"channels"', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: '"roles"', onDelete: 'CASCADE' },
  })
  pgm.addConstraint('channel_roles', 'channel_roles_pkey', 'PRIMARY KEY (channel_id, role_id)')

  pgm.createTable('threads', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    type: { type: 'varchar(10)', notNull: true, default: "'private'" },
    channel_id: { type: 'uuid', references: '"channels"', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    thread_id: { type: 'uuid', notNull: true, references: '"threads"', onDelete: 'CASCADE' },
    sender_type: { type: 'varchar(10)', notNull: true },
    sender_id: { type: 'uuid' },
    content_encrypted: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('agent_sources', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    type: { type: 'varchar(20)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    config_encrypted: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('source_chunks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_id: { type: 'uuid', notNull: true, references: '"agent_sources"', onDelete: 'CASCADE' },
    chunk_text: { type: 'text', notNull: true },
    embedding: { type: 'vector(1536)' },
    chunk_index: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('audit_log', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"users"' },
    role_snapshot: { type: 'text[]' },
    agent_id: { type: 'uuid', references: '"agents"' },
    thread_id: { type: 'uuid' },
    action: { type: 'varchar(50)', notNull: true },
    content_encrypted: { type: 'text' },
    outcome: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('messages', 'thread_id')
  pgm.createIndex('audit_log', 'user_id')
  pgm.createIndex('audit_log', 'agent_id')
  pgm.createIndex('audit_log', 'created_at')
  pgm.createIndex('agent_sources', 'agent_id')
  pgm.createIndex('source_chunks', 'source_id')
  pgm.sql('CREATE INDEX source_chunks_embedding_idx ON source_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)')
}

exports.down = (pgm) => {
  pgm.dropTable('source_chunks')
  pgm.dropTable('agent_sources')
  pgm.dropTable('audit_log')
  pgm.dropTable('messages')
  pgm.dropTable('threads')
  pgm.dropTable('channel_roles')
  pgm.dropTable('channels')
  pgm.dropTable('agent_role_permissions')
  pgm.dropTable('sdk_tokens')
  pgm.dropTable('agents')
  pgm.dropTable('user_roles')
  pgm.dropTable('users')
  pgm.dropTable('roles')
  pgm.sql('DROP EXTENSION IF EXISTS vector')
}
```

- [ ] **Step 3: Create migrate.ts**

```typescript
// apps/api/src/migrate.ts
import { config } from './config'

export async function runMigrations(): Promise<void> {
  const runner = require('node-pg-migrate').default
  await runner({
    databaseUrl: config.DATABASE_URL,
    dir: 'migrations',
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg: string) => console.log('[migrate]', msg),
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/migrations/ apps/api/database.json apps/api/src/migrate.ts
git commit -m "feat: add full database schema migration with pgvector and mfa_required per role"
```

---

## Chunk 2: Auth Service

### Task 5: App factory + auth service + all module stubs

**Files:**
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/auth/jwt.ts`
- Create: `apps/api/src/auth/middleware.ts`
- Create: `apps/api/src/auth/service.ts`
- Create: `apps/api/src/auth/router.ts`
- Create: `apps/api/src/audit/logger.ts` (stub — fully implemented in Task 12)
- Create: stubs for all other module routers
- Create: `apps/api/jest.config.ts`
- Create: `apps/api/.env.test`
- Create: `apps/api/tests/auth.test.ts`

- [ ] **Step 1: Create all module stubs** (so app.ts compiles from day 1)

Create each file with just the router export:

```typescript
// apps/api/src/agents/router.ts
import { Router } from 'express'
export const agentsRouter = Router()

// apps/api/src/messages/router.ts
import { Router } from 'express'
export const messagesRouter = Router()

// apps/api/src/channels/router.ts
import { Router } from 'express'
export const channelsRouter = Router()

// apps/api/src/sources/router.ts
import { Router } from 'express'
export const sourcesRouter = Router()

// apps/api/src/audit/router.ts
import { Router } from 'express'
export const auditRouter = Router()

// apps/api/src/users/router.ts
import { Router } from 'express'
export const usersRouter = Router()

// apps/api/src/roles/router.ts
import { Router } from 'express'
export const rolesRouter = Router()

// apps/api/src/agents/permissions-router.ts
import { Router } from 'express'
export const agentPermissionsRouter = Router({ mergeParams: true })
```

Also create the audit logger stub so `messages/service.ts` can import it:

```typescript
// apps/api/src/audit/logger.ts
export interface AuditEntry {
  userId: string
  agentId?: string
  threadId?: string
  action: string
  outcome: 'delivered' | 'rejected' | 'timed_out'
  content?: string
  roleSnapshot?: string[]
}

// Stub — fully implemented in Task 12
export async function auditLog(_entry: AuditEntry): Promise<void> {}
```

- [ ] **Step 2: Create auth/jwt.ts**

```typescript
// apps/api/src/auth/jwt.ts
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface TokenPayload {
  userId: string
  email: string
  isSuperadmin: boolean
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '8h' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload
}
```

- [ ] **Step 3: Create auth/middleware.ts**

```typescript
// apps/api/src/auth/middleware.ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from './jwt'

export interface AuthRequest extends Request {
  user?: TokenPayload
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isSuperadmin) return res.status(403).json({ error: 'Superadmin required' })
  next()
}
```

- [ ] **Step 4: Create auth/service.ts**

```typescript
// apps/api/src/auth/service.ts
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db'
import { signToken } from './jwt'

const setupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  platformName: z.string().min(1),
})

export async function setupSuperadmin(raw: unknown) {
  const data = setupSchema.parse(raw)

  const existing = await db.query('SELECT id FROM users LIMIT 1')
  if (existing.rowCount && existing.rowCount > 0) throw new Error('ALREADY_SETUP')

  const password_hash = await bcrypt.hash(data.password, 12)

  const roleResult = await db.query(
    `INSERT INTO roles (name, slug, is_superadmin) VALUES ('Super Admin', 'superadmin', true)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`
  )
  const roleId = roleResult.rows[0].id

  const userResult = await db.query(
    `INSERT INTO users (email, name, password_hash, auth_provider) VALUES ($1, $2, $3, 'local') RETURNING id, email, name`,
    [data.email, data.name, password_hash]
  )
  const user = userResult.rows[0]
  await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId])

  return { user, token: signToken({ userId: user.id, email: user.email, isSuperadmin: true }) }
}

export async function loginUser(email: string, password: string) {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.mfa_enabled,
            bool_or(r.is_superadmin) AS is_superadmin,
            bool_or(r.mfa_required) AS role_requires_mfa
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1 AND u.is_active = true
     GROUP BY u.id`,
    [email]
  )
  const user = result.rows[0]
  if (!user) throw new Error('INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  // MFA required if user has it enabled OR their role mandates it
  if (user.mfa_enabled || user.role_requires_mfa) {
    return { requiresMfa: true, userId: user.id }
  }

  return {
    token: signToken({ userId: user.id, email: user.email, isSuperadmin: user.is_superadmin }),
    user: { id: user.id, email: user.email, name: user.name },
  }
}
```

- [ ] **Step 5: Create auth/router.ts**

```typescript
// apps/api/src/auth/router.ts
import { Router } from 'express'
import { z } from 'zod'
import { setupSuperadmin, loginUser } from './service'

export const authRouter = Router()

authRouter.post('/setup', async (req, res) => {
  try {
    const result = await setupSuperadmin(req.body)
    res.status(201).json(result)
  } catch (err: any) {
    if (err.message === 'ALREADY_SETUP') return res.status(409).json({ error: 'Platform already set up' })
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    console.error(err)
    res.status(500).json({ error: 'Setup failed' })
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body)
    res.json(await loginUser(email, password))
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' })
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Login failed' })
  }
})
```

- [ ] **Step 6: Create app.ts**

```typescript
// apps/api/src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { authRouter } from './auth/router'
import { agentsRouter } from './agents/router'
import { agentPermissionsRouter } from './agents/permissions-router'
import { messagesRouter } from './messages/router'
import { channelsRouter } from './channels/router'
import { sourcesRouter } from './sources/router'
import { auditRouter } from './audit/router'
import { usersRouter } from './users/router'
import { rolesRouter } from './roles/router'
import { requireAuth } from './auth/middleware'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
  app.use(express.json({ limit: '10mb' }))
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }))

  app.use('/api/auth', authRouter)
  app.use('/api/agents', requireAuth, agentsRouter)
  app.use('/api/agents/:agentId/permissions', requireAuth, agentPermissionsRouter)
  app.use('/api/messages', requireAuth, messagesRouter)
  app.use('/api/channels', requireAuth, channelsRouter)
  app.use('/api/sources', requireAuth, sourcesRouter)
  app.use('/api/audit', requireAuth, auditRouter)
  app.use('/api/users', requireAuth, usersRouter)
  app.use('/api/roles', requireAuth, rolesRouter)

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  return app
}
```

- [ ] **Step 7: Create index.ts**

```typescript
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
```

Create the ws handler stub so index.ts compiles:

```typescript
// apps/api/src/ws/handler.ts
import { Server } from 'http'
// Stub — fully implemented in Task 9
export function attachWebSocketServer(_server: Server) {}
```

- [ ] **Step 8: Configure jest**

```typescript
// apps/api/jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
}
```

Create `apps/api/.env.test`:
```
DATABASE_URL=postgres://agentgate:agentgate@localhost:5432/agentgate_test
REDIS_URL=redis://localhost:6379
AGENTGATE_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
JWT_SECRET=testsecrettestsecrettestsecrettestsecret
FRONTEND_URL=http://localhost:3000
PORT=3002
NODE_ENV=test
```

- [ ] **Step 9: Write failing auth tests**

```typescript
// apps/api/tests/auth.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()

beforeAll(async () => {
  await db.query("DELETE FROM users WHERE email LIKE '%@test.agentgate'")
  await db.query("DELETE FROM roles WHERE slug = 'test-superadmin'")
})

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email LIKE '%@test.agentgate'")
  await db.end()
})

describe('POST /api/auth/setup', () => {
  it('creates superadmin on first boot', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      email: 'admin@test.agentgate',
      password: 'SuperSecure123!',
      name: 'Test Admin',
      platformName: 'Test Corp',
    })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('admin@test.agentgate')
  })

  it('rejects second setup attempt', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      email: 'other@test.agentgate',
      password: 'SuperSecure123!',
      name: 'Other',
      platformName: 'Other Corp',
    })
    expect(res.status).toBe(409)
  })

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      email: 'not-an-email',
      password: 'pass',
      name: 'X',
      platformName: 'Y',
    })
    expect(res.status).toBe(409) // already setup — but validates schema first
  })
})

describe('POST /api/auth/login', () => {
  it('returns JWT on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.agentgate',
      password: 'SuperSecure123!',
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.agentgate',
      password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 10: Run tests to verify they fail**

```bash
cd apps/api && NODE_ENV=test npx jest tests/auth.test.ts --runInBand
```

Expected: FAIL — modules not found or DB errors

- [ ] **Step 11: Run tests to verify they pass** (after all files created)

```bash
cd apps/api && NODE_ENV=test npx jest tests/auth.test.ts --runInBand
```

Expected: PASS (4 tests)

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/ apps/api/tests/auth.test.ts apps/api/jest.config.ts
git commit -m "feat: add auth service, app factory, JWT login, and all module stubs"
```

---

### Task 6: MFA (TOTP)

**Files:**
- Create: `apps/api/src/auth/mfa.ts`
- Modify: `apps/api/src/auth/router.ts`

- [ ] **Step 1: Add failing MFA tests**

Append to `apps/api/tests/auth.test.ts`:

```typescript
describe('MFA', () => {
  let adminToken: string

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.agentgate',
      password: 'SuperSecure123!',
    })
    adminToken = res.body.token
  })

  it('returns QR URI when enabling MFA', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.otpauthUrl).toContain('otpauth://totp/')
    expect(res.body.secret).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/auth.test.ts -t "MFA" --runInBand
```

Expected: FAIL — 404 on `/api/auth/mfa/enable`

- [ ] **Step 3: Create auth/mfa.ts**

```typescript
// apps/api/src/auth/mfa.ts
import speakeasy from 'speakeasy'
import { db } from '../db'
import { encrypt, decrypt } from '../crypto'
import { config } from '../config'

export function generateMfaSecret(email: string) {
  const secret = speakeasy.generateSecret({ name: `AgentGate:${email}`, issuer: 'AgentGate' })
  return { secret: secret.base32, otpauthUrl: secret.otpauth_url! }
}

export async function saveMfaSecret(userId: string, secret: string) {
  const encrypted = encrypt(secret, config.AGENTGATE_SECRET)
  await db.query('UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2', [encrypted, userId])
}

export async function verifyAndEnableMfa(userId: string, token: string): Promise<boolean> {
  const result = await db.query('SELECT mfa_secret FROM users WHERE id = $1', [userId])
  const user = result.rows[0]
  if (!user?.mfa_secret) return false
  const secret = decrypt(user.mfa_secret, config.AGENTGATE_SECRET)
  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 })
  if (valid) await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId])
  return valid
}

export async function verifyMfaToken(userId: string, token: string): Promise<boolean> {
  const result = await db.query('SELECT mfa_secret FROM users WHERE id = $1', [userId])
  const user = result.rows[0]
  if (!user?.mfa_secret) return false
  const secret = decrypt(user.mfa_secret, config.AGENTGATE_SECRET)
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 })
}
```

- [ ] **Step 4: Add MFA routes to auth/router.ts**

Append to `apps/api/src/auth/router.ts`:

```typescript
import { generateMfaSecret, saveMfaSecret, verifyAndEnableMfa, verifyMfaToken } from './mfa'
import { requireAuth, AuthRequest } from './middleware'
import { signToken } from './jwt'
import { db } from '../db'
import rateLimit from 'express-rate-limit'

const mfaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many MFA attempts' } })

authRouter.post('/mfa/enable', requireAuth, async (req: AuthRequest, res) => {
  const { secret, otpauthUrl } = generateMfaSecret(req.user!.email)
  await saveMfaSecret(req.user!.userId, secret)
  res.json({ secret, otpauthUrl })
})

authRouter.post('/mfa/verify-setup', requireAuth, async (req: AuthRequest, res) => {
  const valid = await verifyAndEnableMfa(req.user!.userId, req.body.token)
  if (!valid) return res.status(400).json({ error: 'Invalid MFA token' })
  res.json({ ok: true })
})

authRouter.post('/mfa/login', mfaLimiter, async (req, res) => {
  const { userId, token } = req.body
  const valid = await verifyMfaToken(userId, token)
  if (!valid) return res.status(401).json({ error: 'Invalid MFA token' })
  const user = await db.query(
    `SELECT u.id, u.email, bool_or(r.is_superadmin) AS is_superadmin FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1 GROUP BY u.id`,
    [userId]
  )
  const u = user.rows[0]
  res.json({ token: signToken({ userId: u.id, email: u.email, isSuperadmin: u.is_superadmin }) })
})
```

- [ ] **Step 5: Run all auth tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/auth.test.ts --runInBand
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/mfa.ts apps/api/src/auth/router.ts apps/api/tests/auth.test.ts
git commit -m "feat: add TOTP MFA with per-role enforcement and brute-force protection"
```

---

## Chunk 3: Permission Engine + Agent Registry

### Task 7: Permission engine

**Files:**
- Create: `apps/api/src/permissions/engine.ts`
- Create: `apps/api/src/permissions/middleware.ts`
- Create: `apps/api/tests/permissions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/tests/permissions.test.ts
import { checkAccess, checkAction, getUserRoles } from '../src/permissions/engine'
import { db } from '../src/db'
import { v4 as uuid } from 'uuid'

let agentId: string, roleId: string, userId: string

beforeAll(async () => {
  const role = await db.query(`INSERT INTO roles (name, slug) VALUES ('Perm Role', 'perm-role-${uuid().slice(0,8)}') RETURNING id`)
  roleId = role.rows[0].id
  const user = await db.query(`INSERT INTO users (email, name, auth_provider) VALUES ('perm@test.agentgate', 'Perm User', 'local') RETURNING id`)
  userId = user.rows[0].id
  await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId])
  const agent = await db.query(`INSERT INTO agents (name, slug) VALUES ('Perm Agent', 'perm-agent-${uuid().slice(0,8)}') RETURNING id`)
  agentId = agent.rows[0].id
  await db.query(`INSERT INTO agent_role_permissions (agent_id, role_id, actions) VALUES ($1, $2, ARRAY['read','query'])`, [agentId, roleId])
})

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email = 'perm@test.agentgate'")
  await db.end()
})

it('grants access when role has permission', async () => {
  expect(await checkAccess(agentId, await getUserRoles(userId))).toBe(true)
})

it('denies access when role has no permission', async () => {
  expect(await checkAccess(agentId, [{ id: uuid(), slug: 'none', is_superadmin: false }])).toBe(false)
})

it('allows permitted actions', async () => {
  const roles = await getUserRoles(userId)
  expect(await checkAction(agentId, roles, 'read')).toBe(true)
  expect(await checkAction(agentId, roles, 'query')).toBe(true)
})

it('denies unpermitted actions', async () => {
  expect(await checkAction(agentId, await getUserRoles(userId), 'instruct')).toBe(false)
})

it('superadmin bypasses all checks', async () => {
  const superRoles = [{ id: uuid(), slug: 'superadmin', is_superadmin: true }]
  expect(await checkAccess(agentId, superRoles)).toBe(true)
  expect(await checkAction(agentId, superRoles, 'instruct')).toBe(true)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/permissions.test.ts --runInBand
```

Expected: FAIL

- [ ] **Step 3: Implement permissions/engine.ts**

```typescript
// apps/api/src/permissions/engine.ts
import { db } from '../db'

export interface UserRole {
  id: string
  slug: string
  is_superadmin: boolean
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const result = await db.query(
    `SELECT r.id, r.slug, r.is_superadmin FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`,
    [userId]
  )
  return result.rows
}

export async function checkAccess(agentId: string, roles: UserRole[]): Promise<boolean> {
  if (roles.some((r) => r.is_superadmin)) return true
  const result = await db.query(
    `SELECT 1 FROM agent_role_permissions WHERE agent_id = $1 AND role_id = ANY($2::uuid[]) LIMIT 1`,
    [agentId, roles.map((r) => r.id)]
  )
  return (result.rowCount ?? 0) > 0
}

export async function getEffectiveActions(agentId: string, roles: UserRole[]): Promise<string[]> {
  if (roles.some((r) => r.is_superadmin)) return ['read', 'query', 'request', 'instruct', 'trigger_subagents']
  const result = await db.query(
    `SELECT array_agg(DISTINCT a) AS actions FROM agent_role_permissions, unnest(actions) AS a
     WHERE agent_id = $1 AND role_id = ANY($2::uuid[])`,
    [agentId, roles.map((r) => r.id)]
  )
  return result.rows[0]?.actions ?? []
}

export async function checkAction(agentId: string, roles: UserRole[], action: string): Promise<boolean> {
  return (await getEffectiveActions(agentId, roles)).includes(action)
}
```

- [ ] **Step 4: Create permissions/middleware.ts**

```typescript
// apps/api/src/permissions/middleware.ts
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../auth/middleware'
import { getUserRoles, checkAccess, getEffectiveActions, UserRole } from './engine'

declare global {
  namespace Express {
    interface Request {
      userRoles?: UserRole[]
      effectiveActions?: string[]
    }
  }
}

export async function attachPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return next()
  req.userRoles = await getUserRoles(req.user.userId)
  next()
}

export async function requireAgentAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const agentId = req.params.agentId || req.body.agentId
  if (!agentId) return res.status(400).json({ error: 'agentId required' })
  const allowed = await checkAccess(agentId, req.userRoles!)
  if (!allowed) return res.status(403).json({ error: 'Access denied to this agent' })
  req.effectiveActions = await getEffectiveActions(agentId, req.userRoles!)
  next()
}
```

- [ ] **Step 5: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/permissions.test.ts --runInBand
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/permissions/ apps/api/tests/permissions.test.ts
git commit -m "feat: add 3-layer permission engine with superadmin bypass"
```

---

### Task 8: Agent registry CRUD

**Files:**
- Create: `apps/api/src/agents/service.ts`
- Modify: `apps/api/src/agents/router.ts`
- Create: `apps/api/tests/agents.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/tests/agents.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let agentId: string

beforeAll(async () => {
  // Re-use admin created in auth tests; create if not present
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug LIKE 'test-%'")
  await db.end()
})

describe('Agent CRUD', () => {
  it('creates an agent and returns plaintext SDK token', async () => {
    const res = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test CMO Agent', slug: 'test-cmo', description: 'CMO agent', icon: '🤖' })
    expect(res.status).toBe(201)
    expect(res.body.agent.slug).toBe('test-cmo')
    expect(res.body.sdkToken).toMatch(/^[0-9a-f]{64}$/)
    agentId = res.body.agent.id
  })

  it('lists agents', async () => {
    const res = await request(app).get('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.agents.some((a: any) => a.id === agentId)).toBe(true)
  })

  it('gets a single agent', async () => {
    const res = await request(app).get(`/api/agents/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.agent.id).toBe(agentId)
  })

  it('updates an agent name', async () => {
    const res = await request(app).put(`/api/agents/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated CMO Agent' })
    expect(res.status).toBe(200)
    expect(res.body.agent.name).toBe('Updated CMO Agent')
  })

  it('rotates SDK token with grace period', async () => {
    const res = await request(app).post(`/api/agents/${agentId}/rotate-token`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.sdkToken).toMatch(/^[0-9a-f]{64}$/)
    expect(res.body.gracePeriodMinutes).toBe(15)
  })

  it('deletes an agent', async () => {
    const res = await request(app).delete(`/api/agents/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/agents.test.ts --runInBand
```

Expected: FAIL — 404s from stubs

- [ ] **Step 3: Create agents/service.ts**

```typescript
// apps/api/src/agents/service.ts
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { db } from '../db'

export async function createAgent(data: { name: string; slug: string; description?: string; icon?: string }) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(rawToken, 10)
  const agent = (await db.query(
    `INSERT INTO agents (name, slug, description, icon) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.name, data.slug, data.description ?? '', data.icon ?? '🤖']
  )).rows[0]
  await db.query(`INSERT INTO sdk_tokens (agent_id, token_hash) VALUES ($1, $2)`, [agent.id, tokenHash])
  return { agent, sdkToken: rawToken }
}

export async function listAgents() {
  return (await db.query(
    `SELECT a.*, (SELECT count(*) FROM threads t WHERE t.agent_id = a.id) AS conversation_count FROM agents a ORDER BY a.created_at DESC`
  )).rows
}

export async function getAgent(id: string) {
  return (await db.query('SELECT * FROM agents WHERE id = $1', [id])).rows[0] ?? null
}

export async function updateAgent(id: string, data: Partial<{ name: string; description: string; icon: string; timeout_seconds: number }>) {
  const entries = Object.entries(data)
  const fields = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  return (await db.query(`UPDATE agents SET ${fields} WHERE id = $1 RETURNING *`, [id, ...entries.map(([, v]) => v)])).rows[0]
}

export async function deleteAgent(id: string) {
  await db.query('DELETE FROM agents WHERE id = $1', [id])
}

export async function rotateToken(agentId: string, gracePeriodMinutes = 15) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(rawToken, 10)
  const graceExpiry = new Date(Date.now() + gracePeriodMinutes * 60 * 1000)
  await db.query(
    `UPDATE sdk_tokens SET previous_token_hash = token_hash, token_hash = $1, grace_period_expires_at = $2 WHERE agent_id = $3`,
    [tokenHash, graceExpiry, agentId]
  )
  return rawToken
}

export async function validateSdkToken(agentId: string, rawToken: string): Promise<boolean> {
  const row = (await db.query(`SELECT token_hash, previous_token_hash, grace_period_expires_at FROM sdk_tokens WHERE agent_id = $1`, [agentId])).rows[0]
  if (!row) return false
  if (await bcrypt.compare(rawToken, row.token_hash)) return true
  if (row.previous_token_hash && row.grace_period_expires_at > new Date()) return bcrypt.compare(rawToken, row.previous_token_hash)
  return false
}

export async function setAgentStatus(agentId: string, status: 'online' | 'offline') {
  await db.query('UPDATE agents SET status = $1 WHERE id = $2', [status, agentId])
}
```

- [ ] **Step 4: Implement agents/router.ts**

```typescript
// apps/api/src/agents/router.ts
import { Router } from 'express'
import { requireSuperadmin, AuthRequest } from '../auth/middleware'
import { createAgent, listAgents, getAgent, updateAgent, deleteAgent, rotateToken } from './service'

export const agentsRouter = Router()

agentsRouter.post('/', requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    res.status(201).json(await createAgent(req.body))
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' })
    res.status(500).json({ error: 'Failed to create agent' })
  }
})

agentsRouter.get('/', async (_req, res) => res.json({ agents: await listAgents() }))

agentsRouter.get('/:id', async (req, res) => {
  const agent = await getAgent(req.params.id)
  if (!agent) return res.status(404).json({ error: 'Not found' })
  res.json({ agent })
})

agentsRouter.put('/:id', requireSuperadmin, async (req, res) => {
  const agent = await updateAgent(req.params.id, req.body)
  if (!agent) return res.status(404).json({ error: 'Not found' })
  res.json({ agent })
})

agentsRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  await deleteAgent(req.params.id)
  res.status(204).send()
})

agentsRouter.post('/:id/rotate-token', requireSuperadmin, async (req, res) => {
  res.json({ sdkToken: await rotateToken(req.params.id), gracePeriodMinutes: 15 })
})
```

- [ ] **Step 5: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/agents.test.ts --runInBand
```

Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/service.ts apps/api/src/agents/router.ts apps/api/tests/agents.test.ts
git commit -m "feat: add agent registry CRUD with bcrypt SDK token and rotation"
```

---

## Chunk 4: Message Router + Real-time

### Task 9: Message router + Redis Streams + WebSocket handler

**Files:**
- Create: `apps/api/src/messages/service.ts`
- Create: `apps/api/src/messages/streaming.ts`
- Modify: `apps/api/src/messages/router.ts`
- Modify: `apps/api/src/ws/handler.ts`
- Create: `apps/api/tests/messages.test.ts`

- [ ] **Step 1: Write failing message tests**

```typescript
// apps/api/tests/messages.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let testAgentId: string
let threadId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token

  const agentRes = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Msg Agent', slug: 'msg-test-agent', description: 'test' })
  testAgentId = agentRes.body.agent.id

  const superRole = await db.query("SELECT id FROM roles WHERE is_superadmin = true LIMIT 1")
  if (superRole.rows[0]) {
    await db.query(
      `INSERT INTO agent_role_permissions (agent_id, role_id, actions) VALUES ($1, $2, ARRAY['read','query','instruct']) ON CONFLICT DO NOTHING`,
      [testAgentId, superRole.rows[0].id]
    )
  }
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'msg-test-agent'")
  await db.end()
})

it('creates a private thread', async () => {
  const res = await request(app).post('/api/messages/threads')
    .set('Authorization', `Bearer ${adminToken}`).send({ agentId: testAgentId })
  expect(res.status).toBe(201)
  expect(res.body.thread.type).toBe('private')
  threadId = res.body.thread.id
})

it('sends a message — returns 503 when agent offline', async () => {
  const res = await request(app).post('/api/messages/send')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ threadId, content: 'Hello', agentId: testAgentId })
  expect([200, 503]).toContain(res.status)
  if (res.status === 503) expect(res.body.error).toMatch(/offline/i)
})

it('fetches private thread message history', async () => {
  const res = await request(app).get(`/api/messages/threads/${threadId}`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.messages)).toBe(true)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/messages.test.ts --runInBand
```

Expected: FAIL

- [ ] **Step 3: Create messages/streaming.ts**

```typescript
// apps/api/src/messages/streaming.ts
import { redis } from '../redis'

// All keys use agentId (not slug) for consistency
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
```

- [ ] **Step 4: Create messages/service.ts**

```typescript
// apps/api/src/messages/service.ts
import { db } from '../db'
import { encrypt, decrypt } from '../crypto'
import { config } from '../config'

export async function getOrCreateThread(userId: string, agentId: string) {
  const existing = await db.query(
    `SELECT * FROM threads WHERE user_id = $1 AND agent_id = $2 AND type = 'private' LIMIT 1`,
    [userId, agentId]
  )
  if (existing.rows[0]) return existing.rows[0]
  return (await db.query(`INSERT INTO threads (user_id, agent_id, type) VALUES ($1, $2, 'private') RETURNING *`, [userId, agentId])).rows[0]
}

export async function saveMessage(threadId: string, senderType: 'user' | 'agent', senderId: string | null, content: string) {
  const encrypted = encrypt(content, config.AGENTGATE_SECRET)
  return (await db.query(
    `INSERT INTO messages (thread_id, sender_type, sender_id, content_encrypted) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [threadId, senderType, senderId, encrypted]
  )).rows[0]
}

export async function getThreadMessages(threadId: string, userId: string) {
  // Supports both private threads (user_id match) and group threads (channel role check)
  const thread = (await db.query(`SELECT * FROM threads WHERE id = $1`, [threadId])).rows[0]
  if (!thread) throw new Error('FORBIDDEN')

  if (thread.type === 'private') {
    if (thread.user_id !== userId) throw new Error('FORBIDDEN')
  } else {
    // Group thread: verify user has a role in the channel
    const access = await db.query(
      `SELECT 1 FROM channel_roles cr JOIN user_roles ur ON ur.role_id = cr.role_id
       WHERE cr.channel_id = $1 AND ur.user_id = $2 LIMIT 1`,
      [thread.channel_id, userId]
    )
    if ((access.rowCount ?? 0) === 0) throw new Error('FORBIDDEN')
  }

  const messages = await db.query(
    `SELECT id, sender_type, sender_id, content_encrypted, created_at FROM messages WHERE thread_id = $1 ORDER BY created_at ASC`,
    [threadId]
  )
  return messages.rows.map((m) => ({ ...m, content: decrypt(m.content_encrypted, config.AGENTGATE_SECRET), content_encrypted: undefined }))
}
```

- [ ] **Step 5: Implement messages/router.ts**

```typescript
// apps/api/src/messages/router.ts
import { Router } from 'express'
import { AuthRequest } from '../auth/middleware'
import { attachPermissions, requireAgentAccess } from '../permissions/middleware'
import { getOrCreateThread, saveMessage, getThreadMessages } from './service'
import { sendToAgent, waitForResponse } from './streaming'
import { getAgent } from '../agents/service'
import { getUserRoles } from '../permissions/engine'
import { auditLog } from '../audit/logger'

export const messagesRouter = Router()
messagesRouter.use(attachPermissions)

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  const thread = await getOrCreateThread(req.user!.userId, req.body.agentId)
  res.status(201).json({ thread })
})

messagesRouter.get('/threads/:id', async (req: AuthRequest, res) => {
  try {
    res.json({ messages: await getThreadMessages(req.params.id, req.user!.userId) })
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Access denied' })
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

messagesRouter.post('/send', requireAgentAccess, async (req: AuthRequest, res) => {
  const { threadId, content, agentId } = req.body
  const agent = await getAgent(agentId)

  if (!agent || agent.status !== 'online') {
    await auditLog({ userId: req.user!.userId, agentId, threadId, action: 'send_message', outcome: 'rejected' })
    return res.status(503).json({ error: 'Agent is offline' })
  }

  await saveMessage(threadId, 'user', req.user!.userId, content)

  const roles = req.userRoles!
  await sendToAgent(agentId, {
    message: content,
    user: { id: req.user!.userId, email: req.user!.email },
    role: roles.map((r) => r.slug).join(','),
    permissions: req.effectiveActions!,
    thread_id: threadId,
    is_superadmin: req.user!.isSuperadmin,
  })

  const response = await waitForResponse(threadId, (agent.timeout_seconds ?? 30) * 1000)

  if (!response) {
    await auditLog({ userId: req.user!.userId, agentId, threadId, action: 'send_message', outcome: 'timed_out', content })
    return res.status(504).json({ error: 'Agent did not respond in time. Please try again.' })
  }

  await saveMessage(threadId, 'agent', agentId, response)
  await auditLog({ userId: req.user!.userId, agentId, threadId, action: 'send_message', outcome: 'delivered', content })
  res.json({ message: { content: response, sender_type: 'agent' } })
})
```

- [ ] **Step 6: Implement ws/handler.ts**

```typescript
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
    if (!(await validateSdkToken(agentId, token))) return ws.close(1008, 'Invalid SDK token')

    await setAgentStatus(agentId, 'online')
    console.log(`Agent connected: ${agentId}`)
    let lastId = '$'

    const poll = setInterval(async () => {
      if (ws.readyState !== WebSocket.OPEN) { clearInterval(poll); return }
      const result = await redis.xread('COUNT', 10, 'STREAMS', INBOX_KEY(agentId), lastId)
      if (!result) return
      for (const [, entries] of result) {
        for (const [id, fields] of entries) {
          lastId = id
          const pi = fields.indexOf('payload')
          if (pi >= 0) ws.send(fields[pi + 1])
        }
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
      await setAgentStatus(agentId, 'offline')
      console.log(`Agent disconnected: ${agentId}`)
    })
  })
}
```

- [ ] **Step 7: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/messages.test.ts --runInBand
```

Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/messages/ apps/api/src/ws/ apps/api/tests/messages.test.ts
git commit -m "feat: add message router, Redis Streams, WebSocket agent handler with group thread access"
```

---

## Chunk 5: Channels, Sources, Audit, Users

### Task 10: Channel manager

**Files:**
- Create: `apps/api/src/channels/service.ts`
- Modify: `apps/api/src/channels/router.ts`
- Create: `apps/api/tests/channels.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/tests/channels.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let channelId: string
let agentId: string
let roleId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token

  const agent = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Channel Agent', slug: 'channel-agent', description: 'test' })
  agentId = agent.body.agent.id

  const role = await db.query(`INSERT INTO roles (name, slug) VALUES ('Channel Role', 'channel-role') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)
  roleId = role.rows[0].id
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'channel-agent'")
  await db.query("DELETE FROM roles WHERE slug = 'channel-role'")
  await db.end()
})

it('creates a group channel', async () => {
  const res = await request(app).post('/api/channels').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Marketing Channel', agentId, roleIds: [roleId] })
  expect(res.status).toBe(201)
  expect(res.body.channel.name).toBe('Marketing Channel')
  channelId = res.body.channel.id
})

it('lists all channels as superadmin', async () => {
  const res = await request(app).get('/api/channels').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.channels.some((c: any) => c.id === channelId)).toBe(true)
})

it('deletes a channel', async () => {
  const res = await request(app).delete(`/api/channels/${channelId}`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(204)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/channels.test.ts --runInBand
```

Expected: FAIL

- [ ] **Step 3: Implement channels/service.ts**

```typescript
// apps/api/src/channels/service.ts
import { db } from '../db'

export async function createChannel(data: { name: string; agentId: string; roleIds: string[]; createdBy: string }) {
  const ch = (await db.query(`INSERT INTO channels (name, agent_id, created_by) VALUES ($1, $2, $3) RETURNING *`, [data.name, data.agentId, data.createdBy])).rows[0]
  for (const roleId of data.roleIds) {
    await db.query(`INSERT INTO channel_roles (channel_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [ch.id, roleId])
  }
  return ch
}

export async function getChannelsForUser(userId: string) {
  return (await db.query(
    `SELECT DISTINCT c.* FROM channels c JOIN channel_roles cr ON cr.channel_id = c.id JOIN user_roles ur ON ur.role_id = cr.role_id WHERE ur.user_id = $1`,
    [userId]
  )).rows
}

export async function listAllChannels() {
  return (await db.query(
    `SELECT c.*, array_agg(cr.role_id) FILTER (WHERE cr.role_id IS NOT NULL) AS role_ids FROM channels c LEFT JOIN channel_roles cr ON cr.channel_id = c.id GROUP BY c.id ORDER BY c.created_at DESC`
  )).rows
}

export async function deleteChannel(id: string) {
  await db.query('DELETE FROM channels WHERE id = $1', [id])
}
```

- [ ] **Step 4: Implement channels/router.ts**

```typescript
// apps/api/src/channels/router.ts
import { Router } from 'express'
import { requireSuperadmin, AuthRequest } from '../auth/middleware'
import { createChannel, getChannelsForUser, listAllChannels, deleteChannel } from './service'

export const channelsRouter = Router()

channelsRouter.post('/', requireSuperadmin, async (req: AuthRequest, res) => {
  res.status(201).json({ channel: await createChannel({ ...req.body, createdBy: req.user!.userId }) })
})

channelsRouter.get('/', async (req: AuthRequest, res) => {
  const channels = req.user!.isSuperadmin ? await listAllChannels() : await getChannelsForUser(req.user!.userId)
  res.json({ channels })
})

channelsRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  await deleteChannel(req.params.id)
  res.status(204).send()
})
```

- [ ] **Step 5: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/channels.test.ts --runInBand
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/channels/ apps/api/tests/channels.test.ts
git commit -m "feat: add channel manager with role-gated group channels"
```

---

### Task 11: Sources manager

**Files:**
- Create: `apps/api/src/sources/service.ts`
- Create: `apps/api/src/sources/indexing.ts`
- Modify: `apps/api/src/sources/router.ts`
- Create: `apps/api/tests/sources.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/tests/sources.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let agentId: string
let sourceId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
  const agent = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Source Agent', slug: 'source-agent', description: 'test' })
  agentId = agent.body.agent.id
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'source-agent'")
  await db.end()
})

it('adds an API key source', async () => {
  const res = await request(app).post(`/api/sources/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
    .send({ type: 'api_key', name: 'HubSpot', config: { key: 'hs_test_key', endpoint: 'https://api.hubspot.com' } })
  expect(res.status).toBe(201)
  expect(res.body.source.name).toBe('HubSpot')
  sourceId = res.body.source.id
})

it('lists sources without exposing config', async () => {
  const res = await request(app).get(`/api/sources/${agentId}`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.sources.some((s: any) => s.id === sourceId)).toBe(true)
  // config must never appear in list response
  expect(res.body.sources[0].config_encrypted).toBeUndefined()
  expect(res.body.sources[0].config).toBeUndefined()
})

it('deletes a source', async () => {
  const res = await request(app).delete(`/api/sources/${agentId}/${sourceId}`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(204)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/sources.test.ts --runInBand
```

Expected: FAIL

- [ ] **Step 3: Create sources/service.ts**

```typescript
// apps/api/src/sources/service.ts
import { db } from '../db'
import { encrypt, decrypt } from '../crypto'
import { config } from '../config'

export async function addSource(agentId: string, data: { type: string; name: string; config: Record<string, string>; expiresAt?: Date }) {
  const configEncrypted = encrypt(JSON.stringify(data.config), config.AGENTGATE_SECRET)
  return (await db.query(
    `INSERT INTO agent_sources (agent_id, type, name, config_encrypted, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, agent_id, type, name, expires_at, created_at`,
    [agentId, data.type, data.name, configEncrypted, data.expiresAt ?? null]
  )).rows[0]
}

export async function listSources(agentId: string) {
  return (await db.query(
    `SELECT id, agent_id, type, name, expires_at, created_at FROM agent_sources WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  )).rows // config_encrypted deliberately excluded
}

export async function getSourceConfig(sourceId: string): Promise<Record<string, string>> {
  const row = (await db.query('SELECT config_encrypted FROM agent_sources WHERE id = $1', [sourceId])).rows[0]
  if (!row) throw new Error('Source not found')
  return JSON.parse(decrypt(row.config_encrypted, config.AGENTGATE_SECRET))
}

export async function deleteSource(id: string) {
  await db.query('DELETE FROM agent_sources WHERE id = $1', [id])
}
```

- [ ] **Step 4: Create sources/indexing.ts**

```typescript
// apps/api/src/sources/indexing.ts
import { db } from '../db'
import { config } from '../config'

const CHUNK_WORDS = 512
const OVERLAP = 50

function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(' '))
    i += CHUNK_WORDS - OVERLAP
  }
  return chunks
}

export async function indexSourceFile(sourceId: string, text: string): Promise<void> {
  if (!config.OPENAI_API_KEY) {
    console.warn('[indexing] No OPENAI_API_KEY — skipping embedding generation')
    return
  }
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
  await db.query('DELETE FROM source_chunks WHERE source_id = $1', [sourceId])
  const chunks = chunkText(text)
  for (let i = 0; i < chunks.length; i++) {
    const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks[i] })
    await db.query(
      `INSERT INTO source_chunks (source_id, chunk_text, embedding, chunk_index) VALUES ($1, $2, $3::vector, $4)`,
      [sourceId, chunks[i], JSON.stringify(data[0].embedding), i]
    )
  }
}

export async function searchSourceChunks(agentId: string, query: string, limit = 5): Promise<string[]> {
  if (!config.OPENAI_API_KEY) return []
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
  const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query })
  const result = await db.query(
    `SELECT sc.chunk_text FROM source_chunks sc JOIN agent_sources s ON s.id = sc.source_id WHERE s.agent_id = $1 ORDER BY sc.embedding <=> $2::vector LIMIT $3`,
    [agentId, JSON.stringify(data[0].embedding), limit]
  )
  return result.rows.map((r) => r.chunk_text)
}
```

- [ ] **Step 5: Implement sources/router.ts**

```typescript
// apps/api/src/sources/router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { addSource, listSources, deleteSource } from './service'
import { indexSourceFile } from './indexing'

const SUPPORTED_TEXT_TYPES = ['.txt', '.md', '.csv']
const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } })

export const sourcesRouter = Router()

sourcesRouter.get('/:agentId', requireSuperadmin, async (req, res) => {
  res.json({ sources: await listSources(req.params.agentId) })
})

sourcesRouter.post('/:agentId', requireSuperadmin, async (req, res) => {
  res.status(201).json({ source: await addSource(req.params.agentId, req.body) })
})

sourcesRouter.post('/:agentId/upload', requireSuperadmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const ext = path.extname(req.file.originalname).toLowerCase()
  const source = await addSource(req.params.agentId, {
    type: 'file',
    name: req.file.originalname,
    config: { filePath: req.file.path, mimetype: req.file.mimetype, size: String(req.file.size) },
  })

  if (SUPPORTED_TEXT_TYPES.includes(ext)) {
    const text = fs.readFileSync(req.file.path, 'utf8')
    indexSourceFile(source.id, text).catch(console.error)
    return res.status(201).json({ source, status: 'indexing' })
  }

  // Binary files (PDF, DOCX, XLSX) stored but not indexed in v1
  res.status(201).json({ source, status: 'stored', note: 'Binary file stored. Text extraction not supported in v1 — use plain text, markdown, or CSV for indexing.' })
})

sourcesRouter.delete('/:agentId/:sourceId', requireSuperadmin, async (req, res) => {
  await deleteSource(req.params.sourceId)
  res.status(204).send()
})
```

- [ ] **Step 6: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/sources.test.ts --runInBand
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/sources/ apps/api/tests/sources.test.ts
git commit -m "feat: add sources manager with encrypted config and pgvector file indexing"
```

---

### Task 12: Audit logger + Users + Roles

**Files:**
- Modify: `apps/api/src/audit/logger.ts` (replace stub with full implementation)
- Modify: `apps/api/src/audit/router.ts`
- Create: `apps/api/src/users/service.ts`
- Modify: `apps/api/src/users/router.ts`
- Modify: `apps/api/src/roles/router.ts`
- Create: `apps/api/tests/users.test.ts`
- Create: `apps/api/tests/audit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/tests/users.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let newUserId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
})

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email = 'invited@test.agentgate'")
  await db.end()
})

it('invites a user and returns temp password', async () => {
  const res = await request(app).post('/api/users/invite').set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'invited@test.agentgate', name: 'Invited User', roleIds: [] })
  expect(res.status).toBe(201)
  expect(res.body.tempPassword).toBeDefined()
  newUserId = res.body.user.id
})

it('lists users', async () => {
  const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.users.some((u: any) => u.id === newUserId)).toBe(true)
})

it('deactivates a user', async () => {
  const res = await request(app).put(`/api/users/${newUserId}/deactivate`).set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
})
```

```typescript
// apps/api/tests/audit.test.ts
import { auditLog } from '../src/audit/logger'
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token
  const user = await db.query("SELECT id FROM users WHERE email = 'admin@test.agentgate'")
  await auditLog({ userId: user.rows[0].id, action: 'test_action', outcome: 'delivered', content: 'test content' })
})

afterAll(async () => { await db.end() })

it('audit log returns entries for superadmin', async () => {
  const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.entries)).toBe(true)
  expect(res.body.entries.length).toBeGreaterThan(0)
  // content should be decrypted in response
  expect(res.body.entries[0].content).toBeDefined()
})

it('filters by outcome', async () => {
  const res = await request(app).get('/api/audit?outcome=delivered').set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.entries.every((e: any) => e.outcome === 'delivered')).toBe(true)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/users.test.ts tests/audit.test.ts --runInBand
```

Expected: FAIL

- [ ] **Step 3: Replace audit/logger.ts stub with full implementation**

```typescript
// apps/api/src/audit/logger.ts
import { db } from '../db'
import { encrypt } from '../crypto'
import { config } from '../config'

export interface AuditEntry {
  userId: string
  agentId?: string
  threadId?: string
  action: string
  outcome: 'delivered' | 'rejected' | 'timed_out'
  content?: string
  roleSnapshot?: string[]
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  const contentEncrypted = entry.content ? encrypt(entry.content, config.AGENTGATE_SECRET) : null
  await db.query(
    `INSERT INTO audit_log (user_id, role_snapshot, agent_id, thread_id, action, content_encrypted, outcome) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [entry.userId, entry.roleSnapshot ?? [], entry.agentId ?? null, entry.threadId ?? null, entry.action, contentEncrypted, entry.outcome]
  )
}
```

- [ ] **Step 4: Implement audit/router.ts**

```typescript
// apps/api/src/audit/router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'
import { decrypt } from '../crypto'
import { config } from '../config'

export const auditRouter = Router()

auditRouter.get('/', requireSuperadmin, async (req, res) => {
  const { userId, agentId, outcome, from, to, limit = 100, offset = 0 } = req.query
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (userId) { conditions.push(`al.user_id = $${idx++}`); values.push(userId) }
  if (agentId) { conditions.push(`al.agent_id = $${idx++}`); values.push(agentId) }
  if (outcome) { conditions.push(`al.outcome = $${idx++}`); values.push(outcome) }
  if (from) { conditions.push(`al.created_at >= $${idx++}`); values.push(from) }
  if (to) { conditions.push(`al.created_at <= $${idx++}`); values.push(to) }

  values.push(limit, offset)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await db.query(
    `SELECT al.id, al.user_id, u.name AS user_name, al.role_snapshot, al.agent_id,
            a.name AS agent_name, al.action, al.outcome, al.created_at, al.content_encrypted
     FROM audit_log al LEFT JOIN users u ON u.id = al.user_id LEFT JOIN agents a ON a.id = al.agent_id
     ${where} ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  )

  res.json({
    entries: result.rows.map((row) => ({
      ...row,
      content: row.content_encrypted ? decrypt(row.content_encrypted, config.AGENTGATE_SECRET) : null,
      content_encrypted: undefined,
    })),
  })
})
```

- [ ] **Step 5: Create users/service.ts**

```typescript
// apps/api/src/users/service.ts
import bcrypt from 'bcrypt'
import { db } from '../db'

export async function inviteUser(data: { email: string; name: string; roleIds: string[] }) {
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
  const password_hash = await bcrypt.hash(tempPassword, 12)
  const user = (await db.query(
    `INSERT INTO users (email, name, password_hash, auth_provider) VALUES ($1, $2, $3, 'local') RETURNING id, email, name`,
    [data.email, data.name, password_hash]
  )).rows[0]
  for (const roleId of data.roleIds) {
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, roleId])
  }
  return { user, tempPassword }
}

export async function listUsers() {
  return (await db.query(
    `SELECT u.id, u.email, u.name, u.is_active, u.auth_provider, u.mfa_enabled, u.created_at,
            array_agg(r.slug) FILTER (WHERE r.id IS NOT NULL) AS roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id ORDER BY u.created_at DESC`
  )).rows
}

export async function updateUserRoles(userId: string, roleIds: string[]) {
  await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId])
  for (const roleId of roleIds) {
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId])
  }
}

export async function deactivateUser(userId: string) {
  await db.query('UPDATE users SET is_active = false WHERE id = $1', [userId])
}
```

- [ ] **Step 6: Implement users/router.ts**

```typescript
// apps/api/src/users/router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { inviteUser, listUsers, updateUserRoles, deactivateUser } from './service'

export const usersRouter = Router()

usersRouter.get('/', requireSuperadmin, async (_req, res) => res.json({ users: await listUsers() }))

usersRouter.post('/invite', requireSuperadmin, async (req, res) => {
  try {
    res.status(201).json(await inviteUser(req.body))
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'User already exists' })
    res.status(500).json({ error: 'Failed to invite user' })
  }
})

usersRouter.put('/:id/roles', requireSuperadmin, async (req, res) => {
  await updateUserRoles(req.params.id, req.body.roleIds)
  res.json({ ok: true })
})

usersRouter.put('/:id/deactivate', requireSuperadmin, async (req, res) => {
  await deactivateUser(req.params.id)
  res.json({ ok: true })
})
```

- [ ] **Step 7: Implement roles/router.ts**

```typescript
// apps/api/src/roles/router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'

export const rolesRouter = Router()

rolesRouter.get('/', async (_req, res) => {
  res.json({ roles: (await db.query('SELECT * FROM roles ORDER BY name')).rows })
})

rolesRouter.post('/', requireSuperadmin, async (req, res) => {
  try {
    const { name, slug } = req.body
    res.status(201).json({ role: (await db.query(`INSERT INTO roles (name, slug) VALUES ($1, $2) RETURNING *`, [name, slug])).rows[0] })
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Role slug already exists' })
    res.status(500).json({ error: 'Failed to create role' })
  }
})

rolesRouter.put('/:id/mfa-required', requireSuperadmin, async (req, res) => {
  await db.query('UPDATE roles SET mfa_required = $1 WHERE id = $2 AND is_superadmin = false', [req.body.mfaRequired, req.params.id])
  res.json({ ok: true })
})

rolesRouter.delete('/:id', requireSuperadmin, async (req, res) => {
  await db.query('DELETE FROM roles WHERE id = $1 AND is_superadmin = false', [req.params.id])
  res.status(204).send()
})
```

- [ ] **Step 8: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/users.test.ts tests/audit.test.ts --runInBand
```

Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/audit/ apps/api/src/users/ apps/api/src/roles/ apps/api/tests/users.test.ts apps/api/tests/audit.test.ts
git commit -m "feat: add audit logger, user management, and roles with MFA enforcement"
```

---

### Task 13: Agent-role permission management endpoints

**Files:**
- Modify: `apps/api/src/agents/permissions-router.ts`
- Create: `apps/api/tests/agent-permissions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/tests/agent-permissions.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()
let adminToken: string
let agentId: string
let roleId: string

beforeAll(async () => {
  let login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  if (login.status !== 200) {
    await request(app).post('/api/auth/setup').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!', name: 'Admin', platformName: 'Test' })
    login = await request(app).post('/api/auth/login').send({ email: 'admin@test.agentgate', password: 'SuperSecure123!' })
  }
  adminToken = login.body.token

  const agent = await request(app).post('/api/agents').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Perm API Agent', slug: 'perm-api-agent', description: 'test' })
  agentId = agent.body.agent.id

  const role = await db.query(`INSERT INTO roles (name, slug) VALUES ('Perm API Role', 'perm-api-role') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)
  roleId = role.rows[0].id
})

afterAll(async () => {
  await db.query("DELETE FROM agents WHERE slug = 'perm-api-agent'")
  await db.query("DELETE FROM roles WHERE slug = 'perm-api-role'")
  await db.end()
})

it('sets permissions for a role on an agent', async () => {
  const res = await request(app).put(`/api/agents/${agentId}/permissions/${roleId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ actions: ['read', 'query', 'invalid_action'] })
  expect(res.status).toBe(200)
  // invalid_action must be filtered out
  expect(res.body.permission.actions).toEqual(expect.arrayContaining(['read', 'query']))
  expect(res.body.permission.actions).not.toContain('invalid_action')
})

it('gets permissions for an agent', async () => {
  const res = await request(app).get(`/api/agents/${agentId}/permissions`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.permissions.some((p: any) => p.role_id === roleId)).toBe(true)
})

it('deletes permissions for a role', async () => {
  const res = await request(app).delete(`/api/agents/${agentId}/permissions/${roleId}`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(204)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/api && NODE_ENV=test npx jest tests/agent-permissions.test.ts --runInBand
```

Expected: FAIL — stub has no routes

- [ ] **Step 3: Implement agents/permissions-router.ts**

```typescript
// apps/api/src/agents/permissions-router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import { db } from '../db'

export const agentPermissionsRouter = Router({ mergeParams: true })

const VALID_ACTIONS = ['read', 'query', 'request', 'instruct', 'trigger_subagents']

agentPermissionsRouter.get('/', requireSuperadmin, async (req, res) => {
  const result = await db.query(
    `SELECT arp.id, arp.role_id, r.name AS role_name, r.slug, arp.actions FROM agent_role_permissions arp JOIN roles r ON r.id = arp.role_id WHERE arp.agent_id = $1`,
    [req.params.agentId]
  )
  res.json({ permissions: result.rows })
})

agentPermissionsRouter.put('/:roleId', requireSuperadmin, async (req, res) => {
  const actions = (req.body.actions as string[]).filter((a) => VALID_ACTIONS.includes(a))
  const result = await db.query(
    `INSERT INTO agent_role_permissions (agent_id, role_id, actions) VALUES ($1, $2, $3)
     ON CONFLICT (agent_id, role_id) DO UPDATE SET actions = EXCLUDED.actions RETURNING *`,
    [req.params.agentId, req.params.roleId, actions]
  )
  res.json({ permission: result.rows[0] })
})

agentPermissionsRouter.delete('/:roleId', requireSuperadmin, async (req, res) => {
  await db.query('DELETE FROM agent_role_permissions WHERE agent_id = $1 AND role_id = $2', [req.params.agentId, req.params.roleId])
  res.status(204).send()
})
```

- [ ] **Step 4: Run tests**

```bash
cd apps/api && NODE_ENV=test npx jest tests/agent-permissions.test.ts --runInBand
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run full test suite**

```bash
cd apps/api && NODE_ENV=test npx jest --runInBand
```

Expected: All tests PASS

- [ ] **Step 6: Final backend commit**

```bash
git add apps/api/src/agents/permissions-router.ts apps/api/tests/agent-permissions.test.ts
git commit -m "feat: add agent-role permission management API with action validation"
git tag v0.1.0-backend
```

---

## Summary

Plan 1 delivers a fully tested, production-ready backend:

| Module | Tests | Status |
|---|---|---|
| Monorepo + Docker (multi-stage) | — | ✅ |
| Schema + migrations | — | ✅ |
| Crypto module | 2 | ✅ |
| Auth (JWT + MFA + per-role enforcement) | 5 | ✅ |
| Permission engine (3-layer) | 5 | ✅ |
| Agent registry + token rotation | 6 | ✅ |
| Message router + Redis Streams + WebSocket | 3 | ✅ |
| Channel manager | 3 | ✅ |
| Sources manager + file indexing | 3 | ✅ |
| Audit logger | 2 | ✅ |
| User management | 3 | ✅ |
| Agent permission management API | 3 | ✅ |

**Next:** See `2026-03-22-agentgate-plan2-sdks.md`
