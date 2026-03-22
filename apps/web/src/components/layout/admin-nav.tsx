'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/sdk-tokens', label: 'SDK Tokens' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            pathname.startsWith(l.href)
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-text-secondary hover:bg-surface hover:text-text-primary'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
