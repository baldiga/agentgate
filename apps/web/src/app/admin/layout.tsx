import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseJwtPayload } from '@/lib/auth'
import { AdminNav } from '@/components/layout/admin-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('agentgate_token')?.value
  if (!token) redirect('/login')
  const payload = parseJwtPayload(token)
  if (payload?.role !== 'superadmin') redirect('/login')

  return (
    <div className="flex h-screen bg-bg">
      <aside className="w-52 border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <span className="font-display text-base font-bold text-text-primary">Admin</span>
        </div>
        <AdminNav />
      </aside>
      <main className="flex flex-1 flex-col overflow-auto p-8">{children}</main>
    </div>
  )
}
