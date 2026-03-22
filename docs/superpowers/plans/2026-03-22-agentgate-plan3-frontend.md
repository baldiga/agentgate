# AgentGate Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AgentGate Next.js 14 App Router frontend — Slack-like user chat UI, SuperAdmin panel, agent config views, auth flow, and Docker deployment.

**Architecture:** Next.js 14 App Router with TypeScript. Auth via httpOnly cookie (JWT from backend `/api/auth/login` proxied through Next.js route handler). Real-time via REST send + 1s polling with 30s timeout. Route groups: `(app)` for authenticated user chat, `admin` for SuperAdmin panel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, SWR, Jest + React Testing Library, `next/font` (League Spartan, Sora, JetBrains Mono). Design tokens: `#1a1a1a` bg, `#c45d3e` accent.

---

## Chunk 1: Scaffold + Design System (Tasks 1–3)

### Task 1: apps/web package scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/jest.config.ts`
- Create: `apps/web/jest.setup.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/.env.example`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@agentgate/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "swr": "^2.2.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^15.0.6",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20.12.7",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#1a1a1a',
        surface: '#242424',
        border: '#2e2e2e',
        accent: '#c45d3e',
        'accent-hover': '#d4714f',
        muted: '#888888',
        'text-primary': '#e8e8e8',
        'text-secondary': '#aaaaaa',
        online: '#3ecf8e',
        danger: '#e05252',
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'sans-serif'],
        display: ['var(--font-league-spartan)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 4: Create `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { typedRoutes: true },
}

export default nextConfig
```

- [ ] **Step 5: Create `apps/web/jest.config.ts`**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
}

export default createJestConfig(config)
```

- [ ] **Step 6: Create `apps/web/jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6b: Create `apps/web/postcss.config.js`**

Required for Tailwind CSS v3 to process `@tailwind` directives during build.

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 7: Create `apps/web/.env.example`**

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 8: Install dependencies**

```bash
cd apps/web && npm install
```

Expected: `node_modules` created, no peer dep errors.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: exits 0 (no files yet, that's fine).

- [ ] **Step 10: Commit**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/tailwind.config.ts apps/web/next.config.ts apps/web/jest.config.ts apps/web/jest.setup.ts apps/web/postcss.config.js apps/web/.env.example
git commit -m "feat(web): scaffold Next.js 14 app with jest and tailwind"
```

---

### Task 2: Design tokens, global CSS, and UI primitives

**Files:**
- Create: `apps/web/src/styles/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Test: `apps/web/tests/components/ui/button.test.tsx`
- Test: `apps/web/tests/components/ui/input.test.tsx`
- Test: `apps/web/tests/components/ui/badge.test.tsx`

- [ ] **Step 1: Write failing tests for Button**

Create `apps/web/tests/components/ui/button.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders variant=ghost with ghost styles', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent')
  })
})
```

- [ ] **Step 2: Write failing tests for Input**

Create `apps/web/tests/components/ui/input.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('calls onChange when typed into', async () => {
    const onChange = jest.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Write failing tests for Badge**

Create `apps/web/tests/components/ui/badge.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders label', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders variant=danger with red styles', () => {
    render(<Badge variant="danger">Error</Badge>)
    // bg-danger/20 is the Tailwind class used for the danger variant
    expect(screen.getByText('Error').className).toContain('bg-danger')
  })
})
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
cd apps/web && npm test -- ui/
```

Expected: FAIL — modules not found.

- [ ] **Step 5: Create `apps/web/src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sora: 'Sora';
  --font-league-spartan: 'League Spartan';
  --font-jetbrains-mono: 'JetBrains Mono';
}

* { box-sizing: border-box; }

body {
  background-color: #1a1a1a;
  color: #e8e8e8;
  font-family: var(--font-sora), sans-serif;
  margin: 0;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #1a1a1a; }
::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #888888; }
```

- [ ] **Step 6: Create `apps/web/src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { League_Spartan, Sora, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  variable: '--font-league-spartan',
})
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'AgentGate',
  description: 'Enterprise AI agent permission management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${leagueSpartan.variable} ${sora.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Create `apps/web/src/components/ui/button.tsx`**

```typescript
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-white',
  ghost: 'bg-transparent hover:bg-surface text-text-secondary hover:text-text-primary border border-border',
  danger: 'bg-danger hover:opacity-90 text-white',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
```

- [ ] **Step 8: Create `apps/web/src/components/ui/input.tsx`**

```typescript
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`
        w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary
        placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  )
)
Input.displayName = 'Input'
```

- [ ] **Step 9: Create `apps/web/src/components/ui/badge.tsx`**

```typescript
type Variant = 'default' | 'success' | 'warning' | 'danger' | 'accent'

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-surface text-text-secondary border border-border',
  success: 'bg-online/20 text-online',
  warning: 'bg-yellow-500/20 text-yellow-400',
  danger: 'bg-danger/20 text-danger',
  accent: 'bg-accent/20 text-accent',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 10: Run tests — verify they pass**

```bash
cd apps/web && npm test -- ui/
```

Expected: PASS — 7 tests.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add design tokens, globals.css, Button/Input/Badge components"
```

---

### Task 3: API client, auth helpers, and shared types

**Files:**
- Create: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/auth.ts`
- Test: `apps/web/tests/lib/api.test.ts`
- Test: `apps/web/tests/lib/auth.test.ts`

- [ ] **Step 1: Write failing tests for api.ts**

Create `apps/web/tests/lib/api.test.ts`:

```typescript
import { apiFetch } from '@/lib/api'

global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'ok' }),
  })
})

describe('apiFetch', () => {
  it('calls the correct URL with base prepended', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000'
    await apiFetch('/agents')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/agents',
      expect.any(Object)
    )
  })

  it('sets Content-Type to application/json by default', async () => {
    await apiFetch('/agents')
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('throws ApiError when response is not ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    })
    await expect(apiFetch('/agents')).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })
})
```

- [ ] **Step 2: Write failing tests for auth.ts**

Create `apps/web/tests/lib/auth.test.ts`:

```typescript
import { parseJwtPayload } from '@/lib/auth'

describe('parseJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    // sub=1, role=superadmin, exp=9999999999
    // Use Buffer.from for Node.js compatibility (btoa is not globally available in all Node versions)
    const payloadB64 = Buffer.from(JSON.stringify({ sub: '1', role: 'superadmin', exp: 9999999999 })).toString('base64')
    const token = `header.${payloadB64}.sig`
    const payload = parseJwtPayload(token)
    expect(payload).toMatchObject({ sub: '1', role: 'superadmin' })
  })

  it('returns null for malformed token', () => {
    expect(parseJwtPayload('bad')).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd apps/web && npm test -- lib/
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Create `apps/web/src/lib/types.ts`**

```typescript
export interface User {
  id: string
  email: string
  name: string
  // System role — 'superadmin' for platform admins, 'user' for regular users
  // Custom role assignments (many-to-many) are in the separate roles field
  system_role: 'superadmin' | 'user'
  roles: Pick<Role, 'id' | 'name'>[]
  mfa_required: boolean
  active: boolean
}

export interface Agent {
  id: string
  name: string
  slug: string
  description: string
  ws_endpoint: string
  online: boolean
  locked: boolean // user lacks permission
}

export interface Message {
  id: string
  thread_id: string
  role: 'user' | 'agent'
  content: string
  created_at: string
}

export interface Thread {
  id: string
  agent_slug: string
  user_id: string
  created_at: string
}

export interface Role {
  id: string
  name: string
  mfa_required: boolean
}

export interface Permission {
  agent_id: string
  role_id: string
  allowed: boolean
  allowed_actions: string[]
}

export interface AuditLog {
  id: string
  user_id: string
  agent_id: string
  action: string
  // Spec §6.4: delivered | rejected | timed_out | redacted
  outcome: 'delivered' | 'rejected' | 'timed_out' | 'redacted'
  role_snapshot: string | null  // JSON snapshot of role names at time of request
  created_at: string
  encrypted_content: string | null  // AES-256; decrypted server-side before sending to SuperAdmin
}

export interface SdkToken {
  id: string
  agent_id: string
  label: string
  created_at: string
  last_used_at: string | null
  grace_until: string | null
}

export interface ApiError extends Error {
  status: number
  message: string
}
```

- [ ] **Step 5: Create `apps/web/src/lib/api.ts`**

```typescript
import { ApiError } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    const err = new Error(body.message ?? res.statusText) as ApiError & Error
    ;(err as unknown as Record<string, unknown>).status = res.status
    throw err
  }

  return res.json() as Promise<T>
}
```

- [ ] **Step 6: Create `apps/web/src/lib/auth.ts`**

```typescript
interface JwtPayload {
  sub: string
  role: 'superadmin' | 'user'
  exp: number
}

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Use Buffer for Node.js compatibility (atob not available before Node 18)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as JwtPayload
    return payload
  } catch {
    return null
  }
}

export function isExpired(payload: JwtPayload): boolean {
  return Date.now() / 1000 > payload.exp
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd apps/web && npm test -- lib/
```

Expected: PASS — 5 tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/ apps/web/tests/lib/
git commit -m "feat(web): add shared types, apiFetch client, and auth helpers"
```

---

## Chunk 2: Auth Flow (Tasks 4–5)

### Task 4: Setup wizard (`/setup`)

**Files:**
- Create: `apps/web/src/app/setup/page.tsx`
- Create: `apps/web/src/app/api/setup/route.ts`
- Test: `apps/web/tests/components/setup-form.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/components/setup-form.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetupPage from '@/app/setup/page'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('SetupPage', () => {
  it('renders the setup form', () => {
    render(<SetupPage />)
    expect(screen.getByText(/create superadmin/i)).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    render(<SetupPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@test.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123')
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- setup
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/web/src/app/api/setup/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${API}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

- [ ] **Step 4: Create `apps/web/src/app/setup/page.tsx`**

```typescript
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SetupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Setup failed')
        return
      }
      router.push('/login')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8">
        <h1 className="mb-2 font-display text-2xl font-bold text-text-primary">Create SuperAdmin</h1>
        <p className="mb-6 text-sm text-muted">First boot — set up your administrator account.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-text-secondary">Email</label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-text-secondary">Password</label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className="text-sm text-text-secondary">Confirm password</label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && npm test -- setup
```

Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/setup/ apps/web/src/app/api/setup/ apps/web/tests/components/setup-form.test.tsx
git commit -m "feat(web): add first-boot setup wizard"
```

---

### Task 5: Login page + middleware

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/logout/route.ts`
- Create: `apps/web/middleware.ts`
- Test: `apps/web/tests/components/login-page.test.tsx`
- Test: `apps/web/tests/middleware.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/components/login-page.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows error on bad credentials', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'x@x.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
  })
})
```

Create `apps/web/tests/middleware.test.ts`:

```typescript
import { NextRequest } from 'next/server'
import { middleware } from '@/../../middleware'

// Next.js middleware returns NextResponse — check the Location header for redirects
describe('middleware', () => {
  it('redirects to /login when agentgate_token cookie is absent on protected route', async () => {
    const req = new NextRequest('http://localhost:3000/support')
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('does not redirect when token cookie is present', async () => {
    const req = new NextRequest('http://localhost:3000/support', {
      headers: { cookie: 'agentgate_token=abc.def.ghi' },
    })
    const res = middleware(req)
    // NextResponse.next() has status 200
    expect(res.status).toBe(200)
  })

  it('does not redirect on /login when no cookie', async () => {
    const req = new NextRequest('http://localhost:3000/login')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('redirects /login to / when token cookie is present', async () => {
    const req = new NextRequest('http://localhost:3000/login', {
      headers: { cookie: 'agentgate_token=abc.def.ghi' },
    })
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/')
  })

  it('redirects /setup to / when token cookie is present', async () => {
    const req = new NextRequest('http://localhost:3000/setup', {
      headers: { cookie: 'agentgate_token=abc.def.ghi' },
    })
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/web && npm test -- "login|middleware"
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `apps/web/src/app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const upstream = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await upstream.json()

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('agentgate_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
```

- [ ] **Step 4: Create `apps/web/src/app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('agentgate_token')
  return res
}
```

- [ ] **Step 5: Create `apps/web/middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth', '/api/setup']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const token = req.cookies.get('agentgate_token')

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect authenticated users away from auth-only pages
  if ((pathname === '/login' || pathname === '/setup') && token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: Create `apps/web/src/app/login/page.tsx`**

```typescript
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Login failed')
        return
      }
      router.push('/')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <h1 className="mb-6 font-display text-3xl font-bold text-text-primary">AgentGate</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-text-secondary">Email</label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-text-secondary">Password</label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd apps/web && npm test -- "login|middleware"
```

Expected: PASS — 4 tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/login/ apps/web/src/app/api/auth/ apps/web/middleware.ts apps/web/tests/
git commit -m "feat(web): add login page, auth route handlers, and middleware"
```

---

## Chunk 3: User Chat View (Tasks 6–8)

### Task 6: Authenticated layout + Sidebar

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/components/layout/footer.tsx`
- Create: `apps/web/src/hooks/use-agents.ts`
- Test: `apps/web/tests/components/layout/sidebar.test.tsx`
- Test: `apps/web/tests/components/layout/footer.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/components/layout/footer.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/footer'

describe('Footer', () => {
  it('renders the credit line', () => {
    render(<Footer />)
    expect(screen.getByText(/Built by Amir Baldiga/)).toBeInTheDocument()
  })

  it('links to LinkedIn', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /connect on linkedin/i })
    expect(link).toHaveAttribute('href', 'https://linkedin.com/in/amirbaldiga')
  })
})
```

Create `apps/web/tests/components/layout/sidebar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/layout/sidebar'
import type { Agent } from '@/lib/types'

const agents: Agent[] = [
  { id: '1', name: 'Support Bot', slug: 'support', description: '', ws_endpoint: '', online: true, locked: false },
  { id: '2', name: 'Finance AI', slug: 'finance', description: '', ws_endpoint: '', online: false, locked: true },
]

jest.mock('next/navigation', () => ({ usePathname: () => '/support' }))

describe('Sidebar', () => {
  it('renders agent names', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
    expect(screen.getByText('Finance AI')).toBeInTheDocument()
  })

  it('shows lock icon for locked agents', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByLabelText('locked')).toBeInTheDocument()
  })

  it('shows online indicator for online agents', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByLabelText('online')).toBeInTheDocument()
  })

  it('renders footer credit', () => {
    render(<Sidebar agents={agents} />)
    expect(screen.getByText(/Built by Amir Baldiga/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/web && npm test -- layout/
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `apps/web/src/components/layout/footer.tsx`**

```typescript
export function Footer() {
  return (
    <footer className="px-4 py-3 text-xs text-muted border-t border-border">
      Built by Amir Baldiga ·{' '}
      <a
        href="https://linkedin.com/in/amirbaldiga"
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
      >
        Connect on LinkedIn
      </a>
    </footer>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/hooks/use-agents.ts`**

```typescript
import useSWR from 'swr'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'

export function useAgents() {
  const { data, error, isLoading } = useSWR<Agent[]>('/api/agents', apiFetch, {
    refreshInterval: 30_000,
  })
  return { agents: data ?? [], error, isLoading }
}
```

- [ ] **Step 5: Create `apps/web/src/components/layout/sidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Agent } from '@/lib/types'
import { Footer } from './footer'

interface SidebarProps {
  agents: Agent[]
}

export function Sidebar({ agents }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <span className="font-display text-lg font-bold text-text-primary">AgentGate</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted">Agents</p>
        {agents.map(agent => {
          const active = pathname === `/${agent.slug}`
          return (
            <Link
              key={agent.id}
              href={`/${agent.slug}`}
              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-accent/10 text-text-primary'
                  : agent.locked
                  ? 'cursor-not-allowed text-muted'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
              aria-disabled={agent.locked}
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                {agent.online && !agent.locked ? (
                  <span aria-label="online" className="h-2 w-2 rounded-full bg-online" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-border" />
                )}
              </span>
              <span className="flex-1 truncate">{agent.name}</span>
              {agent.locked && (
                <span aria-label="locked" className="text-muted">🔒</span>
              )}
            </Link>
          )
        })}
      </nav>

      <Footer />
    </aside>
  )
}
```

- [ ] **Step 6: Create `apps/web/src/app/(app)/layout.tsx`**

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'

async function getAgents(token: string): Promise<Agent[]> {
  try {
    return await apiFetch<Agent[]>('/api/agents', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return []
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const token = cookieStore.get('agentgate_token')?.value
  if (!token) redirect('/login')

  const agents = await getAgents(token)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar agents={agents} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd apps/web && npm test -- layout/
```

Expected: PASS — 6 tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/\(app\)/ apps/web/src/components/layout/ apps/web/src/hooks/use-agents.ts apps/web/tests/components/layout/
git commit -m "feat(web): add authenticated layout, sidebar with agent list, and footer credit"
```

---

### Task 7: Chat components

**Files:**
- Create: `apps/web/src/components/chat/agent-header.tsx`
- Create: `apps/web/src/components/chat/permission-bar.tsx`
- Create: `apps/web/src/components/chat/message-bubble.tsx`
- Create: `apps/web/src/components/chat/message-list.tsx`
- Test: `apps/web/tests/components/chat/agent-header.test.tsx`
- Test: `apps/web/tests/components/chat/permission-bar.test.tsx`
- Test: `apps/web/tests/components/chat/message-bubble.test.tsx`
- Test: `apps/web/tests/components/chat/message-list.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/components/chat/agent-header.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { AgentHeader } from '@/components/chat/agent-header'
import type { Agent } from '@/lib/types'

const agent: Agent = { id: '1', name: 'Support Bot', slug: 'support', description: 'Helps with support', ws_endpoint: '', online: true, locked: false }

describe('AgentHeader', () => {
  it('renders agent name', () => {
    render(<AgentHeader agent={agent} />)
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
  })

  it('shows online status', () => {
    render(<AgentHeader agent={agent} />)
    expect(screen.getByText(/online/i)).toBeInTheDocument()
  })
})
```

Create `apps/web/tests/components/chat/permission-bar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { PermissionBar } from '@/components/chat/permission-bar'

describe('PermissionBar', () => {
  it('renders nothing when allowedActions is empty', () => {
    const { container } = render(<PermissionBar allowedActions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders each allowed action as a badge', () => {
    render(<PermissionBar allowedActions={['read', 'query']} />)
    expect(screen.getByText('read')).toBeInTheDocument()
    expect(screen.getByText('query')).toBeInTheDocument()
  })
})
```

Create `apps/web/tests/components/chat/message-bubble.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MessageBubble } from '@/components/chat/message-bubble'
import type { Message } from '@/lib/types'

const userMsg: Message = { id: '1', thread_id: 't1', role: 'user', content: 'Hello', created_at: new Date().toISOString() }
const agentMsg: Message = { id: '2', thread_id: 't1', role: 'agent', content: 'Hi there', created_at: new Date().toISOString() }

describe('MessageBubble', () => {
  it('renders user message content', () => {
    render(<MessageBubble message={userMsg} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders agent message content', () => {
    render(<MessageBubble message={agentMsg} />)
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('applies different alignment for user vs agent', () => {
    const { container: c1 } = render(<MessageBubble message={userMsg} />)
    const { container: c2 } = render(<MessageBubble message={agentMsg} />)
    expect(c1.firstChild).toHaveClass('justify-end')
    expect(c2.firstChild).toHaveClass('justify-start')
  })
})
```

Create `apps/web/tests/components/chat/message-list.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MessageList } from '@/components/chat/message-list'
import type { Message } from '@/lib/types'

const messages: Message[] = [
  { id: '1', thread_id: 't1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
  { id: '2', thread_id: 't1', role: 'agent', content: 'Hi', created_at: new Date().toISOString() },
]

describe('MessageList', () => {
  it('renders all messages', () => {
    render(<MessageList messages={messages} loading={false} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi')).toBeInTheDocument()
  })

  it('shows loading indicator when loading=true', () => {
    render(<MessageList messages={[]} loading={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/web && npm test -- chat/
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `apps/web/src/components/chat/agent-header.tsx`**

```typescript
'use client'

import type { Agent } from '@/lib/types'

interface AgentHeaderProps {
  agent: Agent
}

export function AgentHeader({ agent }: AgentHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-3">
      <div>
        <h2 className="font-display text-base font-semibold text-text-primary">{agent.name}</h2>
        <p className="text-xs text-muted">
          {agent.online ? (
            <span className="text-online">● Online</span>
          ) : (
            <span>● Offline</span>
          )}
          {agent.description ? ` · ${agent.description}` : ''}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/components/chat/permission-bar.tsx`**

```typescript
'use client'

interface PermissionBarProps {
  allowedActions: string[]
}

export function PermissionBar({ allowedActions }: PermissionBarProps) {
  if (allowedActions.length === 0) return null
  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-6 py-2 text-xs text-muted">
      <span className="font-semibold">Allowed:</span>
      {allowedActions.map(action => (
        <span key={action} className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{action}</span>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/web/src/components/chat/message-bubble.tsx`**

```typescript
'use client'

import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'rounded-br-sm bg-accent text-white'
            : 'rounded-bl-sm bg-surface text-text-primary border border-border'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`mt-1 text-xs ${isUser ? 'text-white/60' : 'text-muted'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `apps/web/src/components/chat/message-list.tsx`**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: Message[]
  loading: boolean
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
      {messages.map(m => <MessageBubble key={m.id} message={m} />)}
      {loading && (
        <div role="status" className="flex items-center gap-2 text-sm text-muted">
          <span className="animate-pulse">Agent is thinking…</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd apps/web && npm test -- chat/
```

Expected: PASS — 10 tests (2 AgentHeader + 2 PermissionBar + 3 MessageBubble + 2 MessageList + 1 loading indicator).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/chat/ apps/web/tests/components/chat/
git commit -m "feat(web): add AgentHeader, PermissionBar, MessageBubble, MessageList components"
```

---

### Task 8: MessageInput + useMessages hook + agent thread page

**Files:**
- Create: `apps/web/src/components/chat/message-input.tsx`
- Create: `apps/web/src/components/chat/agent-chat-view.tsx`
- Create: `apps/web/src/hooks/use-messages.ts`
- Create: `apps/web/src/app/(app)/[agentSlug]/page.tsx`
- Test: `apps/web/tests/components/chat/message-input.test.tsx`
- Test: `apps/web/tests/hooks/use-messages.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/components/chat/message-input.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '@/components/chat/message-input'

describe('MessageInput', () => {
  it('renders textarea', () => {
    render(<MessageInput onSend={jest.fn()} disabled={false} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('calls onSend with trimmed text when Enter is pressed', async () => {
    const onSend = jest.fn()
    render(<MessageInput onSend={onSend} disabled={false} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hello')
  })

  it('does not call onSend when disabled', async () => {
    const onSend = jest.fn()
    render(<MessageInput onSend={onSend} disabled={true} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clears input after send', async () => {
    render(<MessageInput onSend={jest.fn()} disabled={false} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello{Enter}')
    expect(input).toHaveValue('')
  })
})
```

Create `apps/web/tests/hooks/use-messages.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useMessages } from '@/hooks/use-messages'

global.fetch = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('useMessages', () => {
  it('starts with empty messages', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] })
    const { result } = renderHook(() => useMessages('support'))
    expect(result.current.messages).toEqual([])
  })

  it('sendMessage sets loading to true then false on response', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ thread_id: 't1', id: 'm1' }) })
      .mockResolvedValue({ ok: true, json: async () => [{ id: 'm1', role: 'user', content: 'hi', created_at: new Date().toISOString(), thread_id: 't1' }, { id: 'm2', role: 'agent', content: 'hello', created_at: new Date().toISOString(), thread_id: 't1' }] })

    const { result } = renderHook(() => useMessages('support'))

    await act(async () => {
      await result.current.sendMessage('hi')
    })

    expect(result.current.loading).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/web && npm test -- "message-input|use-messages"
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `apps/web/src/hooks/use-messages.ts`**

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import type { Message } from '@/lib/types'

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 30_000

export function useMessages(agentSlug: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)

  // Load existing thread history on mount
  useEffect(() => {
    apiFetch<{ thread_id: string; messages: Message[] } | null>(
      `/api/threads/by-agent/${agentSlug}`
    )
      .then(data => {
        if (data) {
          setThreadId(data.thread_id)
          setMessages(data.messages)
        }
      })
      .catch(() => {}) // no thread yet — start fresh
  }, [agentSlug])

  const sendMessage = useCallback(async (content: string) => {
    setLoading(true)
    setError(null)

    // Optimistically add user message
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      thread_id: '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const sent = await apiFetch<{ thread_id: string; id: string }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ agent_slug: agentSlug, content }),
      })

      const threadId = sent.thread_id
      const deadline = Date.now() + POLL_TIMEOUT_MS

      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
        const msgs = await apiFetch<Message[]>(`/api/threads/${threadId}/messages`)
        const agentReplied = msgs.some(m => m.role === 'agent')
        setMessages(msgs)
        if (agentReplied) break
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setLoading(false)
    }
  }, [agentSlug])

  return { messages, loading, error, sendMessage }
}
```

- [ ] **Step 4: Create `apps/web/src/components/chat/message-input.tsx`**

```typescript
'use client'

import { useState, KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = value.trim()
      if (!trimmed || disabled) return
      onSend(trimmed)
      setValue('')
    }
  }

  return (
    <div className="border-t border-border px-6 py-4">
      <textarea
        className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
        placeholder={disabled ? 'Agent is responding…' : 'Message agent… (Enter to send, Shift+Enter for newline)'}
        rows={3}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/web/src/app/(app)/[agentSlug]/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'
import { AgentChatView } from '@/components/chat/agent-chat-view'

async function getAgent(slug: string, token: string): Promise<Agent | null> {
  try {
    return await apiFetch<Agent>(`/api/agents/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return null
  }
}

async function getAllowedActions(slug: string, token: string): Promise<string[]> {
  try {
    const perm = await apiFetch<{ allowed_actions: string[] }>(`/api/agents/${slug}/my-permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return perm.allowed_actions
  } catch {
    return []
  }
}

export default async function AgentPage({ params }: { params: { agentSlug: string } }) {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const [agent, allowedActions] = await Promise.all([
    getAgent(params.agentSlug, token),
    getAllowedActions(params.agentSlug, token),
  ])
  if (!agent) notFound()

  return <AgentChatView agent={agent} allowedActions={allowedActions} />
}
```

- [ ] **Step 6: Create `apps/web/src/components/chat/agent-chat-view.tsx`**

```typescript
'use client'

import type { Agent } from '@/lib/types'
import { AgentHeader } from './agent-header'
import { PermissionBar } from './permission-bar'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { useMessages } from '@/hooks/use-messages'

interface AgentChatViewProps {
  agent: Agent
  allowedActions: string[]
}

export function AgentChatView({ agent, allowedActions }: AgentChatViewProps) {
  const { messages, loading, sendMessage } = useMessages(agent.slug)

  if (agent.locked) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <p>You do not have permission to access this agent.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AgentHeader agent={agent} />
      {/* v1: allowedActions passed from server (fetched in page.tsx); action-level UI is display-only in v1 */}
      <PermissionBar allowedActions={allowedActions} />
      <MessageList messages={messages} loading={loading} />
      <MessageInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd apps/web && npm test -- "message-input|use-messages"
```

Expected: PASS — 6 tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/chat/ apps/web/src/hooks/use-messages.ts apps/web/src/app/\(app\)/ apps/web/tests/
git commit -m "feat(web): add MessageInput, useMessages hook, and agent thread page"
```

---

## Chunk 4: SuperAdmin — Agents (Tasks 9–11)

### Task 9: Admin layout + agent registry table

**Files:**
- Create: `apps/web/src/app/admin/layout.tsx`
- Create: `apps/web/src/components/layout/admin-nav.tsx`
- Create: `apps/web/src/app/admin/agents/page.tsx`
- Create: `apps/web/src/components/admin/agent-table.tsx`
- Create: `apps/web/src/components/admin/agents-page-client.tsx`
- Test: `apps/web/tests/components/admin/agent-table.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/components/admin/agent-table.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { AgentTable } from '@/components/admin/agent-table'
import type { Agent } from '@/lib/types'

const agents: Agent[] = [
  { id: '1', name: 'Support Bot', slug: 'support', description: 'Support', ws_endpoint: 'ws://x', online: true, locked: false },
  { id: '2', name: 'Finance AI', slug: 'finance', description: 'Finance', ws_endpoint: 'ws://y', online: false, locked: false },
]

describe('AgentTable', () => {
  it('renders agent names in rows', () => {
    render(<AgentTable agents={agents} onDelete={jest.fn()} />)
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
    expect(screen.getByText('Finance AI')).toBeInTheDocument()
  })

  it('shows online badge for online agents', () => {
    render(<AgentTable agents={agents} onDelete={jest.fn()} />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders Edit and Delete actions for each row', () => {
    render(<AgentTable agents={agents} onDelete={jest.fn()} />)
    expect(screen.getAllByRole('link', { name: /edit/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- agent-table
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/web/src/components/layout/admin-nav.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/sdk-tokens', label: 'SDK Tokens' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            pathname.startsWith(l.href)
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-text-secondary hover:bg-surface hover:text-text-primary'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/app/admin/layout.tsx`**

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseJwtPayload } from '@/lib/auth'
import { AdminNav } from '@/components/layout/admin-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('agentgate_token')?.value
  if (!token) redirect('/login')
  const payload = parseJwtPayload(token)
  if (payload?.role !== 'superadmin') redirect('/')

  return (
    <div className="flex h-screen bg-bg">
      <aside className="w-52 border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <span className="font-display text-base font-bold text-text-primary">Admin</span>
        </div>
        <AdminNav />
      </aside>
      <main className="flex flex-1 flex-col overflow-auto p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/web/src/components/admin/agent-table.tsx`**

```typescript
'use client'

import Link from 'next/link'
import type { Agent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AgentTableProps {
  agents: Agent[]
  onDelete: (id: string) => void
}

export function AgentTable({ agents, onDelete }: AgentTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Endpoint</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-surface/50">
              <td className="px-4 py-3 font-medium text-text-primary">{agent.name}</td>
              <td className="px-4 py-3 font-mono text-text-secondary">{agent.slug}</td>
              <td className="px-4 py-3">
                <Badge variant={agent.online ? 'success' : 'default'}>
                  {agent.online ? 'Online' : 'Offline'}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted truncate max-w-xs">{agent.ws_endpoint}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/agents/${agent.id}`} aria-label="edit" className="text-xs text-accent hover:underline">Edit</Link>
                  <Button variant="danger" size="sm" aria-label="delete" onClick={() => onDelete(agent.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Create `apps/web/src/app/admin/agents/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Agent } from '@/lib/types'
import { AgentsPageClient } from '@/components/admin/agents-page-client'

async function getAgents(token: string): Promise<Agent[]> {
  return apiFetch<Agent[]>('/api/agents', { headers: { Authorization: `Bearer ${token}` } })
}

export default async function AgentsPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const agents = await getAgents(token)
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Agents</h1>
      <AgentsPageClient initialAgents={agents} />
    </div>
  )
}
```

- [ ] **Step 7: Create `apps/web/src/components/admin/agents-page-client.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/lib/types'
import { AgentTable } from './agent-table'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'

interface AgentsPageClientProps {
  initialAgents: Agent[]
}

export function AgentsPageClient({ initialAgents }: AgentsPageClientProps) {
  const router = useRouter()
  const [agents, setAgents] = useState(initialAgents)

  async function handleDelete(id: string) {
    if (!confirm('Delete this agent?')) return
    await apiFetch(`/api/agents/${id}`, { method: 'DELETE' })
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push('/admin/agents/new')}>+ New Agent</Button>
      </div>
      <AgentTable agents={agents} onDelete={handleDelete} />
    </div>
  )
}
```

- [ ] **Step 8: Run test — verify it passes**

```bash
cd apps/web && npm test -- agent-table
```

Expected: PASS — 3 tests.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/admin/ apps/web/src/components/admin/ apps/web/src/components/layout/admin-nav.tsx apps/web/tests/components/admin/
git commit -m "feat(web): add admin layout, nav, and agent registry table"
```

---

### Task 10: Agent config tabbed view

**Files:**
- Create: `apps/web/src/app/admin/agents/[id]/page.tsx`
- Create: `apps/web/src/components/admin/agent-config-tabs.tsx`
- Create: `apps/web/src/components/admin/source-manager.tsx`
- Test: `apps/web/tests/components/admin/agent-config-tabs.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/components/admin/agent-config-tabs.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentConfigTabs } from '@/components/admin/agent-config-tabs'
import type { Agent } from '@/lib/types'

const agent: Agent = { id: '1', name: 'Support Bot', slug: 'support', description: 'Help', ws_endpoint: 'ws://x', online: true, locked: false }

describe('AgentConfigTabs', () => {
  it('renders General, Permissions, and Sources tabs', () => {
    render(<AgentConfigTabs agent={agent} roles={[]} permissions={[]} />)
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sources/i })).toBeInTheDocument()
  })

  it('shows General tab content by default', () => {
    render(<AgentConfigTabs agent={agent} roles={[]} permissions={[]} />)
    expect(screen.getByDisplayValue('Support Bot')).toBeInTheDocument()
  })

  it('switches to Permissions tab on click', async () => {
    render(<AgentConfigTabs agent={agent} roles={[]} permissions={[]} />)
    await userEvent.click(screen.getByRole('tab', { name: /permissions/i }))
    expect(screen.getByText(/role permissions/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- agent-config-tabs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/web/src/components/admin/source-manager.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Source {
  id: string
  name: string
  type: 'url' | 'file'
  value: string
}

interface SourceManagerProps {
  agentId: string
  initialSources?: Source[]
}

export function SourceManager({ agentId, initialSources = [] }: SourceManagerProps) {
  const [sources, setSources] = useState<Source[]>(initialSources)
  const [url, setUrl] = useState('')

  async function addSource() {
    if (!url.trim()) return
    const res = await fetch(`/api/agents/${agentId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'url', value: url }),
    })
    const src = await res.json() as Source
    setSources(prev => [...prev, src])
    setUrl('')
  }

  async function removeSource(id: string) {
    await fetch(`/api/agents/${agentId}/sources/${id}`, { method: 'DELETE' })
    setSources(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Knowledge Sources</h3>
      <div className="flex gap-2">
        <Input placeholder="https://docs.example.com" value={url} onChange={e => setUrl(e.target.value)} />
        <Button onClick={addSource} size="sm">Add URL</Button>
      </div>
      <ul className="flex flex-col gap-2">
        {sources.map(s => (
          <li key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span className="truncate text-text-secondary">{s.value}</span>
            <Button variant="ghost" size="sm" onClick={() => removeSource(s.id)}>Remove</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/components/admin/agent-config-tabs.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { Agent, Role, Permission } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SourceManager } from './source-manager'
import { apiFetch } from '@/lib/api'

type Tab = 'general' | 'permissions' | 'sources'

interface AgentConfigTabsProps {
  agent: Agent
  roles: Role[]
  permissions: Permission[]
}

export function AgentConfigTabs({ agent, roles, permissions }: AgentConfigTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description)
  const [wsEndpoint, setWsEndpoint] = useState(agent.ws_endpoint)
  const [saving, setSaving] = useState(false)

  async function saveGeneral() {
    setSaving(true)
    await apiFetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description, ws_endpoint: wsEndpoint }),
    })
    setSaving(false)
  }

  // v1: 3 tabs. Spec §9.3 requires 5 (+ Sub-agents + Audit Trail) — add in v2.
  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'sources', label: 'Sources & Knowledge' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="flex flex-col gap-4 max-w-lg">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-secondary">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-secondary">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-secondary">WebSocket Endpoint</label>
            <Input value={wsEndpoint} onChange={e => setWsEndpoint(e.target.value)} />
          </div>
          <Button onClick={saveGeneral} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-text-primary">Role Permissions</h3>
          <p className="text-xs text-muted">
            {/* v1: binary allow/deny per role. Spec §6.2 defines action-level controls (read, query, request, instruct, trigger_subagents) — add in v2. */}
            Shows whether each role can access this agent. Action-level controls (read, query, etc.) coming in v2.
          </p>
          <div className="flex flex-col gap-2">
            {roles.map(role => {
              const perm = permissions.find(p => p.role_id === role.id)
              return (
                <div key={role.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                  <div>
                    <span className="text-sm text-text-primary">{role.name}</span>
                    {perm?.allowed_actions && perm.allowed_actions.length > 0 && (
                      <p className="text-xs text-muted">{perm.allowed_actions.join(', ')}</p>
                    )}
                  </div>
                  <Badge variant={perm?.allowed ? 'success' : 'danger'}>
                    {perm?.allowed ? 'Allowed' : 'Denied'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <SourceManager agentId={agent.id} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/web/src/app/admin/agents/[id]/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { Agent, Role, Permission } from '@/lib/types'
import { AgentConfigTabs } from '@/components/admin/agent-config-tabs'

export default async function AgentConfigPage({ params }: { params: { id: string } }) {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const headers = { Authorization: `Bearer ${token}` }

  try {
    const [agent, roles, permissions] = await Promise.all([
      apiFetch<Agent>(`/api/agents/${params.id}`, { headers }),
      apiFetch<Role[]>('/api/roles', { headers }),
      apiFetch<Permission[]>(`/api/agents/${params.id}/permissions`, { headers }),
    ])
    return (
      <div>
        <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">{agent.name}</h1>
        <AgentConfigTabs agent={agent} roles={roles} permissions={permissions} />
      </div>
    )
  } catch {
    notFound()
  }
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
cd apps/web && npm test -- agent-config-tabs
```

Expected: PASS — 3 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/admin/agents/ apps/web/src/components/admin/ apps/web/tests/components/admin/agent-config-tabs.test.tsx
git commit -m "feat(web): add agent config tabbed view with general, permissions, and sources tabs"
```

---

### Task 11: SDK Token panel

**Files:**
- Create: `apps/web/src/app/admin/sdk-tokens/page.tsx`
- Create: `apps/web/src/components/admin/token-panel.tsx`
- Test: `apps/web/tests/components/admin/token-panel.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/components/admin/token-panel.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TokenPanel } from '@/components/admin/token-panel'
import type { SdkToken } from '@/lib/types'

const tokens: SdkToken[] = [
  { id: '1', agent_id: 'a1', label: 'Production', created_at: new Date().toISOString(), last_used_at: null, grace_until: null },
]

global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ id: '2', agent_id: 'a1', label: 'New', token: 'sk.abc123', created_at: new Date().toISOString(), last_used_at: null, grace_until: null }),
  })
})

describe('TokenPanel', () => {
  it('renders existing tokens', () => {
    render(<TokenPanel agentId="a1" initialTokens={tokens} />)
    expect(screen.getByText('Production')).toBeInTheDocument()
  })

  it('shows generated token once after creation', async () => {
    render(<TokenPanel agentId="a1" initialTokens={tokens} />)
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(await screen.findByText(/sk\./)).toBeInTheDocument()
  })

  it('renders revoke button for each token', () => {
    render(<TokenPanel agentId="a1" initialTokens={tokens} />)
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- token-panel
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/web/src/components/admin/token-panel.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { SdkToken } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TokenPanelProps {
  agentId: string
  initialTokens: SdkToken[]
}

interface NewToken extends SdkToken {
  token: string
}

export function TokenPanel({ agentId, initialTokens }: TokenPanelProps) {
  const [tokens, setTokens] = useState<SdkToken[]>(initialTokens)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [label, setLabel] = useState('')

  async function generate() {
    if (!label.trim()) return
    setGenerating(true)
    setRevealed(null)
    const res = await fetch(`/api/agents/${agentId}/sdk-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim() }),
    })
    const data = await res.json() as NewToken
    setTokens(prev => [...prev, data])
    setRevealed(data.token)
    setLabel('')
    setGenerating(false)
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this token? Agents using it have a 15-minute grace period where both old and new tokens remain valid.')) return
    await fetch(`/api/agents/${agentId}/sdk-tokens/${id}`, { method: 'DELETE' })
    setTokens(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">SDK Tokens</h3>
          <input
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder="Token label (e.g. Production)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={generate} disabled={generating || !label.trim()}>
          {generating ? 'Generating…' : 'Generate token'}
        </Button>
      </div>

      {revealed && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-4">
          <p className="mb-1 text-xs text-muted">Copy this token — it will not be shown again.</p>
          <code className="font-mono text-sm text-accent break-all">{revealed}</code>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tokens.map(token => (
          <div key={token.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-text-primary">{token.label}</span>
              <span className="text-xs text-muted">
                Created {new Date(token.created_at).toLocaleDateString()}
                {token.last_used_at && ` · Last used ${new Date(token.last_used_at).toLocaleDateString()}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {token.grace_until && (
                <Badge variant="warning">Grace until {new Date(token.grace_until).toLocaleDateString()}</Badge>
              )}
              <Button variant="danger" size="sm" onClick={() => revoke(token.id)}>Revoke</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/app/admin/sdk-tokens/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Agent, SdkToken } from '@/lib/types'
import { TokenPanel } from '@/components/admin/token-panel'

export default async function SdkTokensPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const headers = { Authorization: `Bearer ${token}` }
  const agents = await apiFetch<Agent[]>('/api/agents', { headers })

  const agentTokens = await Promise.all(
    agents.map(async a => ({
      agent: a,
      tokens: await apiFetch<SdkToken[]>(`/api/agents/${a.id}/sdk-tokens`, { headers }),
    }))
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold text-text-primary">SDK Tokens</h1>
      {agentTokens.map(({ agent, tokens }) => (
        <div key={agent.id} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-secondary">{agent.name}</h2>
          <TokenPanel agentId={agent.id} initialTokens={tokens} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && npm test -- token-panel
```

Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/sdk-tokens/ apps/web/src/components/admin/token-panel.tsx apps/web/tests/components/admin/token-panel.test.tsx
git commit -m "feat(web): add SDK token panel with generate, show-once, revoke"
```

---

## Chunk 5: SuperAdmin — Users, Roles, Audit + Deploy (Tasks 12–14)

### Task 12: Users page + Roles page

**Files:**
- Create: `apps/web/src/app/admin/users/page.tsx`
- Create: `apps/web/src/components/admin/user-table.tsx`
- Create: `apps/web/src/app/admin/roles/page.tsx`
- Create: `apps/web/src/components/admin/role-matrix.tsx`
- Test: `apps/web/tests/components/admin/user-table.test.tsx`
- Test: `apps/web/tests/components/admin/role-matrix.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/components/admin/user-table.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { UserTable } from '@/components/admin/user-table'
import type { User } from '@/lib/types'

const users: User[] = [
  { id: '1', email: 'alice@test.com', name: 'Alice', system_role: 'user', roles: [{ id: 'r1', name: 'Support Team' }], mfa_required: false, active: true },
  { id: '2', email: 'bob@test.com', name: 'Bob', system_role: 'user', roles: [], mfa_required: true, active: false },
]

describe('UserTable', () => {
  it('renders user emails', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('shows Active/Inactive badge', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows MFA required badge when applicable', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('MFA')).toBeInTheDocument()
  })

  it('shows assigned role names', () => {
    render(<UserTable users={users} onDeactivate={jest.fn()} />)
    expect(screen.getByText('Support Team')).toBeInTheDocument()
  })
})
```

Create `apps/web/tests/components/admin/role-matrix.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { RoleMatrix } from '@/components/admin/role-matrix'
import type { Role } from '@/lib/types'

const roles: Role[] = [
  { id: '1', name: 'Support Team', mfa_required: false },
  { id: '2', name: 'Finance Team', mfa_required: true },
]

describe('RoleMatrix', () => {
  it('renders role names', () => {
    render(<RoleMatrix roles={roles} onDelete={jest.fn()} />)
    expect(screen.getByText('Support Team')).toBeInTheDocument()
    expect(screen.getByText('Finance Team')).toBeInTheDocument()
  })

  it('shows MFA badge for roles with mfa_required', () => {
    render(<RoleMatrix roles={roles} onDelete={jest.fn()} />)
    expect(screen.getByText('MFA required')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/web && npm test -- "user-table|role-matrix"
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `apps/web/src/components/admin/user-table.tsx`**

```typescript
'use client'

import type { User } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface UserTableProps {
  users: User[]
  onDeactivate: (id: string) => void
}

export function UserTable({ users, onDeactivate }: UserTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">MFA</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface/50">
              <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
              <td className="px-4 py-3 text-text-secondary">{user.email}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {user.roles.length === 0
                    ? <span className="text-xs text-muted">—</span>
                    : user.roles.map(r => <Badge key={r.id} variant="default">{r.name}</Badge>)
                  }
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={user.active ? 'success' : 'default'}>
                  {user.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {user.mfa_required && <Badge variant="warning">MFA</Badge>}
              </td>
              <td className="px-4 py-3">
                {user.active && (
                  <Button variant="ghost" size="sm" onClick={() => onDeactivate(user.id)}>Deactivate</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/components/admin/role-matrix.tsx`**

```typescript
'use client'

import type { Role } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface RoleMatrixProps {
  roles: Role[]
  onDelete: (id: string) => void
}

export function RoleMatrix({ roles, onDelete }: RoleMatrixProps) {
  return (
    <div className="flex flex-col gap-2">
      {roles.map(role => (
        <div key={role.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary">{role.name}</span>
            {role.mfa_required && <Badge variant="warning">MFA required</Badge>}
          </div>
          <Button variant="danger" size="sm" onClick={() => onDelete(role.id)}>Delete</Button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/web/src/app/admin/users/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { User } from '@/lib/types'
import { UsersPageClient } from '@/components/admin/users-page-client'

export default async function UsersPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const users = await apiFetch<User[]>('/api/users', { headers: { Authorization: `Bearer ${token}` } })
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Users</h1>
      <UsersPageClient initialUsers={users} />
    </div>
  )
}
```

- [ ] **Step 6: Create `apps/web/src/components/admin/users-page-client.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { User } from '@/lib/types'
import { UserTable } from './user-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface UsersPageClientProps {
  initialUsers: User[]
}

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  async function handleDeactivate(id: string) {
    await apiFetch(`/api/users/${id}/deactivate`, { method: 'POST' })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: false } : u))
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const user = await apiFetch<User>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail }),
    })
    setUsers(prev => [...prev, user])
    setInviteEmail('')
    setInviting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input
          type="email"
          placeholder="email@company.com"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
          {inviting ? 'Inviting…' : 'Invite user'}
        </Button>
      </div>
      <UserTable users={users} onDeactivate={handleDeactivate} />
    </div>
  )
}
```

- [ ] **Step 7: Create `apps/web/src/app/admin/roles/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Role } from '@/lib/types'
import { RolesPageClient } from '@/components/admin/roles-page-client'

export default async function RolesPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const roles = await apiFetch<Role[]>('/api/roles', { headers: { Authorization: `Bearer ${token}` } })
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Roles</h1>
      <RolesPageClient initialRoles={roles} />
    </div>
  )
}
```

- [ ] **Step 8: Create `apps/web/src/components/admin/roles-page-client.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { Role } from '@/lib/types'
import { RoleMatrix } from './role-matrix'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface RolesPageClientProps {
  initialRoles: Role[]
}

export function RolesPageClient({ initialRoles }: RolesPageClientProps) {
  const [roles, setRoles] = useState(initialRoles)
  const [newName, setNewName] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)

  async function createRole() {
    if (!newName.trim()) return
    const role = await apiFetch<Role>('/api/roles', {
      method: 'POST',
      body: JSON.stringify({ name: newName, mfa_required: mfaRequired }),
    })
    setRoles(prev => [...prev, role])
    setNewName('')
    setMfaRequired(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return
    await apiFetch(`/api/roles/${id}`, { method: 'DELETE' })
    setRoles(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm text-text-secondary">Role name</label>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Support Team" />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={mfaRequired} onChange={e => setMfaRequired(e.target.checked)} className="accent-accent" />
          MFA required
        </label>
        <Button onClick={createRole}>Create Role</Button>
      </div>
      <RoleMatrix roles={roles} onDelete={handleDelete} />
    </div>
  )
}
```

- [ ] **Step 9: Run tests — verify they pass**

```bash
cd apps/web && npm test -- "user-table|role-matrix"
```

Expected: PASS — 5 tests.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/admin/users/ apps/web/src/app/admin/roles/ apps/web/src/components/admin/ apps/web/tests/components/admin/
git commit -m "feat(web): add users and roles admin pages"
```

---

### Task 13: Audit log viewer

**Files:**
- Create: `apps/web/src/app/admin/audit/page.tsx`
- Create: `apps/web/src/components/admin/audit-table.tsx`
- Test: `apps/web/tests/components/admin/audit-table.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/components/admin/audit-table.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuditTable } from '@/components/admin/audit-table'
import type { AuditLog } from '@/lib/types'

const logs: AuditLog[] = [
  { id: '1', user_id: 'u1', agent_id: 'a1', action: 'message', outcome: 'delivered', created_at: new Date().toISOString(), encrypted_content: null, role_snapshot: null },
  { id: '2', user_id: 'u2', agent_id: 'a1', action: 'message', outcome: 'rejected', created_at: new Date().toISOString(), encrypted_content: null, role_snapshot: null },
]

describe('AuditTable', () => {
  it('renders log entries', () => {
    render(<AuditTable logs={logs} />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 rows
  })

  it('shows outcome badges', () => {
    render(<AuditTable logs={logs} />)
    expect(screen.getByText('delivered')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })

  it('filters rows by outcome when filter is selected', async () => {
    render(<AuditTable logs={logs} />)
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'rejected')
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + 1
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- audit-table
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/web/src/components/admin/audit-table.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { AuditLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface AuditTableProps {
  logs: AuditLog[]
}

export function AuditTable({ logs }: AuditTableProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<'' | 'delivered' | 'rejected' | 'timed_out' | 'redacted'>('')

  const filtered = outcomeFilter ? logs.filter(l => l.outcome === outcomeFilter) : logs

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select
          value={outcomeFilter}
          onChange={e => setOutcomeFilter(e.target.value as '' | 'delivered' | 'rejected' | 'timed_out' | 'redacted')}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">All outcomes</option>
          <option value="delivered">Delivered</option>
          <option value="rejected">Rejected</option>
          <option value="timed_out">Timed out</option>
          <option value="redacted">Redacted</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                <td className="px-4 py-3 text-muted font-mono text-xs">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.user_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.agent_id}</td>
                <td className="px-4 py-3 text-text-secondary">{log.action}</td>
                <td className="px-4 py-3">
                  <Badge variant={log.outcome === 'delivered' ? 'success' : log.outcome === 'rejected' ? 'danger' : 'warning'}>
                    {log.outcome}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/app/admin/audit/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { AuditLog } from '@/lib/types'
import { AuditTable } from '@/components/admin/audit-table'

export default async function AuditPage() {
  const token = cookies().get('agentgate_token')?.value ?? ''
  const logs = await apiFetch<AuditLog[]>('/api/audit', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">Audit Log</h1>
      <AuditTable logs={logs} />
    </div>
  )
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && npm test -- audit-table
```

Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/audit/ apps/web/src/components/admin/audit-table.tsx apps/web/tests/components/admin/audit-table.test.tsx
git commit -m "feat(web): add audit log viewer with outcome filter"
```

---

### Task 14: Dockerfile, docker-compose, and README

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `docker-compose.yml` (root)
- Create: `.env.example` (root)
- Create: `README.md` (root)

- [ ] **Step 1: Create `apps/web/Dockerfile`**

Build context in `docker-compose.yml` is the monorepo root (`.`), so Dockerfile paths must be relative to the root.

```dockerfile
# Stage 1: builder
# Build context is the monorepo root — paths below are relative to repo root
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root manifests (for npm workspaces)
COPY package*.json turbo.json ./
COPY apps/web/package*.json apps/web/
# Copy any shared packages the web app depends on
COPY packages/ packages/

RUN npm ci --workspace=apps/web

COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create root `docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: agentgate
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-agentgate}
      POSTGRES_DB: agentgate
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agentgate"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://agentgate:${POSTGRES_PASSWORD:-agentgate}@postgres:5432/agentgate
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
      AGENTGATE_SECRET: ${AGENTGATE_SECRET:?AGENTGATE_SECRET is required — AES-256 key for encrypting message content and audit logs}
      PORT: 4000
    ports:
      - "4000:4000"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://api:4000
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

- [ ] **Step 2b: Create root `.env.example`**

```bash
# Copy this to .env and fill in your values before running docker-compose

# Required — generate with: openssl rand -hex 32
JWT_SECRET=

# Required — AES-256 key for encrypting message content and audit logs
# Generate with: openssl rand -hex 32
AGENTGATE_SECRET=

# Optional — defaults to 'agentgate' if not set (change for production)
POSTGRES_PASSWORD=agentgate
```

- [ ] **Step 3: Create root `README.md`**

```markdown
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
```

- [ ] **Step 4: Verify docker-compose syntax**

```bash
docker-compose config --quiet
```

Expected: exits 0 (valid YAML, no errors).

- [ ] **Step 5: Run full test suite**

```bash
cd apps/web && npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/Dockerfile docker-compose.yml .env.example README.md
git commit -m "feat: add Dockerfile, docker-compose, env template, and README"
```

---

## Execution Order

Plans must execute in this order — the backend API must exist before the frontend can make real API calls during integration:

1. **Plan 1** — Backend (`apps/api` + database + auth + permissions + WebSocket router)
2. **Plan 2** — SDKs (`packages/sdk-ts` + `packages/sdk-py`)
3. **Plan 3** — Frontend (`apps/web`) ← this plan
