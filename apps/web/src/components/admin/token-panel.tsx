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
    setGenerating(true)
    setRevealed(null)
    const res = await fetch(`/api/agents/${agentId}/sdk-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim() || 'Default' }),
    })
    const data = await res.json() as NewToken
    setTokens(prev => [...prev, data])
    setRevealed(data.token)
    setLabel('')
    setGenerating(false)
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this token? Agents using it have a 15-minute grace period.')) return
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
        <Button size="sm" onClick={generate} disabled={generating}>
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
