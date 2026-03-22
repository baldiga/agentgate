import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function PUT(req: NextRequest, { params }: { params: { agentId: string; roleId: string } }) {
  const token = cookies().get('agentgate_token')?.value
  const body = await req.json()
  const res = await fetch(`${API}/api/agents/${params.agentId}/permissions/${params.roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: { agentId: string; roleId: string } }) {
  const token = cookies().get('agentgate_token')?.value
  const res = await fetch(`${API}/api/agents/${params.agentId}/permissions/${params.roleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return new NextResponse(null, { status: res.status })
}
