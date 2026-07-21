'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GenerateRequest, GenerateResponse, Brand, ContentType, PosterData } from './api/generate/route'

const CONTENT_TYPES: { value: ContentType; label: string; desc: string; placeholder: string }[] = [
  {
    value: 'artist-image',
    label: '아티스트 이미지',
    desc: '바이오 → 한70 / 영130',
    placeholder: '아티스트 바이오그래피 원문을 붙여넣으세요.\n\ne.g. IDEALL is a Seoul-based DJ who blends disco, bossa nova and melodic house, drawing on memories of love and the sea...',
  },
  {
    value: 'artist-caption',
    label: '아티스트 캡션',
    desc: '바이오 + 이벤트 정보 → 캡션',
    placeholder: '',
  },
  {
    value: 'poster-caption',
    label: '포스터 캡션',
    desc: '이벤트 정보 → 한/영 풀 캡션',
    placeholder: '이벤트 정보를 자유롭게 붙여넣으세요.\n\ne.g.\nDuty Free Zone vol.13\n2026.05.21 (목) @ BAR UNION (@unionseoul)\n라인업: mingsturn, ÅNGEL 004 (live), T Pharo\n테마: 해방, 흐름, 날카로운 전자음과 현악의 질감',
  },
]

const BRANDS: { value: Brand; label: string }[] = [
  { value: 'ullim', label: 'ullim' },
  { value: 'dfz', label: 'DFZ' },
]

/* ── UI atoms ── */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200"
      style={{ borderColor: 'var(--border-muted)', color: 'var(--fg-muted)' }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {label ? `${label} 복사됨` : '복사됨'}
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1 4h2M1 4v7h7V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {label ? `${label} 복사` : '복사'}
        </>
      )}
    </button>
  )
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--fg-muted)' }}>
      {children}
    </label>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-xs rounded-full border transition-all duration-150"
      style={active ? {
        borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--surface)', fontWeight: 500,
      } : {
        borderColor: 'var(--border-muted)', color: 'var(--fg-muted)', background: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function OutputCard({ title, body, copyLabel, showCount }: { title: string; body: string; copyLabel: string; showCount?: boolean }) {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
          {title}{showCount && <span style={{ color: 'var(--border)' }}> · {body.length}자</span>}
        </span>
        <CopyButton text={body} label={copyLabel} />
      </div>
      <p className="text-sm whitespace-pre-line" style={{ color: 'var(--fg)', lineHeight: '1.7' }}>{body}</p>
    </div>
  )
}

function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)', color: 'var(--fg)' }}
      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
    />
  )
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-[11px] mb-1.5" style={{ color: 'var(--fg-muted)' }}>
      {children}{optional && <span style={{ color: 'var(--border)' }}> (선택)</span>}
    </label>
  )
}

/* ── Few-shot training data panel ── */

interface InstaStatus {
  tokenConfigured: boolean
  lastSource: string
  lastError: string | null
  lastSuccessfulFetchAt: string | null
  examples: Record<Brand, { artistCaptions: string[]; posterCaptions: string[] }>
}

const SOURCE_LABEL: Record<string, string> = {
  live: '인스타그램 실시간',
  cache: '캐시 (12시간 이내)',
  fallback: '내장 예시 (인스타 연결 안 됨)',
}

function ExamplesPanel() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<InstaStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !status) {
      setLoading(true)
      try {
        const res = await fetch('/api/insta-status')
        if (res.ok) setStatus(await res.json())
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={toggle}
        className="text-xs tracking-wider underline underline-offset-4 decoration-dotted"
        style={{ color: 'var(--fg-muted)' }}
      >
        {open ? '학습 데이터 접기' : '학습 데이터 보기'}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {loading && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>불러오는 중...</p>}
          {status && (
            <>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                출처: {SOURCE_LABEL[status.lastSource] ?? status.lastSource}
                {status.lastSuccessfulFetchAt && ` · 마지막 수집 ${new Date(status.lastSuccessfulFetchAt).toLocaleString('ko-KR')}`}
                {status.lastError && (
                  <span style={{ color: 'var(--error-fg)' }}> · {status.lastError}</span>
                )}
              </p>
              {(['ullim', 'dfz'] as const).map((b) =>
                (
                  [
                    ['artistCaptions', '아티스트 캡션'],
                    ['posterCaptions', '포스터 캡션'],
                  ] as const
                ).map(([kind, label]) => {
                  const list = status.examples[b][kind]
                  if (!list.length) return null
                  return (
                    <details key={`${b}-${kind}`} className="rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}>
                      <summary className="cursor-pointer px-5 py-3 text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                        {b === 'ullim' ? 'ullim' : 'DFZ'} · {label} ({list.length})
                      </summary>
                      <div className="px-5 pb-4 space-y-4">
                        {list.map((c, i) => (
                          <p key={i} className="text-xs whitespace-pre-line pt-3" style={{ color: 'var(--fg)', lineHeight: '1.7', borderTop: '1px solid var(--border-muted)' }}>
                            {c}
                          </p>
                        ))}
                      </div>
                    </details>
                  )
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Page ── */

export default function Home() {
  const [brand, setBrand] = useState<Brand>('ullim')
  const [contentType, setContentType] = useState<ContentType>('artist-image')
  const [input, setInput] = useState('')
  // structured event-info form (artist-caption)
  const [round, setRound] = useState('')
  const [date, setDate] = useState('')
  const [venueName, setVenueName] = useState('BAR UNION')
  const [venueIg, setVenueIg] = useState('@unionseoul')
  const [djName, setDjName] = useState('')
  const [djIg, setDjIg] = useState('')
  const [josa, setJosa] = useState<'을' | '를'>('을')

  // structured event-info form (poster-caption)
  type LineupRow = { time: string; name: string; ig: string }
  const [pVol, setPVol] = useState('')
  const [pTheme, setPTheme] = useState('')
  const [pDate, setPDate] = useState('')
  const [pVenueName, setPVenueName] = useState('BAR UNION')
  const [pVenueIg, setPVenueIg] = useState('@unionseoul')
  const [pLineup, setPLineup] = useState<LineupRow[]>([{ time: '', name: '', ig: '' }])
  const [pWithUllim, setPWithUllim] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-brand', brand)
    return () => document.documentElement.removeAttribute('data-brand')
  }, [brand])

  const isImage = contentType === 'artist-image'

  const isArtistCaption = contentType === 'artist-caption'

  const ig = (h: string) => {
    const t = h.trim()
    if (!t) return ''
    return t.startsWith('@') ? t : `@${t.replace(/^@/, '')}`
  }

  // Normalize a free-text date to "YYYY. MM. DD. (요일)", computing the weekday in JS.
  const WD = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const parseDate = (raw: string) => {
    const m = raw.trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
    if (!m) return null
    const [, y, mo, d] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d))
    if (isNaN(dt.getTime())) return null
    return { y, mo: Number(mo), d: Number(d), dt }
  }
  const formatDate = (raw: string) => {
    const p = parseDate(raw)
    if (!p) return raw.trim()
    return `${p.y}. ${String(p.mo).padStart(2, '0')}. ${String(p.d).padStart(2, '0')}. ${WD[p.dt.getDay()]}`
  }

  // "Thursday, May 21st, 2026"
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }
  const formatDateEN = (raw: string) => {
    const p = parseDate(raw)
    if (!p) return raw.trim()
    return `${WD_EN[p.dt.getDay()]}, ${MONTHS_EN[p.mo - 1]} ${ordinal(p.d)}, ${p.y}`
  }

  const maskDate = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let out = digits.slice(0, 4)
    if (digits.length > 4) out += '. ' + digits.slice(4, 6)
    if (digits.length > 6) out += '. ' + digits.slice(6, 8)
    if (digits.length === 8) out += '.'
    return out
  }
  const handleDateInput = (raw: string) => setDate(maskDate(raw))
  const handlePDateInput = (raw: string) => setPDate(maskDate(raw))

  const buildEventInfo = () => {
    const venue = [venueName.trim(), ig(venueIg)].filter(Boolean).join(' ')
    const dj = [djName.trim(), ig(djIg)].filter(Boolean).join(' ')
    return [
      `오프닝(첫 줄, 그대로 사용): ${djName.trim()}${josa} 소개합니다.`,
      round.trim() ? `회차: ${round.trim()}` : '',
      date.trim() ? `날짜: ${formatDate(date)}` : '',
      venue ? `장소: ${venue}` : '',
      dj ? `디제이: ${dj}` : '',
    ].filter(Boolean).join('\n')
  }

  const setLineupRow = (i: number, patch: Partial<LineupRow>) =>
    setPLineup((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addLineupRow = () => setPLineup((rows) => [...rows, { time: '', name: '', ig: '' }])
  const removeLineupRow = (i: number) => setPLineup((rows) => (rows.length > 1 ? rows.filter((_, j) => j !== i) : rows))

  // Build the deterministic poster info block for a given date string.
  const buildPosterInfo = (dateStr: string) => {
    const venue = [pVenueName.trim(), ig(pVenueIg)].filter(Boolean).join(' ')
    const lineupLines = pLineup
      .filter((r) => r.name.trim())
      .map((r) => [r.time.trim(), r.name.trim(), ig(r.ig)].filter(Boolean).join(' '))
    return [
      `🗓️ ${dateStr}`,
      venue ? `📍 ${venue}` : '',
      `🎧 ${brand === 'dfz' ? 'DJ' : 'Music by'}`,
      ...lineupLines,
      pWithUllim ? 'with ullim' : '',
    ].filter(Boolean).join('\n')
  }

  const isPoster = contentType === 'poster-caption'

  const handleGenerate = useCallback(async () => {
    setError(null)
    let body: GenerateRequest

    if (isPoster) {
      if (!pTheme.trim()) {
        setError('테마/설명을 입력해주세요.')
        return
      }
      if (!pDate.trim() || pLineup.every((r) => !r.name.trim())) {
        setError('날짜와 라인업(최소 1명)은 필수입니다.')
        return
      }
      const poster: PosterData = {
        vol: pVol.trim(),
        theme: pTheme.trim(),
        krInfo: buildPosterInfo(formatDate(pDate)),
        enInfo: buildPosterInfo(formatDateEN(pDate)),
      }
      body = { contentType, brand, input: pTheme.trim(), poster }
    } else {
      if (!input.trim()) {
        setError('아티스트 바이오그래피를 입력해주세요.')
        return
      }
      if (isArtistCaption && (!date.trim() || !venueName.trim() || !djName.trim())) {
        setError('날짜, 장소, 디제이는 필수로 입력해주세요.')
        return
      }
      const combinedInput = isArtistCaption ? `${input.trim()}\n\n${buildEventInfo()}` : input.trim()
      body = { contentType, brand, input: combinedInput }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data as GenerateResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, brand, input, round, date, venueName, venueIg, djName, djIg, josa, isArtistCaption, isPoster, pVol, pTheme, pDate, pVenueName, pVenueIg, pLineup, pWithUllim])

  const hasKR = !!result?.korean?.trim()
  const hasEN = !!result?.english?.trim()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <header className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl tracking-[0.1em]" style={{ color: 'var(--fg)', fontFamily: "'Jorick', serif" }}>Resounder</h1>
            <span className="text-xs tracking-wider" style={{ color: 'var(--fg-muted)' }}>by ullim</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <section className="space-y-6">
          {/* Brand */}
          <div>
            <InputLabel>브랜드</InputLabel>
            <div className="flex gap-2">
              {BRANDS.map((b) => (
                <Pill key={b.value} active={brand === b.value} onClick={() => setBrand(b.value)}>{b.label}</Pill>
              ))}
            </div>
          </div>

          {/* Content type */}
          <div>
            <InputLabel>컨텐츠 유형</InputLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CONTENT_TYPES.map((t) => {
                const active = contentType === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => { setContentType(t.value); setResult(null) }}
                    className="text-left px-4 py-3 rounded-2xl border transition-all duration-150"
                    style={active ? { borderColor: 'var(--accent)', background: 'var(--surface)' } : { borderColor: 'var(--border-muted)', background: 'transparent' }}
                  >
                    <div className="text-xs font-medium" style={{ color: active ? 'var(--accent)' : 'var(--fg)' }}>{t.label}</div>
                    <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--fg-muted)' }}>{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bio input — shared by artist-image & artist-caption */}
          {(isImage || isArtistCaption) && (
            <div>
              <InputLabel>아티스트 바이오그래피</InputLabel>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={CONTENT_TYPES[0].placeholder}
                rows={8}
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors resize-y"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)', color: 'var(--fg)', lineHeight: '1.6' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
              />
              {isArtistCaption && (
                <p className="text-[11px] mt-2" style={{ color: 'var(--fg-muted)' }}>
                  ※ 1번(아티스트 이미지)에서 쓴 바이오를 그대로 사용해도 좋아요.
                </p>
              )}
            </div>
          )}

          {/* Event info — structured form (artist-caption) */}
          {isArtistCaption && (
            <div>
              <InputLabel>이벤트 정보</InputLabel>
              <div className="rounded-2xl p-4 space-y-3" style={{ border: '1px solid var(--border-muted)' }}>
                <div>
                  <FieldLabel optional>회차</FieldLabel>
                  <TextInput value={round} onChange={setRound} placeholder="e.g. vol.13" />
                </div>
                <div>
                  <FieldLabel>날짜</FieldLabel>
                  <TextInput value={date} onChange={handleDateInput} placeholder="e.g. 20251128 → 2025. 11. 28." />
                </div>
                <div>
                  <FieldLabel>장소</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput value={venueName} onChange={setVenueName} placeholder="이름 (e.g. BAR UNION)" />
                    <TextInput value={venueIg} onChange={setVenueIg} placeholder="인스타 (e.g. @unionseoul)" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <FieldLabel>디제이</FieldLabel>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px]" style={{ color: 'var(--border)' }}>조사</span>
                      {(['을', '를'] as const).map((j) => (
                        <button
                          key={j}
                          onClick={() => setJosa(j)}
                          className="text-[11px] px-2 py-0.5 rounded-full border transition-all"
                          style={josa === j
                            ? { borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 500 }
                            : { borderColor: 'var(--border-muted)', color: 'var(--fg-muted)' }}
                        >
                          {j}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput value={djName} onChange={setDjName} placeholder="이름 (e.g. ESCBR)" />
                    <TextInput value={djIg} onChange={setDjIg} placeholder="인스타 (e.g. @dj_escbr)" />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--border)' }}>
                    미리보기: <span style={{ color: 'var(--fg-muted)' }}>{djName.trim() || 'DJ'}{josa} 소개합니다.</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Event info — structured form (poster-caption) */}
          {isPoster && (
            <>
              <div>
                <InputLabel>테마 / 설명</InputLabel>
                <textarea
                  value={pTheme}
                  onChange={(e) => setPTheme(e.target.value)}
                  placeholder={'파티 테마·컨셉·분위기, 특별 게스트 소개 등 본문에 반영할 내용을 자유롭게.\n\ne.g. 해방, 흐름, 날카로운 전자음과 현악의 질감. 반년의 축적을 지나 새로운 주축을 세우는 밤.'}
                  rows={6}
                  className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors resize-y"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)', color: 'var(--fg)', lineHeight: '1.6' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
                />
              </div>

              <div>
                <InputLabel>이벤트 정보</InputLabel>
                <div className="rounded-2xl p-4 space-y-3" style={{ border: '1px solid var(--border-muted)' }}>
                  <div>
                    <FieldLabel optional>{brand === 'dfz' ? '볼륨 (vol.)' : '회차'}</FieldLabel>
                    <TextInput value={pVol} onChange={setPVol} placeholder="e.g. vol.13" />
                  </div>
                  <div>
                    <FieldLabel>날짜</FieldLabel>
                    <TextInput value={pDate} onChange={handlePDateInput} placeholder="e.g. 20260521 → 2026. 05. 21." />
                  </div>
                  <div>
                    <FieldLabel>장소</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput value={pVenueName} onChange={setPVenueName} placeholder="이름 (e.g. BAR UNION)" />
                      <TextInput value={pVenueIg} onChange={setPVenueIg} placeholder="인스타 (e.g. @unionseoul)" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>라인업</FieldLabel>
                    <div className="space-y-2">
                      {pLineup.map((row, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <div className="w-16 shrink-0">
                            <TextInput value={row.time} onChange={(v) => setLineupRow(i, { time: v })} placeholder="시간" />
                          </div>
                          <div className="flex-1">
                            <TextInput value={row.name} onChange={(v) => setLineupRow(i, { name: v })} placeholder="DJ 이름 (e.g. ESCBR)" />
                          </div>
                          <div className="flex-1">
                            <TextInput value={row.ig} onChange={(v) => setLineupRow(i, { ig: v })} placeholder="@insta" />
                          </div>
                          <button
                            onClick={() => removeLineupRow(i)}
                            aria-label="라인업 삭제"
                            className="shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all disabled:opacity-30"
                            style={{ borderColor: 'var(--border-muted)', color: 'var(--fg-muted)' }}
                            disabled={pLineup.length === 1}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addLineupRow}
                      className="mt-2 text-[11px] flex items-center gap-1 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      DJ 추가
                    </button>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--border)' }}>시간은 선택 (ullim은 보통 표기, DFZ는 생략)</p>
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input type="checkbox" checked={pWithUllim} onChange={(e) => setPWithUllim(e.target.checked)} className="accent-current" style={{ accentColor: 'var(--accent)' }} />
                    <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>라인업 끝에 &ldquo;with ullim&rdquo; 표기</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs rounded-xl px-4 py-3" style={{ color: 'var(--error-fg)', background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 text-sm font-medium tracking-widest uppercase rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating...
              </span>
            ) : 'Generate'}
          </button>
        </section>

        {/* Result */}
        {result && (
          <section className="space-y-4 pt-10" style={{ borderTop: '1px solid var(--border-muted)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Generated Content</h2>
              <button onClick={handleGenerate} disabled={loading} className="text-xs flex items-center gap-1.5 transition-colors" style={{ color: 'var(--fg-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6a5 5 0 1 0 5-5 5 5 0 0 0-3.54 1.46" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M1 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Regenerate
              </button>
            </div>

            {hasKR && <OutputCard title={hasEN ? '한글' : 'Caption'} body={result.korean!} copyLabel={hasEN ? '한글' : '캡션'} showCount={isImage} />}
            {hasEN && <OutputCard title="English" body={result.english!} copyLabel="EN" showCount={isImage} />}

            <div className="flex justify-end">
              <CopyButton text={[result.korean, result.english].filter((s) => s?.trim()).join('\n\n')} label="전체" />
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-2xl mx-auto px-6 py-8 mt-10" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <p className="text-xs tracking-wider" style={{ color: 'var(--border-muted)' }}>Resounder v1.0.0 &ldquo;Obsidian&rdquo;</p>
        <ExamplesPanel />
      </footer>
    </div>
  )
}
