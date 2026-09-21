import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Ona collects, why, and what you can do about it.',
  alternates: { canonical: '/privacy' },
}

const UPDATED = '22 September 2026'

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl leading-[1.2]">{children}</h2>
  )
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">Privacy</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
        What we collect, and why.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[var(--ink-2)]">
        Ona is a public information site. You can use all of it without giving us
        anything. This page explains the few things we do collect when you choose to.
        Last updated {UPDATED}.
      </p>

      <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-[var(--ink-2)]">
        <H2>If you subscribe to the digest</H2>
        <p>
          We store your email address, and any sector or country preferences you chose,
          so we can send you the weekly digest. Every email contains an unsubscribe link;
          using it stops the emails and marks your address as inactive. We don&rsquo;t sell
          or share the list with anyone. Emails are sent through Resend, our email provider.
        </p>

        <H2>If you contact us or submit an opportunity</H2>
        <p>
          We store what you send us — your name, email and message, or the opportunity
          details — so we can read it, reply, and review the opportunity before publishing.
          We use your email only to respond about what you sent.
        </p>

        <H2>How we measure the site</H2>
        <p>
          We use PostHog to understand how the site is used: which pages people visit,
          what they search for, which grants they click through to. We&rsquo;ve set it up
          without cookies, so nothing is stored on your device and visits aren&rsquo;t linked
          across sessions. Session recordings, where enabled, mask anything typed into a
          form. Our analytics are hosted in the EU.
        </p>

        <H2>Where your data lives</H2>
        <p>
          The site runs on Vercel and stores data in Supabase (hosted in the EU). Both are
          reputable providers with their own security and privacy commitments.
        </p>

        <H2>Your rights</H2>
        <p>
          You can ask us at any time what we hold about you, ask us to correct it, or ask
          us to delete it. Unsubscribing from the digest is instant via the link in any
          email. For anything else,{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>{' '}
          and we&rsquo;ll act on it promptly.
        </p>

        <H2>Links to other sites</H2>
        <p>
          Grant listings link out to funders&rsquo; own websites. Those sites have their own
          privacy practices, which we don&rsquo;t control.
        </p>

        <H2>Changes</H2>
        <p>
          If this page changes materially we&rsquo;ll update the date at the top. Questions
          about any of it are welcome via the{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
