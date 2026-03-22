import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`
        w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary
        placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  )
)
Input.displayName = 'Input'
