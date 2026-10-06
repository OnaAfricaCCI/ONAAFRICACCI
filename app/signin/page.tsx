import type { Metadata } from 'next'
import SignInForm from './SignInForm'
import { safeNext } from '@/lib/returnUrl'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Ona Funds to save opportunities and manage your profile.',
  alternates: { canonical: '/signin' },
  robots: { index: false, follow: true },
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const next = safeNext(typeof sp.next === 'string' ? sp.next : undefined, '/profile')
  const error = typeof sp.error === 'string' ? sp.error : null

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">Your account</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[52px]">
        Sign in to Ona Funds.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-2)]">
        An account lets you save opportunities and build an optional profile for more relevant results.
        We’ll email you a secure link, so there’s no password to remember.
      </p>
      <SignInForm next={next} hadError={error} />
    </main>
  )
}
