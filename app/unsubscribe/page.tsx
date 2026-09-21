import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribe — Ona',
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let state: 'done' | 'missing' | 'error' = 'missing'

  if (token) {
    const { data, error } = await supabaseAdmin
      .from('subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('email')

    if (error) state = 'error'
    else state = data && data.length > 0 ? 'done' : 'missing'
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-24 text-center">
      {state === 'done' && (
        <>
          <h1 className="font-[family-name:var(--font-display)] text-[38px] leading-[1.1]">
            You&rsquo;re unsubscribed.
          </h1>
          <p className="mt-4 text-[var(--ink-soft)]">
            You won&rsquo;t receive the weekly digest any more. No hard feelings — the
            grants database stays open to everyone.
          </p>
        </>
      )}

      {state === 'missing' && (
        <>
          <h1 className="font-[family-name:var(--font-display)] text-[38px] leading-[1.1]">
            Link not recognised.
          </h1>
          <p className="mt-4 text-[var(--ink-soft)]">
            This unsubscribe link is invalid or has already been used. If you&rsquo;re
            still receiving emails,{' '}
            <Link href="/contact" className="underline underline-offset-4 hover:text-[var(--accent)]">
              tell us
            </Link>{' '}
            and we&rsquo;ll remove you by hand.
          </p>
        </>
      )}

      {state === 'error' && (
        <>
          <h1 className="font-[family-name:var(--font-display)] text-[38px] leading-[1.1]">
            Something went wrong.
          </h1>
          <p className="mt-4 text-[var(--ink-soft)]">
            We couldn&rsquo;t process that just now. Please try the link again, or{' '}
            <Link href="/contact" className="underline underline-offset-4 hover:text-[var(--accent)]">
              contact us
            </Link>
            .
          </p>
        </>
      )}

      <Link
        href="/grants"
        className="mt-10 inline-block border-2 border-[var(--ink)] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
      >
        Browse the grants database
      </Link>
    </main>
  )
}
