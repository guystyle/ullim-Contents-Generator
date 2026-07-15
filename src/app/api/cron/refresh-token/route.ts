import { NextRequest, NextResponse } from 'next/server'

/**
 * Daily Vercel Cron job: keeps the Instagram long-lived token alive by
 * refreshing it (each successful refresh resets the 60-day expiry).
 * Sends an alert email via Resend only when something needs human action.
 */

// Must run at request time, every time — never statically prerendered.
export const dynamic = 'force-dynamic'

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'guystyle@gmail.com'

async function sendAlert(subject: string, body: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Resounder <onboarding@resend.dev>',
      to: [ALERT_EMAIL],
      subject,
      text: body,
    }),
  })
  return res.ok
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return NextResponse.json({ skipped: 'INSTAGRAM_ACCESS_TOKEN not set' })

  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
    )
    const json = await res.json()

    if (!res.ok) {
      await sendAlert(
        '[Resounder] 인스타그램 토큰 갱신 실패 — 재발급 필요',
        [
          'Resounder의 인스타그램 액세스 토큰 자동 갱신이 실패했습니다.',
          '',
          `에러: ${JSON.stringify(json?.error ?? json)}`,
          '',
          '조치 방법:',
          '1. https://developers.facebook.com → 앱 → Instagram → API setup with Instagram business login',
          '2. "Generate token"으로 새 토큰 발급',
          '3. Vercel → Settings → Environment Variables → INSTAGRAM_ACCESS_TOKEN 값 교체 후 Redeploy',
          '',
          '토큰이 만료/무효화되어도 앱은 내장 예시로 계속 동작하지만, 실제 게시물 기반 few-shot은 중단됩니다.',
        ].join('\n')
      )
      return NextResponse.json({ ok: false, error: json?.error ?? json }, { status: 200 })
    }

    const days = Math.round((json.expires_in ?? 0) / 86400)

    // If Meta hands back a DIFFERENT token string, the env token's own clock
    // keeps ticking and auto-refresh can't help — the user must swap it before
    // the env token's own 60-day expiry. The cron runs daily, so remind only
    // on Mondays to avoid flooding the inbox.
    if (json.access_token && json.access_token !== token) {
      if (new Date().getDay() === 1) {
        await sendAlert(
          '[Resounder] 인스타그램 토큰 주기 교체 리마인더 (주 1회)',
          [
            '토큰 갱신 API가 매번 새 토큰을 반환하고 있어, 환경변수의 토큰은 발급일로부터 60일이 지나면 만료됩니다.',
            '토큰을 발급한 지 오래됐다면 아래 절차로 교체해주세요. (교체 후에도 이 리마인더는 매주 월요일 발송됩니다)',
            '',
            '조치 방법:',
            '1. Meta 앱 대시보드에서 "Generate token"으로 새 토큰 발급',
            '2. Vercel → INSTAGRAM_ACCESS_TOKEN 교체 후 Redeploy',
            '',
            '토큰이 만료되어 실제로 갱신이 실패하면 별도의 경고 메일이 즉시 발송됩니다.',
          ].join('\n')
        )
      }
      return NextResponse.json({ ok: true, rotated: true, expiresInDays: days })
    }

    return NextResponse.json({ ok: true, expiresInDays: days })
  } catch (e) {
    await sendAlert(
      '[Resounder] 인스타그램 토큰 갱신 중 오류',
      `토큰 갱신 요청 자체가 실패했습니다 (네트워크 등): ${e instanceof Error ? e.message : String(e)}\n다음 크론에서 자동 재시도됩니다. 반복되면 토큰을 재발급해주세요.`
    )
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
