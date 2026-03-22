'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Settings = {
  platform_name?: string
  embedding_provider?: string
  openai_api_key?: string
  anthropic_api_key?: string
  gemini_api_key?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Settings) => { setSettings(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function set(key: keyof Settings, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Platform configuration for AgentGate.</p>
      </div>

      {/* Platform */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text-primary border-b border-border pb-2">Platform</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Platform Name</label>
          <Input
            value={settings.platform_name ?? ''}
            onChange={e => set('platform_name', e.target.value)}
            placeholder="AgentGate"
          />
          <p className="text-xs text-muted">Displayed in the UI header and emails.</p>
        </div>
      </section>

      {/* AI Providers */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary border-b border-border pb-2">AI Provider API Keys</h2>
          <p className="mt-2 text-xs text-muted">
            These keys are used by AgentGate for file indexing and semantic search within the Sources feature.
            Your agents connect independently using their SDK tokens — they don't use these keys.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Embedding Provider</label>
          <select
            value={settings.embedding_provider ?? 'none'}
            onChange={e => set('embedding_provider', e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="none">None (file search disabled)</option>
            <option value="openai">OpenAI (text-embedding-3-small)</option>
          </select>
          <p className="text-xs text-muted">Used to index documents uploaded in agent Sources.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">OpenAI API Key</label>
          <Input
            type="password"
            value={settings.openai_api_key ?? ''}
            onChange={e => set('openai_api_key', e.target.value)}
            placeholder="sk-…"
          />
          <p className="text-xs text-muted">Required if embedding provider is OpenAI.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Anthropic API Key</label>
          <Input
            type="password"
            value={settings.anthropic_api_key ?? ''}
            onChange={e => set('anthropic_api_key', e.target.value)}
            placeholder="sk-ant-…"
          />
          <p className="text-xs text-muted">Optional. Used for Claude-based agent features.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary">Gemini API Key</label>
          <Input
            type="password"
            value={settings.gemini_api_key ?? ''}
            onChange={e => set('gemini_api_key', e.target.value)}
            placeholder="AIza…"
          />
          <p className="text-xs text-muted">Optional. Used for Gemini-based agent features.</p>
        </div>
      </section>

      {/* SDK Quickstart */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text-primary border-b border-border pb-2">Connecting Agents via SDK</h2>
        <p className="text-sm text-text-secondary">
          Your AI agents (LangGraph, CrewAI, custom, etc.) connect to AgentGate using an SDK token.
          Generate tokens in the <strong>Agents</strong> section under the <strong>SDK</strong> tab.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted font-medium uppercase tracking-wide">TypeScript / Node.js</p>
            <pre className="text-xs bg-surface border border-border rounded p-3 overflow-x-auto text-text-secondary">{`npm install agentgate-sdk

import { AgentGate } from 'agentgate-sdk'

const agent = new AgentGate({ token: process.env.AGENTGATE_TOKEN })

agent.onMessage(async (ctx) => {
  const { message, user, role, permissions } = ctx
  const response = await yourLLM(message)
  await ctx.reply(response)
})

agent.connect()`}</pre>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted font-medium uppercase tracking-wide">Python</p>
            <pre className="text-xs bg-surface border border-border rounded p-3 overflow-x-auto text-text-secondary">{`pip install agentgate-sdk

from agentgate import AgentGate
import os

agent = AgentGate(token=os.environ["AGENTGATE_TOKEN"])

@agent.on_message
async def handle(ctx):
    response = await your_llm(ctx.message)
    await ctx.reply(response)

agent.connect()`}</pre>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
        {saved && <span className="text-sm text-online">✓ Saved</span>}
      </div>
    </div>
  )
}
