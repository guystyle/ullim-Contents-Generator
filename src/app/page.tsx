'use client'

import { useState, useCallback, useEffect } from 'react'
import type {
  GenerateRequest,
  GenerateResponse,
  Brand,
  ContentType,
  Language,
} from './api/generate/route'

const CONTENT_TYPES: { value: ContentType; label: string; desc: string }[] = [
  { value: 'artist-image', label: '아티스트 이미지', desc: '캐러셀 이미지 카드 내용 (한/영)' },
  { value: 'carousel-caption', label: '캐러셀 캡션', desc: '아티스트 캐러셀 포스트 캡션' },
  { value: 'reels-caption', label: '릴스 캡션', desc: '릴스 포스터 포스트 캡션' },
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
      className="p-2 rounded-sm border transition-all duration-200"
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
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border transition-all duration-200"
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

function Optional() {
  return <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--border)' }}>(선택)</span>
}

function InputField({
  value, onChange, placeholder, textarea,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  textarea?: boolean
}) {
  const shared = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    className: 'w-full rounded-sm px-4 py-3 text-sm focus:outline-none transition-colors',
    style: { background: 'var(--surface)', border: '1px solid var(--border-muted)', color: 'var(--fg)' } as React.CSSProperties,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = 'var(--accent)'),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = 'var(--border-muted)'),
  }
  return textarea ? <textarea {...shared} rows={3} /> : <input type="text" {...shared} />
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2.5 text-xs rounded-sm border transition-all duration-150"
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

function OutputCard({ title, body, copyLabel }: { title: string; body: string; copyLabel: string }) {
  return (
    <div className="rounded-sm p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
          {title} <span style={{ color: 'var(--border)' }}>· {body.length}자</span>
        </span>
        <CopyButton text={body} label={copyLabel} />
      </div>
      <p className="text-sm whitespace-pre-line" style={{ color: 'var(--fg)', lineHeight: '1.7' }}>{body}</p>
    </div>
  )
}

/* ── Page ── */

export default function Home() {
  const [dark, setDark] = useState(false)
  const [brand, setBrand] = useState<Brand>('ullim')
  const [contentType, setContentType] = useState<ContentType>('artist-image')
  const [language, setLanguage] = useState<Language>('both')

  // fields
  const [artistName, setArtistName] = useState('')
  const [origin, setOrigin] = useState('')
  const [genres, setGenres] = useState('')
  const [vibe, setVibe] = useState('')
  const [partyName, setPartyName] = useState('')
  const [dateVenue, setDateVenue] = useState('')
  const [lineup, setLineup] = useState('')
  const [ticketLink, setTicketLink] = useState('')
  const [notes, setNotes] = useState('')

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

  const isArtist = contentType === 'artist-image'
  const isReels = contentType === 'reels-caption'

  const handleGenerate = useCallback(async () => {
    setError(null)
    if (isArtist && !artistName.trim() && !vibe.trim()) {
      setError('아티스트명 또는 특징/분위기를 입력해주세요.')
      return
    }
    if (!isArtist && !partyName.trim() && !vibe.trim()) {
      setError('이벤트명 또는 분위기/키워드를 입력해주세요.')
      return
    }

    setLoading(true)
    const body: GenerateRequest = {
      contentType,
      brand,
      language,
      artistName: artistName.trim() || undefined,
      origin: origin.trim() || undefined,
      genres: genres.trim() || undefined,
      vibe: vibe.trim() || undefined,
      partyName: partyName.trim() || undefined,
      dateVenue: dateVenue.trim() || undefined,
      lineup: lineup.trim() || undefined,
      ticketLink: ticketLink.trim() || undefined,
      notes: notes.trim() || undefined,
    }
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
  }, [isArtist, contentType, brand, language, artistName, origin, genres, vibe, partyName, dateVenue, lineup, ticketLink, notes])

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
                    className="text-left px-3 py-3 rounded-sm border transition-all duration-150"
                    style={active ? {
                      borderColor: 'var(--accent)', background: 'var(--surface)',
                    } : {
                      borderColor: 'var(--border-muted)', background: 'transparent',
                    }}
                  >
                    <div className="text-xs font-medium" style={{ color: active ? 'var(--accent)' : 'var(--fg)' }}>{t.label}</div>
                    <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--fg-muted)' }}>{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fields — artist-image */}
          {isArtist ? (
            <>
              <div>
                <InputLabel>아티스트명</InputLabel>
                <InputField value={artistName} onChange={setArtistName} placeholder="e.g. IDEALL" />
              </div>
              <div>
                <InputLabel>출신 / 활동지 <Optional /></InputLabel>
                <InputField value={origin} onChange={setOrigin} placeholder="e.g. 루이빌, KY USA / 오르후스 → 서울" />
              </div>
              <div>
                <InputLabel>장르</InputLabel>
                <InputField value={genres} onChange={setGenres} placeholder="e.g. melodic house, disco, bossa nova" />
              </div>
              <div>
                <InputLabel>특징 / 분위기</InputLabel>
                <InputField value={vibe} onChange={setVibe} textarea placeholder="e.g. 따뜻한 연결, 해변의 기억 / 어두운 애시드, 그루비한 베이스" />
              </div>
            </>
          ) : (
            <>
              <div>
                <InputLabel>이벤트 / 파티명</InputLabel>
                <InputField value={partyName} onChange={setPartyName} placeholder={brand === 'dfz' ? 'e.g. DFZ vol.3' : 'e.g. ullim vol.1 – The First Wave'} />
              </div>
              <div>
                <InputLabel>날짜 / 장소 <Optional /></InputLabel>
                <InputField value={dateVenue} onChange={setDateVenue} placeholder={brand === 'dfz' ? 'e.g. 2025.08.16 @ bar union, Itaewon' : 'e.g. 2025.08.16 @ Mellow Seoul'} />
              </div>
              {!isReels && (
                <div>
                  <InputLabel>라인업 <Optional /></InputLabel>
                  <InputField value={lineup} onChange={setLineup} placeholder="e.g. IDEALL, Lurkie, ..." />
                </div>
              )}
              <div>
                <InputLabel>분위기 / 키워드</InputLabel>
                <InputField value={vibe} onChange={setVibe} placeholder="e.g. 잔향, 파도, 첫 울림 / flow, frequency" />
              </div>
              {!isReels && (
                <div>
                  <InputLabel>예매 / 링크 <Optional /></InputLabel>
                  <InputField value={ticketLink} onChange={setTicketLink} placeholder="e.g. 프로필 링크 / DM" />
                </div>
              )}
              <div>
                <InputLabel>추가 메모 <Optional /></InputLabel>
                <InputField value={notes} onChange={setNotes} textarea placeholder="강조하고 싶은 내용이 있다면" />
              </div>
            </>
          )}

          {/* Language (caption only) */}
          {!isArtist && (
            <div>
              <InputLabel>언어</InputLabel>
              <div className="flex gap-2">
                {([['korean', '한국어'], ['english', 'English'], ['both', '둘 다']] as [Language, string][]).map(([val, label]) => (
                  <Pill key={val} active={language === val} onClick={() => setLanguage(val)}>{label}</Pill>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs rounded-sm px-4 py-3" style={{ color: 'var(--error-fg)', background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 text-sm font-medium tracking-widest uppercase rounded-sm transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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

            {/* Artist-image output */}
            {result.korean !== undefined && <OutputCard title="한글" body={result.korean} copyLabel="한글" />}
            {result.english !== undefined && <OutputCard title="English" body={result.english} copyLabel="EN" />}

            {/* Caption output */}
            {result.caption !== undefined && <OutputCard title="Caption" body={result.caption} copyLabel="캡션" />}
            {result.hashtags !== undefined && (
              <div className="rounded-sm p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Hashtags</span>
                  <CopyButton text={result.hashtags} label="해시태그" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-sm" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', color: 'var(--tag-fg)' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Copy all */}
            <div className="flex justify-end">
              <CopyButton
                text={[result.korean, result.english, result.caption, result.hashtags].filter(Boolean).join('\n\n')}
                label="전체"
              />
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
