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
