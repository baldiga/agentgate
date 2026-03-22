import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function GET(_req: NextRequest, { params }: { params: { agentId: string } }) {
  const token = cookies().get('agentgate_token')?.value
  const res = await fetch(`${API}/api/agents/${params.agentId}/sdk-tokens`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest, { params }: { params: { agentId: string } }) {
  const token = cookies().get('agentgate_token')?.value
  const body = await req.json()
  const res = await fetch(`${API}/api/agents/${params.agentId}/sdk-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
