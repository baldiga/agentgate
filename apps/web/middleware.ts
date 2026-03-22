import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth', '/api/setup']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const token = req.cookies.get('agentgate_token')

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if ((pathname === '/login' || pathname === '/setup') && token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
