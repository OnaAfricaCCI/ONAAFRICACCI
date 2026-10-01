import Link from 'next/link'
import type { Metadata } from 'next'
import { Aperture } from '@/app/components/Motif'
import { OG_IMAGE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'For funders',
  description:
    'Make your funding easy to find, and see who else funds your field. List your grant, prize, residency or fellowship on Ona Funds — free, verified, and searchable by creatives across Africa and the diaspora.',
  alternates: { canonical: '/for-funders' },
  // Unpublished while being tidied: reachable by direct URL, but kept out of
  // search. Remove this line (and restore the nav + sitemap entries) to publish.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'For funders · Ona Funds',
    description:
      'Make your funding easy to find, and see who else funds your field. Listing is free and verified.',
    url: '/for-funders',
    type: 'website',
    images: [OG_IMAGE],
  },
}

const BENEFITS = [
  {
    n: '01',
    title: 'A listing creatives can find',
    body: 'List once and your opportunity becomes searchable for creatives across Africa and the diaspora. Filters by country, sector and support type help applicants find the calls that suit them, so the applications you draw are a genuine match.',
  },
  {
    n: '02',
    title: 'See who funds what',
    body: "Ona Funds gathers the funding open to Africa's creative and cultural industries in one place. Funders use it to understand who else backs their discipline, spot regions and sectors that see little support, and place their own giving in context.",
  },
  {
    n: '03',
    title: 'A listing the sector can trust',
    body: 'Every opportunity on Ona Funds is checked before it goes live. A verified listing shows creatives that your call is real, and it keeps your name away from anyone who misuses it in scams.',
  },
  {
    n: '04',
    title: 'Applications that fit',
    body: 'Your listing states plainly what you fund, who can apply and how. Creatives can tell whether your call suits them before they apply, so more of the applications you receive are a genuine match.',
  },
]

const STEPS = [
  { n: 'Step 1', body: 'Send us your open call.' },
  { n: 'Step 2', body: 'We check the details and confirm them with you.' },
  { n: 'Step 3', body: 'We list it so creatives across Africa and the diaspora can find it.' },
  { n: 'Step 4', body: 'It stays live until your deadline.' },
]

export default function ForFundersPage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pt-16 pb-14 sm:pt-24">
        <div className="flex items-center gap-3">
          <Aperture className="h-7 w-7" />
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
            For funders
          </p>
        </div>
        <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[38px] leading-[1.03] sm:text-[60px]">
          Make your funding easy to find. See who else funds your field.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--ink-2)]">
          Ona Funds lists your grant, prize, residency or fellowship for creatives to find across
          Africa and the diaspora. It also shows you who else funds this work, and where the gaps are.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contact/submit"
            className="inline-block bg-[var(--accent)] px-7 py-3.5 text-[14px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            List your opportunity
          </Link>
          <Link
            href="/contact"
            className="inline-block border-2 border-[var(--ink)] px-7 py-3.5 text-[14px] font-bold uppercase tracking-[0.06em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Talk to us
          </Link>
        </div>
      </section>

      {/* The problem */}
      <section className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-[28px] leading-tight sm:text-[38px]">
            Good funding stays hard to find.
          </h2>
          <div className="mt-6 grid gap-6 text-[17px] leading-relaxed text-[var(--ink-2)] sm:max-w-3xl">
            <p>
              Calls for African creative work move through familiar networks and cluster in a few
              cities. Talented creatives in smaller markets and across the diaspora often never hear
              about funding meant for them.
            </p>
            <p>
              Funders also work without a shared view of the sector. You rarely know who else funds
              your discipline, where the overlaps sit, or which regions see little support.
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Ona Funds closes both gaps.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] leading-tight sm:text-[38px]">
            What a funder gets from Ona Funds
          </h2>
          <div className="mt-8 grid gap-px border border-[var(--ink)] bg-[var(--ink)] sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.n} className="bg-[var(--bg)] p-7">
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--accent)]">
                  {b.n}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl leading-snug">
                  {b.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to list */}
      <section className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-[28px] leading-tight sm:text-[38px]">
              How to list
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--forest)]">
              Listing is free
            </p>
          </div>
          <ol className="mt-8 grid gap-px border border-[var(--ink)] bg-[var(--ink)] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-[var(--bg)] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                  {s.n}
                </p>
                <p className="mt-2 text-[16px] leading-snug text-[var(--ink)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Collaborate */}
      <section className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
            Collaborate
          </p>
          <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[28px] leading-tight sm:text-[38px]">
            You are welcome to be part of this.
          </h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[var(--ink-2)]">
            Ona Funds is new and growing. If you care about your funding reaching creatives across
            Africa and the diaspora, we would love to hear from you. List an open call, help us keep
            your funding information accurate, or simply start a conversation about the sector and
            where it is heading.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.12em] text-[var(--terracotta)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
          >
            Get in touch →
          </Link>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#121412] text-[#f6f4ec]">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="max-w-3xl font-[family-name:var(--font-display)] text-[30px] leading-[1.08] sm:text-[44px]">
            Make your funding easy for Africa&rsquo;s creatives to find.
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/contact/submit"
              className="inline-block bg-[var(--accent)] px-7 py-3.5 text-[14px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[#f6f4ec]"
            >
              List your opportunity
            </Link>
            <p className="text-[15px] text-[#dce3d5]">
              Or email us at{' '}
              <a
                href="mailto:hello@onafunds.com"
                className="underline decoration-[#8fa487] decoration-2 underline-offset-4 transition-colors hover:text-[var(--accent)]"
              >
                hello@onafunds.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
