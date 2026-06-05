'use client'

import { useState, useCallback } from 'react'
import type { GenerateRequest, GenerateResponse } from './api/generate/route'

const CONTENT_TYPES = ['이벤트/파티', 'DJ 믹스셋', '릴스/스토리', '일반 포스트'] as const
type Language = 'korean' | 'english' | 'both'

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
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-[#2a2a2a] text-[#888] hover:text-[#e0e0e0] hover:border-[#444] transition-all duration-200"
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
    <label className="block text-xs font-medium text-[#888] uppercase tracking-widest mb-2">
      {children}
    </label>
  )
}

function InputField({
  value,
  onChange,
  placeholder,
  optional,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  optional?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#111] border border-[#1f1f1f] rounded-sm px-4 py-3 text-sm text-[#e0e0e0] placeholder:text-[#444] focus:outline-none focus:border-[#444] transition-colors"
    />
  )
}

export default function Home() {
  const [contentType, setContentType] = useState<string>(CONTENT_TYPES[0])
  const [title, setTitle] = useState('')
  const [dateVenue, setDateVenue] = useState('')
  const [djs, setDjs] = useState('')
  const [moodKeywords, setMoodKeywords] = useState('')
  const [language, setLanguage] = useState<Language>('korean')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

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

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setResult(data as GenerateResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [contentType, title, dateVenue, djs, moodKeywords, language])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-baseline gap-4">
          <h1 className="text-xl font-light tracking-[0.2em] uppercase">ullim</h1>
          <span className="text-xs text-[#555] tracking-wider">contents generator</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Form */}
        <section className="space-y-6">
          {/* Content Type */}
          <div>
            <InputLabel>컨텐츠 유형</InputLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setContentType(type)}
                  className={`px-3 py-2.5 text-xs rounded-sm border transition-all duration-150 ${
                    contentType === type
                      ? 'border-[#e0e0e0] text-[#e0e0e0] bg-[#1a1a1a]'
                      : 'border-[#1f1f1f] text-[#666] hover:border-[#333] hover:text-[#aaa]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <InputLabel>이벤트 / 컨텐츠 제목</InputLabel>
            <InputField
              value={title}
              onChange={setTitle}
              placeholder="e.g. VOID — Underground Night Vol.3"
            />
          </div>

          {/* Date/Venue */}
          <div>
            <InputLabel>날짜 / 장소 <span className="text-[#444] normal-case tracking-normal font-normal">(선택)</span></InputLabel>
            <InputField
              value={dateVenue}
              onChange={setDateVenue}
              placeholder="e.g. 2024.02.10 / Club VURT, Seoul"
              optional
            />
          </div>

          {/* DJs */}
          <div>
            <InputLabel>출연 DJ <span className="text-[#444] normal-case tracking-normal font-normal">(선택)</span></InputLabel>
            <InputField
              value={djs}
              onChange={setDjs}
              placeholder="e.g. BLNR, Kwon, Park Hye Jin"
              optional
            />
          </div>

          {/* Mood/Keywords */}
          <div>
            <InputLabel>분위기 / 키워드</InputLabel>
            <InputField
              value={moodKeywords}
              onChange={setMoodKeywords}
              placeholder="e.g. techno, dark, industrial, warehouse"
            />
          </div>

          {/* Language */}
          <div>
            <InputLabel>언어</InputLabel>
            <div className="flex gap-2">
              {([['korean', '한국어'], ['english', 'English'], ['both', '둘 다']] as [Language, string][]).map(
                ([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setLanguage(val)}
                    className={`px-4 py-2 text-xs rounded-sm border transition-all duration-150 ${
                      language === val
                        ? 'border-[#e0e0e0] text-[#e0e0e0] bg-[#1a1a1a]'
                        : 'border-[#1f1f1f] text-[#666] hover:border-[#333] hover:text-[#aaa]'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 border border-red-900/50 bg-red-950/20 rounded-sm px-4 py-3">
              {error}
            </p>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 text-sm font-medium tracking-widest uppercase bg-[#e0e0e0] text-[#0a0a0a] rounded-sm hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate'
            )}
          </button>
        </section>

        {/* Result */}
        {result && (
          <section className="space-y-4 border-t border-[#1f1f1f] pt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-widest text-[#888]">Generated Content</h2>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs text-[#555] hover:text-[#aaa] transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6a5 5 0 1 0 5-5 5 5 0 0 0-3.54 1.46" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M1 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Regenerate
              </button>
            </div>

            {/* Caption */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#555] uppercase tracking-widest">Caption</span>
                <CopyButton text={result.caption} label="캡션" />
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-line">
                {result.caption}
              </p>
            </div>

            {/* Hashtags */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#555] uppercase tracking-widest">Hashtags</span>
                <CopyButton text={result.hashtags} label="해시태그" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs text-[#888] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Copy All */}
            <div className="flex justify-end">
              <CopyButton
                text={`${result.caption}\n\n${result.hashtags}`}
                label="전체"
              />
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-2xl mx-auto px-6 py-8 border-t border-[#1f1f1f] mt-10">
        <p className="text-xs text-[#333] tracking-wider">ullim — underground electronic music collective</p>
      </footer>
    </div>
  )
}
