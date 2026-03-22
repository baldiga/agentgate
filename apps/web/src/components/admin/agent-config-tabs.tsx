'use client'

import { useState } from 'react'
import type { Agent, Role, Permission, SdkToken } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SourceManager } from './source-manager'
import { TokenPanel } from './token-panel'

type Tab = 'general' | 'permissions' | 'sources' | 'sdk'

const ALL_ACTIONS = ['read', 'query', 'request', 'instruct', 'trigger_subagents']

interface AgentConfigTabsProps {
  agent: Agent
  roles: Role[]
  permissions: Permission[]
  initialTokens: SdkToken[]
}

export function AgentConfigTabs({ agent, roles, permissions: initialPermissions, initialTokens }: AgentConfigTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions)

  async function saveGeneral() {
    setSaving(true)
    setSaveMsg('')
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    setSaving(false)
    setSaveMsg(res.ok ? 'Saved.' : 'Failed to save.')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function toggleRole(roleId: string) {
    const existing = permissions.find(p => p.role_id === roleId)
    if (existing) {
      await fetch(`/api/agents/${agent.id}/permissions/${roleId}`, { method: 'DELETE' })
      setPermissions(prev => prev.filter(p => p.role_id !== roleId))
    } else {
      const res = await fetch(`/api/agents/${agent.id}/permissions/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: ['read'] }),
      })
      const data = await res.json()
      setPermissions(prev => [...prev, data.permission])
    }
  }

  async function updateActions(roleId: string, action: string, checked: boolean) {
    const perm = permissions.find(p => p.role_id === roleId)
    if (!perm) return
    const actions = checked ? [...perm.actions, action] : perm.actions.filter(a => a !== action)
    const res = await fetch(`/api/agents/${agent.id}/permissions/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions }),
    })
    const data = await res.json()
    setPermissions(prev => prev.map(p => p.role_id === roleId ? { ...p, ...data.permission } : p))
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'sources', label: 'Sources & Knowledge' },
    { id: 'sdk', label: 'SDK' },
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
            <label className="text-sm text-text-secondary">Slug</label>
            <Input value={agent.slug} disabled className="opacity-60" />
            <p className="text-xs text-muted">Slug cannot be changed after creation.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-secondary">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveGeneral} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            {saveMsg && <span className="text-sm text-muted">{saveMsg}</span>}
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Role Access</h3>
            <p className="mt-0.5 text-xs text-muted">
              Grant roles access to this agent and configure which actions they can perform.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {roles.map(role => {
              const perm = permissions.find(p => p.role_id === role.id)
              return (
                <div key={role.id} className="rounded-lg border border-border bg-surface px-4 py-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{role.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={perm ? 'success' : 'danger'}>{perm ? 'Allowed' : 'Denied'}</Badge>
                      <Button
                        size="sm"
                        variant={perm ? 'danger' : 'primary'}
                        onClick={() => toggleRole(role.id)}
                      >
                        {perm ? 'Revoke' : 'Grant Access'}
                      </Button>
                    </div>
                  </div>
                  {perm && (
                    <div className="flex flex-wrap gap-3">
                      {ALL_ACTIONS.map(action => (
                        <label key={action} className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={perm.actions.includes(action)}
                            onChange={e => updateActions(role.id, action, e.target.checked)}
                            className="accent-accent"
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <SourceManager agentId={agent.id} />
      )}

      {activeTab === 'sdk' && (
        <div className="flex flex-col gap-6">
          <TokenPanel agentId={agent.id} initialTokens={initialTokens} />
          <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-text-primary">Connecting your agent</h3>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">TypeScript</p>
              <pre className="text-xs bg-background border border-border rounded p-3 overflow-x-auto text-text-secondary whitespace-pre">{`import { AgentGate } from 'agentgate-sdk'

const agent = new AgentGate({ token: process.env.AGENTGATE_TOKEN })

agent.onMessage(async (ctx) => {
  const { message, user, role, permissions } = ctx
  const response = await yourLLMOrAgentLogic(message, role)
  await ctx.reply(response)
})

agent.connect()`}</pre>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Python</p>
              <pre className="text-xs bg-background border border-border rounded p-3 overflow-x-auto text-text-secondary whitespace-pre">{`from agentgate import AgentGate
import os

agent = AgentGate(token=os.environ["AGENTGATE_TOKEN"])

@agent.on_message
async def handle(ctx):
    response = await your_llm(ctx.message, ctx.role)
    await ctx.reply(response)

agent.connect()`}</pre>
            </div>
            <p className="text-xs text-muted">
              Set <code className="font-mono">AGENTGATE_TOKEN</code> to one of the tokens above.
              The agent receives <code className="font-mono">user</code>, <code className="font-mono">role</code>,{' '}
              <code className="font-mono">permissions</code>, and <code className="font-mono">sources</code> on every message.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
