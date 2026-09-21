import Link from 'next/link'
import EmailCapture from '@/app/components/EmailCapture'
import FeaturedCarousel, { type FeaturedGrant } from '@/app/components/FeaturedCarousel'
import { supabase } from '@/lib/supabase'
import { daysUntil, deadlineLabel } from '@/lib/amount'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  funder: string | null
  amount: string | null
  deadline: string | null
  deadline_type: string | null
  cci_sector: string | null
  eligible_countries: string[] | null
  application_link: string | null
}

const FEATURED_COUNT = 6

/** Fisher–Yates; returns a new array. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Featured strip: a random handful of live grants, re-drawn on every request.
 *
 * Only grants whose application link has been verified as working
 * (link_ok = true, set by the check-links function) qualify, so a visitor
 * is never sent to a dead page. "Live" means the deadline has not passed —
 * the same rule /grants uses to hide expired calls.
 */
async function featured(): Promise<FeaturedGrant[]> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id,name,funder,amount,deadline,deadline_type,cci_sector,eligible_countries,application_link',
    )
    .or(`deadline.is.null,deadline.gte.${today}`)
    .eq('link_ok', true)
    .not('description', 'is', null)

  // If the link columns don't exist yet the query errors; hiding the strip is
  // the safe outcome — nothing unverified gets featured.
  if (error || !data) return []

  const linked = (data as Row[]).filter((r) => (r.application_link ?? '').trim() !== '')

  return shuffle(linked)
    .slice(0, FEATURED_COUNT)
    .map((r) => {
      const days = daysUntil(r.deadline)
      return {
        id: r.id,
        name: r.name,
        funder: r.funder,
        amount: r.amount,
        deadlineText: deadlineLabel(r.deadline, r.deadline_type),
        urgent: days !== null && days >= 0 && days <= 30,
        tag: r.cci_sector ?? r.eligible_countries?.[0] ?? null,
        href: r.application_link!.trim(),
      }
    })
}

export default async function Home() {
  const featuredGrants = await featured()

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          Ona — Cultural &amp; Creative Industries
        </p>
        <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-[40px] leading-[1.05] sm:text-[64px]">
          The funding is out there.
          <br className="hidden sm:block" /> We help you find it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
          We gather the grants, prizes, residencies and fellowships open to African
          creatives, check they&rsquo;re real, and let you filter to what fits. On the
          continent or in the diaspora, this is one place to look.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/grants"
            className="border-2 border-[var(--ink)] bg-[var(--ink)] px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
          >
            Browse grants
          </Link>
          <Link
            href="/contact/submit"
            className="border-2 border-[var(--ink)] px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
          >
            List an opportunity
          </Link>
        </div>
      </section>

      {/* Featured grants — full-bleed terracotta band */}
      <FeaturedCarousel grants={featuredGrants} />

      {/* Email capture */}
      <div className="mx-auto max-w-6xl px-5 py-12">
        <EmailCapture />
      </div>

      {/* Closing note */}
      <section className="mx-auto mb-8 max-w-6xl border-t border-[var(--line)] px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-snug sm:text-3xl">
              Funding the culture shouldn&rsquo;t depend on knowing the right people.
            </p>
            <p className="mt-3 text-base leading-relaxed text-[var(--ink-soft)]">
              We don&rsquo;t hand out money. We show you who does, and help you reach them.
            </p>
          </div>
          <Link
            href="/contact"
            className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
          >
            Get in touch →
          </Link>
        </div>
      </section>
    </main>
  )
}
