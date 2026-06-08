import { NextRequest, NextResponse } from 'next/server'

async function sha256(text: string) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.json({ ok: true })

  let input = ''
  try {
    const body = await req.json()
    input = typeof body?.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (input !== password) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const token = await sha256(password)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('site_auth', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
