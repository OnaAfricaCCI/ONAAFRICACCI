'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { createAccount, signIn } from '@/lib/clientAuth'
import { safeNext } from '@/lib/returnUrl'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MIN_PW = 8

export default function SignInForm({ next, hadError }: { next: string; hadError: string | null }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(
    hadError === 'expired' ? 'That link had expired. Sign in with your email and password below.' : '',
  )
  const [notice, setNotice] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    setMessage(''); setNotice('')
    if (!EMAIL_RE.test(value)) { setMessage('Please enter a valid email address.'); return }
    if (password.length < MIN_PW) { setMessage(`Your password needs at least ${MIN_PW} characters.`); return }
    setBusy(true)
    const result = mode === 'create' ? await createAccount(value, password) : await signIn(value, password)
    if (!result.ok) {
      if (result.switchToSignin) { setMode('signin'); setNotice(result.error) } else { setMessage(result.error) }
      setBusy(false); return
    }
    router.push(safeNext(next, '/profile'))
    router.refresh()
  }

  async function forgot() {
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) { setMessage('Enter your email first, then tap “Forgot password”.'); return }
    try {
      const supabase = createBrowserSupabase()
      await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${window.location.origin}/auth/reset` })
      setMessage(''); setNotice('If that email has an account, we’ve sent a link to reset your password.')
    } catch { setMessage('Could not send the reset email just now.') }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="mf-lbl">Email</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mf-fld" />
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="password" className="mf-lbl">Password</label>
        <input id="password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'} className="mf-fld" />
      </div>

      {notice && <p role="status" className="mt-3 text-[14px]" style={{ color: 'var(--sage-deep)' }}>{notice}</p>}
      {message && <p role="alert" className="mt-3 text-[14px]" style={{ color: 'var(--accent-active)' }}>{message}</p>}

      <div className="mt-5">
        <button type="submit" disabled={busy} className="mf-btn-ink w-full disabled:opacity-60">
          {busy ? 'Just a moment…' : mode === 'create' ? 'Create account' : 'Sign in'}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-[14px]" style={{ color: 'var(--graphite)' }}>
        {mode === 'signin' ? (
          <button type="button" onClick={() => { setMode('create'); setMessage(''); setNotice('') }} className="font-bold underline underline-offset-2">New here? Create an account</button>
        ) : (
          <button type="button" onClick={() => { setMode('signin'); setMessage(''); setNotice('') }} className="font-bold underline underline-offset-2">Already have an account? Sign in</button>
        )}
        {mode === 'signin' && <button type="button" onClick={forgot} className="underline underline-offset-2">Forgot password?</button>}
      </div>

      <p className="mt-5 text-[13px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
        We will not add you to any mailing list. Signing in is not a funding application. See our{' '}
        <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
      </p>
    </form>
  )
}
