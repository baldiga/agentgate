# AgentGate — Enterprise Agent Permission Framework
**Design Spec · 2026-03-22 · v2**

---

## 1. Problem Statement

Enterprise teams deploying AI agents face a critical gap: most agent frameworks provide no access control. Any user can interact with any agent, exposing sensitive data and business logic across departments. AgentGate solves this by acting as a **self-hosted permission and routing layer** between users and agents — controlling who can talk to what, how, and what data they receive.

---

## 2. Goals

- Open-source, self-hosted: enterprises download, run on their own servers, own their data
- Framework-agnostic: works with any agent (LangGraph, CrewAI, AutoGen, custom)
- Role-based access at three levels: access gate, action control, data filtering
- Slack-like UI: familiar, low learning curve for enterprise teams
- Single `docker-compose up` deploy story
- SDK in both TypeScript and Python (covering all enterprise agent stacks)

## 3. Non-Goals

- Not a model provider or agent execution engine
- Not a managed/cloud service (enterprises self-host)
- Not opinionated about what agents do internally

---

## 4. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Modern, GitHub-friendly, easy Docker deploy |
| Backend | Node.js + Express | Single language with frontend, large contributor pool |
| Database | PostgreSQL | Relational model suits RBAC and audit logging |
| Real-time | Redis Streams | Durable pub/sub for streaming — persists in-flight chunks, survives dropped connections |
| Auth | JWT + SSO/LDAP adapters | Built-in for small teams, SSO for enterprise |
| SDK | TypeScript (npm) + Python (PyPI) | Covers both major agent developer ecosystems |
| Migrations | node-pg-migrate | Schema versioning on every boot |
| Deploy | Docker Compose | Single command self-host, no cloud dependency |

---

## 5. Architecture

Three-layer architecture — platform sits between users and agents:

```
┌─────────────────────────────────────────────┐
│  Layer 1 — Users & UI (Next.js)             │
│  SuperAdmin · COO · Marketing Manager · ...  │
└─────────────────┬───────────────────────────┘
                  │ WebSocket over TLS
┌─────────────────▼───────────────────────────┐
│  Layer 2 — Platform Core (Node.js API)       │
│                                              │
│  ┌──────────┐ ┌───────────┐ ┌─────────────┐ │
│  │   Auth   │ │Permission │ │   Message   │ │
│  │ Service  │ │  Engine   │ │   Router    │ │
│  └──────────┘ └───────────┘ └─────────────┘ │
│  ┌──────────┐ ┌───────────┐ ┌─────────────┐ │
│  │  Agent   │ │ Channel   │ │   Audit     │ │
│  │ Registry │ │ Manager   │ │   Logger    │ │
│  └──────────┘ └───────────┘ └─────────────┘ │
│  ┌──────────────────┐ ┌────────────────────┐ │
│  │   PostgreSQL      │ │   Redis Streams    │ │
│  └──────────────────┘ └────────────────────┘ │
└─────────────────┬───────────────────────────┘
                  │ SDK over TLS (mTLS optional)
┌─────────────────▼───────────────────────────┐
│  Layer 3 — Enterprise Agents (external)      │
│  CMO Agent · COO Agent · Legal · HR · ...    │
│  (LangGraph / CrewAI / AutoGen / custom)     │
└─────────────────────────────────────────────┘
```

**Message flow:**
1. User sends message in UI
2. Auth Service validates session
3. Permission Engine checks: can this role access this agent? what actions are allowed?
4. Message Router forwards message to agent via SDK with `user_context` payload over TLS
5. Agent reads `user_context` and shapes response (data-layer filtering — agent responsibility)
6. Platform validates response schema before delivering to user (see §6.2 enforcement model)
7. Response streams back to user via WebSocket/TLS using Redis Streams (durable — survives reconnects)
8. Audit Logger records the full interaction including content

---

## 6. Core Modules

### 6.1 Auth Service
- **Built-in**: email/password registration, bcrypt-hashed passwords, JWT sessions, admin invite flow
- **MFA**: TOTP-based MFA (Google Authenticator compatible) — optional per user, enforceable by SuperAdmin per role
- **SSO/LDAP**: adapter interface — ships with Google Workspace, Okta, Active Directory adapters; extensible for custom providers
- SuperAdmin is created on first boot via setup wizard; subsequent SuperAdmins must be promoted by an existing SuperAdmin

### 6.2 Permission Engine (3-layer RBAC)

**Layer 1 — Access Gate**: Can this role interact with this agent at all? Binary. Configured per agent in the registry. Enforced by the platform — requests from unauthorized roles are rejected before reaching the agent.

**Layer 2 — Action Control**: What can the user do with this agent? Enforced at the platform routing layer — the platform rejects messages that invoke actions the role is not permitted for. Action set per role per agent:
- `read` — can receive agent-initiated messages and responses
- `query` — can send questions and receive factual responses
- `request` — can ask the agent to perform tasks
- `instruct` — can direct the agent's behavior and override defaults
- `trigger_subagents` — can cause the agent to invoke other registered agents

The platform enforces Layer 1 and Layer 2. Layer 3 (data filtering) is delegated to the agent.

**Layer 3 — Data Filtering**: The agent receives `user_context` and is responsible for filtering sensitive data from its response. **This is a design-time contract, not a runtime guarantee.** Enterprises must configure and test their agents to respect the context. The platform surfaces role and permissions clearly; the agent is accountable for its output. For regulated environments, platform-level response scanning middleware can be added as an enterprise extension point (not in v1).

### 6.3 Agent Registry
- SuperAdmin full CRUD: create, edit, deactivate, delete agents
- Each agent record stores: name, slug, description, icon, allowed roles + actions, online/offline status, source connection references
- **SDK token security**: tokens are generated as 256-bit random values, stored as bcrypt hashes in the database (like passwords). The plaintext token is shown once at generation time. Agents authenticate by sending the plaintext token; the platform hashes it and compares.
- **Token rotation**: zero-downtime protocol — generating a new token creates a 15-minute grace period where both old and new tokens are valid, after which the old token is invalidated. Grace period duration is configurable.
- SuperAdmin always has implicit access to all agents; this is enforced at the routing layer, not via role assignment.

### 6.4 Message Router
- Validates Layer 1 and Layer 2 permissions before forwarding any message
- Attaches `user_context` to every request (see §7)
- Streams responses via Redis Streams — chunks are persisted before delivery, so a dropped WebSocket reconnects and receives missed chunks
- **Timeout behavior**: 30-second default timeout per agent response (configurable per agent). On timeout: user receives a "Agent is not responding" message; interaction is logged as `timed_out`. No automatic retry (prevents duplicate actions). Retry is user-initiated.
- **Agent unavailable**: if agent process is not connected, the request is rejected immediately with a user-facing "Agent offline" message. No queuing in v1.

### 6.5 Channel Manager

**Private threads**: default mode. One thread per user per agent, fully isolated. No user can read another user's private thread — enforced at the query layer (every thread query includes `WHERE user_id = $current_user`).

**Group channels**: shared threads created by SuperAdmin. Access rules:
- A group channel is assigned a specific agent and one or more allowed roles
- Only users whose current role is in the channel's `channel_roles` join table can see or post in the channel
- All members of an eligible role see the same full message history (this is the intended behavior — groups are for team collaboration)
- **Role change handling**: when a user's role changes, their access to group channels is re-evaluated on next session. They lose access to channels their new role is not permitted for. Their past messages remain in the channel log (authored by their user ID), visible to remaining members.
- **Privilege mixing in groups**: group channels are scoped to specific roles. A channel cannot include roles of different privilege levels — SuperAdmin must assign compatible roles. This is enforced at channel creation.
- Channel access (`channel_roles` join table) is checked first; `agent_role_permissions` governs what actions users can perform within the channel. Both must pass. Deleting a role cascades to `channel_roles` — no stale references.

### 6.6 Sources Manager (per-agent configuration)

Each agent can be configured with external sources by SuperAdmin. Sources are passed as structured metadata to agents via the SDK at message time. **The agent is responsible for consuming the sources** — AgentGate manages the connection config and credentials, not the retrieval logic.

| Source Type | Storage | Security |
|---|---|---|
| **Repositories** | GitHub/GitLab URL + access token | Token encrypted at rest (AES-256, key from env `AGENTGATE_SECRET`) |
| **API Keys & Integrations** | Key/token + endpoint + scopes | Encrypted at rest (same key). Expiry tracked, dashboard warnings at 14 days |
| **Documents & Files** | Files stored on disk/S3, metadata in DB | File contents encrypted at rest. Chunked and embedded via configurable embedding provider (OpenAI, local) into pgvector for semantic retrieval. SuperAdmin configures embedding provider in Settings. |
| **Business Data Connections** | Connection string + credentials | Encrypted at rest. Platform makes read-only connections on agent's behalf and passes query results as context. Write access not supported in v1. |

**Encryption key management (`AGENTGATE_SECRET`):** A single AES-256 key (from env var) is used across all encryption domains (source credentials, message content, audit log) in v1 — intentional for operational simplicity. Key rotation is **out of scope for v1**: rotating the key requires re-encrypting all stored data, which is a complex operation deferred to a future release. Operators must treat `AGENTGATE_SECRET` as a root secret — back it up securely, store it outside the Docker environment (e.g., a secrets manager), and restrict access. The README will include explicit warnings about this operational requirement. Future versions will support key rotation with a migration utility.

File indexing uses **pgvector** (PostgreSQL extension) for vector storage — no additional infrastructure needed. Chunking strategy: 512 tokens per chunk, 50-token overlap. Embedding provider is configurable (defaults to OpenAI `text-embedding-3-small`; can be swapped for local models).

### 6.7 Audit Logger

Every interaction is logged with full content (not just a hash):
- User ID, name, role at time of interaction, agent slug, thread ID, channel ID
- Full message content (user message + agent response), stored encrypted (AES-256)
- Timestamp, action type, permission layers evaluated, outcome (delivered / rejected / timed_out / redacted)
- **Retention policy**: configurable by SuperAdmin (default: 90 days). Logs beyond retention are hard-deleted.
- Audit log is append-only — no edit or delete via UI, even for SuperAdmin. Direct DB access required to purge (intentional).
- Accessible to SuperAdmin only. Filterable by user, role, agent, date range, outcome.

### 6.8 Usage Dashboard
- Agent-level stats: total conversations, unique users, avg response time, timeout rate
- Role-level stats: which roles use which agents most
- System health: agent online/offline status, Redis/DB health indicators

---

## 7. SDK Contract

Agents connect to AgentGate by installing the SDK and authenticating with their SDK token. All communication between the platform and agents is over **TLS**. Enterprise deployments may optionally enforce **mTLS** (configurable in Settings).

### TypeScript SDK (npm: `agentgate-sdk`)
```typescript
import { AgentGate } from 'agentgate-sdk'

const agent = new AgentGate({ token: process.env.AGENTGATE_TOKEN })

agent.onMessage(async (ctx) => {
  const { message, user, role, permissions, thread_id } = ctx

  // Use role to filter response — agent's responsibility
  const response = await myAgentLogic(message, role)

  await ctx.reply(response)
})

agent.connect()
```

### Python SDK (PyPI: `agentgate-sdk`)
```python
from agentgate import AgentGate

agent = AgentGate(token=os.environ["AGENTGATE_TOKEN"])

@agent.on_message
async def handle(ctx):
    # ctx.role, ctx.permissions, ctx.user, ctx.sources available
    response = await my_agent_logic(ctx.message, ctx.role)
    await ctx.reply(response)

agent.connect()
```

### `user_context` payload
```json
{
  "message": "What is the Q1 budget?",
  "user": { "id": "u_123", "name": "Sara M.", "email": "sara@acme.com" },
  "role": "MARKETING_MANAGER",
  "permissions": ["read", "query"],
  "thread_id": "t_456",
  "channel_id": "ch_789",
  "is_superadmin": false,
  "sources": {
    "files": [{ "name": "Q1-Strategy.pdf", "retrieval_query_url": "..." }],
    "api_keys": [{ "name": "HubSpot CRM", "endpoint": "...", "token": "..." }],
    "repos": [{ "name": "marketing-playbooks", "clone_url": "...", "branch": "main" }]
  }
}
```

**Security note on `is_superadmin`**: agents must not branch on `is_superadmin` alone for security decisions — it is informational. Platform-level enforcement (Layer 1 & 2) is the authoritative gate. The SDK validates payload integrity via HMAC signature (each payload is signed with the agent's SDK token before delivery).

---

## 8. User Roles Model

Users can hold **multiple roles** simultaneously (many-to-many). A user's effective permissions for any agent are the **union** of permissions across all their assigned roles. This covers enterprise scenarios where one person holds multiple positions (e.g., HR Manager + Project Lead).

---

## 9. UI — Three Views

### 9.1 User View (Slack-like)
- **Footer**: persistent across all views — `Built by Amir Baldiga · `[Connect on LinkedIn](https://linkedin.com/in/amirbaldiga)` `. Subtle, low-opacity line at the bottom of the sidebar. Present in every deployment of the framework (not configurable away — it's the open-source credit line).
- **Sidebar**: accessible agents listed (name + online dot) + locked agents visible but greyed with 🔒
- **Chat area**: message thread with role-filtered responses, `[REDACTED]` indicators where agent has filtered data
- **Permission bar**: shows current user's allowed actions for the open agent
- **Group channels**: shared threads visible to eligible roles
- **Header per agent**: agent name, status, allowed actions summary

### 9.2 SuperAdmin Panel
Left nav sections:
- **Agents** — registry with full CRUD, status, SDK type, role assignments
- **Users** — invite, manage, assign multiple roles, deactivate
- **Roles & Permissions** — create roles, configure 3-layer permissions per agent per role
- **Channels** — create/manage group channels, assign compatible roles
- **Audit Log** — full interaction history with filters, encrypted content visible to SuperAdmin
- **Usage Stats** — dashboards
- **Auth / SSO** — configure SSO providers, LDAP, JWT settings, MFA enforcement per role
- **SDK Tokens** — generate, rotate (with grace period), revoke agent SDK tokens
- **Settings** — platform name, logo, retention policies, embedding provider, mTLS toggle

### 9.3 Agent Config (per-agent edit view)
Tabbed interface:
- **General** — name, slug, description, icon
- **Permissions** — role access matrix, action-level controls per role
- **Sources & Knowledge** — repos, API keys, file uploads (with indexing status), business data connections
- **Sub-agents** — configure which other agents this agent can invoke (requires `trigger_subagents` permission)
- **Audit Trail** — this agent's interaction log

---

## 10. Data Model (key entities)

```sql
users            — id, email, name, password_hash, mfa_secret, auth_provider, created_at
roles            — id, name, slug, is_superadmin
user_roles       — user_id, role_id  (many-to-many)
agents           — id, name, slug, sdk_token_hash, icon, status, created_at
agent_role_permissions — agent_id, role_id, actions[]
threads          — id, user_id, agent_id, type (private|group), channel_id
messages         — id, thread_id, sender_type (user|agent), content_encrypted, created_at
channels         — id, name, agent_id, created_by
channel_roles    — channel_id, role_id  (many-to-many, referential integrity enforced)
agent_sources    — id, agent_id, type (repo|api_key|file|db), config_encrypted (jsonb), expires_at
source_chunks    — id, source_id, chunk_text, embedding (vector), chunk_index
audit_log        — id, user_id, role_snapshot, agent_id, action, content_encrypted, outcome, created_at
sdk_tokens       — id, agent_id, token_hash, previous_token_hash, grace_period_expires_at, created_at
```

---

## 11. Deployment & Migrations

**First install:**
```bash
git clone https://github.com/your-org/agentgate
docker-compose up
# → setup wizard at http://localhost:3000/setup
```

**Upgrades:**
- `node-pg-migrate` runs automatically on container startup
- Migrations are versioned in `apps/api/migrations/`
- Failed migration aborts startup and logs the error — no partial state applied
- Rollback scripts provided alongside every migration

**Docker Compose services:**
- `agentgate-app` (Next.js frontend + Node.js API)
- `postgres` (with pgvector extension)
- `redis`

---

## 12. GitHub / Open Source Structure

```
agentgate/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Node.js backend + migrations
├── packages/
│   ├── sdk-ts/           # TypeScript SDK (npm: agentgate-sdk)
│   └── sdk-py/           # Python SDK (PyPI: agentgate-sdk)
├── docker-compose.yml
├── docs/
│   └── superpowers/specs/
└── README.md
```

Monorepo managed with `turborepo`. MIT license.

---

## 13. Success Criteria

- Enterprise can go from `git clone` to running platform in under 10 minutes
- SuperAdmin can register an agent and assign role permissions in under 5 minutes
- Agent developer can connect an existing agent via SDK with under 20 lines of code
- Layers 1 and 2 (access gate + action control) enforced at the platform routing layer — agents cannot bypass them
- Layer 3 (data filtering) is the agent's responsibility — clearly documented as a design-time contract
- Full audit trail for every user-agent interaction with encrypted content storage
- Zero-downtime SDK token rotation
- Schema migrations run automatically on upgrade with rollback support
