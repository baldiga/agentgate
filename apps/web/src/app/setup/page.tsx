'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [platformName, setPlatformName] = useState('')
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
        body: JSON.stringify({ email, name, password, platformName }),
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
            <label htmlFor="platformName" className="text-sm text-text-secondary">Platform name</label>
            <Input id="platformName" type="text" value={platformName} onChange={e => setPlatformName(e.target.value)} placeholder="e.g. Acme Corp" required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-text-secondary">Your name</label>
            <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Smith" required />
          </div>
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
