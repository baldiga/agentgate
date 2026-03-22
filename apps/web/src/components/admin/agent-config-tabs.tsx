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
