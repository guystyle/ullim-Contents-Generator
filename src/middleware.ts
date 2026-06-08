import { NextRequest, NextResponse } from 'next/server'

async function sha256(text: string) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.next()

  const { pathname } = req.nextUrl
  // Let the login page and its API through, otherwise there's no way to sign in.
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next()

  const token = await sha256(password)
  const cookie = req.cookies.get('site_auth')?.value
  if (cookie === token) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = pathname && pathname !== '/' ? `?from=${encodeURIComponent(pathname)}` : ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
