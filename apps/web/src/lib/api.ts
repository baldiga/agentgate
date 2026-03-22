import { ApiError } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    const err = new Error(body.message ?? res.statusText) as ApiError & Error
    ;(err as unknown as Record<string, unknown>).status = res.status
    throw err
  }

  return res.json() as Promise<T>
}
