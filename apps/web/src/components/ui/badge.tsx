type Variant = 'default' | 'success' | 'warning' | 'danger' | 'accent'

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-surface text-text-secondary border border-border',
  success: 'bg-online/20 text-online',
  warning: 'bg-yellow-500/20 text-yellow-400',
  danger: 'bg-danger/20 text-danger',
  accent: 'bg-accent/20 text-accent',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
