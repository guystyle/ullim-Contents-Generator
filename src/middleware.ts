import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.next()

  const auth = req.headers.get('authorization')
  if (auth) {
    const [scheme, encoded] = auth.split(' ')
    if (scheme === 'Basic' && encoded) {
      const [, pass] = atob(encoded).split(':')
      if (pass === password) return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ullim"' },
  })
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
