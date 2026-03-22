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
