'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GenerateRequest, GenerateResponse, Brand, ContentType } from './api/generate/route'

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

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="테마 전환"
      className="p-2 rounded-full border transition-all duration-200"
      style={{ borderColor: 'var(--border-muted)', color: 'var(--fg-muted)' }}
    >
      {dark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

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

/* ── Page ── */

export default function Home() {
  const [dark, setDark] = useState(false)
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  useEffect(() => {
    if (localStorage.getItem('ullim-theme') === 'dark') setDark(true)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('ullim-theme', dark ? 'dark' : 'light')
  }, [dark])

  const current = CONTENT_TYPES.find((t) => t.value === contentType)!
  const isImage = contentType === 'artist-image'

  const isArtistCaption = contentType === 'artist-caption'

  const ig = (h: string) => {
    const t = h.trim()
    if (!t) return ''
    return t.startsWith('@') ? t : `@${t.replace(/^@/, '')}`
  }

  // Normalize a free-text date to "YYYY. MM. DD. (요일)", computing the weekday in JS.
  const WD = ['일', '월', '화', '수', '목', '금', '토']
  const formatDate = (raw: string) => {
    const t = raw.trim()
    const m = t.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
    if (!m) return t
    const [, y, mo, d] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d))
    if (isNaN(dt.getTime())) return t
    const mm = String(Number(mo)).padStart(2, '0')
    const dd = String(Number(d)).padStart(2, '0')
    return `${y}. ${mm}. ${dd}. (${WD[dt.getDay()]})`
  }

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

  const handleGenerate = useCallback(async () => {
    setError(null)
    if (!input.trim()) {
      setError('아티스트 바이오그래피를 입력해주세요.')
      return
    }
    const eventInfo = buildEventInfo()
    if (isArtistCaption && (!date.trim() || !venueName.trim() || !djName.trim())) {
      setError('날짜, 장소, 디제이는 필수로 입력해주세요.')
      return
    }
    setLoading(true)
    const combinedInput = isArtistCaption
      ? `${input.trim()}\n\n${eventInfo}`
      : input.trim()
    const body: GenerateRequest = { contentType, brand, input: combinedInput }
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
  }, [contentType, brand, input, round, date, venueName, venueIg, djName, djIg, josa, isArtistCaption])

  const hasKR = !!result?.korean?.trim()
  const hasEN = !!result?.english?.trim()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <header className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-xl font-light tracking-[0.2em] uppercase" style={{ color: 'var(--fg)' }}>ullim</h1>
            <span className="text-xs tracking-wider" style={{ color: 'var(--fg-muted)' }}>contents generator</span>
          </div>
          <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
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
                  <TextInput value={date} onChange={setDate} placeholder="e.g. 2025. 11. 28. 금요일" />
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

          {/* Event info — poster-caption free text */}
          {contentType === 'poster-caption' && (
            <div>
              <InputLabel>이벤트 정보</InputLabel>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={current.placeholder}
                rows={9}
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors resize-y"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)', color: 'var(--fg)', lineHeight: '1.6' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
              />
            </div>
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
        <p className="text-xs tracking-wider" style={{ color: 'var(--border-muted)' }}>ullim — sound that embraces the city</p>
      </footer>
    </div>
  )
}
