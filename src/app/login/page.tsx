'use client'

import { useState, Suspense } from 'react'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const params = new URLSearchParams(window.location.search)
        const from = params.get('from')
        window.location.href = from && from.startsWith('/') ? from : '/'
      } else {
        setError('비밀번호가 올바르지 않습니다.')
        setPassword('')
        setLoading(false)
      }
    } catch {
      setError('잠시 후 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <form onSubmit={submit} className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-4xl tracking-[0.1em]" style={{ color: 'var(--fg)', fontFamily: "'Jorick', serif" }}>ullim</h1>
          <p className="text-xs tracking-wider mt-1" style={{ color: 'var(--fg-muted)' }}>contents generator</p>
        </div>

        <label className="block text-[11px] mb-1.5" style={{ color: 'var(--fg-muted)' }}>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          placeholder="비밀번호를 입력하세요"
          className="w-full px-4 py-3 text-sm rounded-2xl border outline-none transition-all"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)', color: 'var(--fg)' }}
        />

        {error && (
          <p className="text-xs mt-2" style={{ color: 'var(--error-fg)' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3.5 text-sm font-medium tracking-widest uppercase rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}
        >
          {loading ? '확인 중...' : 'Enter'}
        </button>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
