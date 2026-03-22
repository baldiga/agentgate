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
