import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function DELETE(_req: NextRequest, { params }: { params: { agentId: string; tokenId: string } }) {
  const token = cookies().get('agentgate_token')?.value
  const res = await fetch(`${API}/api/agents/${params.agentId}/sdk-tokens/${params.tokenId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
