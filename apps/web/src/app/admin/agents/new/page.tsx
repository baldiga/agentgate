'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🤖')
  const [slugTouched, setSlugTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ agentId: string; token: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleNameChange(val: string) {
    setName(val)
    if (!slugTouched) setSlug(slugify(val))
  }

  async function handleSubmit() {
    setError('')
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim(), icon }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create agent')
        return
      }
      setCreated({ agentId: data.agent.id, token: data.sdkToken })
    } finally {
      setSubmitting(false)
    }
  }

  async function copyToken() {
    if (!created) return
    await navigator.clipboard.writeText(created.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <div className="flex flex-col gap-6 max-w-lg">
        <h1 className="font-display text-2xl font-bold text-text-primary">Agent Created</h1>

        <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-accent">SDK Token — copy now, it won't be shown again.</p>
          <code className="font-mono text-sm text-text-primary break-all bg-background rounded p-2">{created.token}</code>
          <p className="text-xs text-muted">
            Set this as <code className="font-mono">AGENTGATE_TOKEN</code> in your agent's environment.
          </p>
          <Button size="sm" variant="ghost" onClick={copyToken}>
            {copied ? '✓ Copied' : 'Copy token'}
          </Button>
        </div>

        <Button onClick={() => router.push(`/admin/agents/${created.agentId}`)}>
          Configure Agent →
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">New Agent</h1>
        <p className="mt-1 text-sm text-text-secondary">Register an AI agent with AgentGate to control who can access it.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Name</label>
          <Input
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="CMO Agent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Slug</label>
          <Input
            value={slug}
            onChange={e => { setSlugTouched(true); setSlug(e.target.value) }}
            placeholder="cmo-agent"
          />
          <p className="text-xs text-muted">Unique identifier used in SDK connections. URL-safe characters only.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Description</label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Handles marketing queries and campaign data…"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Icon</label>
          <Input
            value={icon}
            onChange={e => setIcon(e.target.value)}
            placeholder="🤖"
            className="w-20"
          />
          <p className="text-xs text-muted">Single emoji displayed in the user sidebar.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Agent'}
          </Button>
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
