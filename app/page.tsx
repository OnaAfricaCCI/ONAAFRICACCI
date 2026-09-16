import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function counts() {
  const [grants, funders] = await Promise.all([
    supabase.from('opportunities').select('id', { count: 'exact', head: true }),
    supabase.from('funders').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])
  return { grants: grants.count ?? 0, funders: funders.count ?? 0 }
}

export default async function Home() {
  const { grants, funders } = await counts()

  const doors = [
    {
      href: '/grants',
      kicker: 'Grants',
      title: 'Find funding',
      body: 'Grants, prizes, residencies and fellowships — filterable by sector, country, type and amount.',
      stat: grants > 0 ? `${grants} opportunities` : null,
    },
    {
      href: '/funders',
      kicker: 'Funders',
      title: 'Know who funds',
      body: 'Profiles of the foundations, funds, institutes and public bodies backing African creative work.',
      stat: funders > 0 ? `${funders} organizations` : null,
    },
    {
      href: '/blog',
      kicker: 'Blog',
      title: 'Read the ecosystem',
      body: 'Stories, updates and conversations from across the continent’s cultural and creative industries.',
      stat: null,
    },
  ]

  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Hero */}
      <section className="border-b border-[var(--line)] py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--terracotta)]">
          Ona — Africa CCI
        </p>
        <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.02] sm:text-7xl">
          Africa&rsquo;s creative economy,
          <br className="hidden sm:block" /> and the money behind it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
          One place to find funding, understand who gives it, and follow what&rsquo;s
          happening across the continent&rsquo;s cultural and creative industries.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/grants"
            className="border-2 border-[var(--ink)] bg-[var(--ink)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--ink)]"
          >
            Browse grants
          </Link>
          <Link
            href="/contact/submit"
            className="border-2 border-[var(--ink)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            List an opportunity
          </Link>
        </div>
      </section>

      {/* Three doors */}
      <section className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {doors.map((d, i) => (
          <Link
            key={d.href}
            href={d.href}
            className="rise-in group flex flex-col border border-[var(--line)] p-7 transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper-deep)]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--terracotta)]">
              {d.kicker}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold decoration-[var(--terracotta)] decoration-2 underline-offset-4 group-hover:underline">
              {d.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]/75">{d.body}</p>
            <p className="mt-auto pt-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
              {d.stat ?? 'Explore'} →
            </p>
          </Link>
        ))}
      </section>

      {/* Closing note */}
      <section className="mb-8 border-t border-[var(--line)] py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-xl font-[family-name:var(--font-display)] text-2xl leading-snug sm:text-3xl">
            Funding the culture shouldn&rsquo;t depend on knowing the right people.
          </p>
          <Link
            href="/contact"
            className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:no-underline"
          >
            Get in touch →
          </Link>
        </div>
      </section>
    </main>
  )
}
