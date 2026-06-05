'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GenerateRequest, GenerateResponse } from './api/generate/route'

const CONTENT_TYPES = ['이벤트/파티', 'DJ 믹스셋', '릴스/스토리', '일반 포스트'] as const
type Language = 'korean' | 'english' | 'both'

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="테마 전환"
      className="p-2 rounded-sm border transition-all duration-200"
      style={{
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
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
      style={{
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
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

function InputField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-sm px-4 py-3 text-sm focus:outline-none transition-colors"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-muted)',
        color: 'var(--fg)',
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
    />
  )
}

function TypeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2.5 text-xs rounded-sm border transition-all duration-150"
      style={active ? {
        borderColor: 'var(--accent)',
        color: 'var(--accent)',
        background: 'var(--surface)',
        fontWeight: 500,
      } : {
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-muted)',
        background: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

export default function Home() {
  const [dark, setDark] = useState(false)
  const [contentType, setContentType] = useState<string>(CONTENT_TYPES[0])
  const [title, setTitle] = useState('')
  const [dateVenue, setDateVenue] = useState('')
  const [djs, setDjs] = useState('')
  const [moodKeywords, setMoodKeywords] = useState('')
  const [language, setLanguage] = useState<Language>('korean')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('ullim-theme')
    if (saved === 'dark') setDark(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('ullim-theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleGenerate = useCallback(async () => {
    if (!title.trim() || !moodKeywords.trim()) {
      setError('제목과 분위기/키워드를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    const body: GenerateRequest = {
      contentType,
      title: title.trim(),
      dateVenue: dateVenue.trim() || undefined,
      djs: djs.trim() || undefined,
      moodKeywords: moodKeywords.trim(),
      language,
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
  }, [contentType, title, dateVenue, djs, moodKeywords, language])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
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
          {/* Content Type */}
          <div>
            <InputLabel>컨텐츠 유형</InputLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CONTENT_TYPES.map((type) => (
                <TypeButton key={type} active={contentType === type} onClick={() => setContentType(type)}>
                  {type}
                </TypeButton>
              ))}
            </div>
          </div>

          <div>
            <InputLabel>이벤트 / 컨텐츠 제목</InputLabel>
            <InputField value={title} onChange={setTitle} placeholder="e.g. VOID — Underground Night Vol.3" />
          </div>

          <div>
            <InputLabel>
              날짜 / 장소{' '}
              <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--border)' }}>(선택)</span>
            </InputLabel>
            <InputField value={dateVenue} onChange={setDateVenue} placeholder="e.g. 2024.02.10 / Club VURT, Seoul" />
          </div>

          <div>
            <InputLabel>
              출연 DJ{' '}
              <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--border)' }}>(선택)</span>
            </InputLabel>
            <InputField value={djs} onChange={setDjs} placeholder="e.g. BLNR, Kwon, Park Hye Jin" />
          </div>

          <div>
            <InputLabel>분위기 / 키워드</InputLabel>
            <InputField value={moodKeywords} onChange={setMoodKeywords} placeholder="e.g. techno, dark, industrial, warehouse" />
          </div>

          {/* Language */}
          <div>
            <InputLabel>언어</InputLabel>
            <div className="flex gap-2">
              {([['korean', '한국어'], ['english', 'English'], ['both', '둘 다']] as [Language, string][]).map(([val, label]) => (
                <TypeButton key={val} active={language === val} onClick={() => setLanguage(val)}>
                  {label}
                </TypeButton>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs rounded-sm px-4 py-3" style={{
              color: 'var(--error-fg)',
              background: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
            }}>
              {error}
            </p>
          )}

          {/* Generate Button */}
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
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs flex items-center gap-1.5 transition-colors"
                style={{ color: 'var(--fg-muted)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6a5 5 0 1 0 5-5 5 5 0 0 0-3.54 1.46" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M1 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Regenerate
              </button>
            </div>

            {/* Caption */}
            <div className="rounded-sm p-5 space-y-4" style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-muted)',
            }}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Caption</span>
                <CopyButton text={result.caption} label="캡션" />
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)', lineHeight: '1.7' }}>
                {result.caption}
              </p>
            </div>

            {/* Hashtags */}
            <div className="rounded-sm p-5 space-y-4" style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-muted)',
            }}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Hashtags</span>
                <CopyButton text={result.hashtags} label="해시태그" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-sm"
                    style={{
                      background: 'var(--tag-bg)',
                      border: '1px solid var(--tag-border)',
                      color: 'var(--tag-fg)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <CopyButton text={`${result.caption}\n\n${result.hashtags}`} label="전체" />
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-2xl mx-auto px-6 py-8 mt-10" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <p className="text-xs tracking-wider" style={{ color: 'var(--border-muted)' }}>ullim — underground electronic music collective</p>
      </footer>
    </div>
  )
}
