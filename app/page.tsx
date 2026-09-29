import Link from 'next/link'
import EmailCapture from '@/app/components/EmailCapture'
import FeaturedCarousel, { type FeaturedGrant } from '@/app/components/FeaturedCarousel'
import { Aperture, TheFind } from '@/app/components/Motif'
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
  funding_type: string | null
  eligible_countries: string[] | null
  application_link: string | null
  link_checked_at: string | null
  featured: boolean | null
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
 * "Grants worth a look" on the homepage.
 *
 * Hand-picked, not random. An editor marks the strongest opportunities with
 * `featured = true` in the database (a checkbox in the Supabase table editor),
 * and the strip shows six of them, reshuffled on every visit, so a small
 * curated pool of a dozen stays fresh without ever surfacing a trade fair or a
 * $1,000 microgrant in the shop window.
 *
 * Two safeguards still apply, the same as the rest of the site: only grants
 * whose link was verified working, and only ones that are still open. If a
 * featured grant closes or its link dies it drops out automatically. Should the
 * live featured pool fall below MIN_FEATURED, the strip tops up from the
 * general pool so the homepage never looks empty, and that top-up is logged so
 * the shortfall is noticed.
 */
const MIN_FEATURED = 4
async function featured(): Promise<FeaturedGrant[]> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id,name,funder,amount,deadline,deadline_type,cci_sector,funding_type,eligible_countries,application_link,link_checked_at,featured',
    )
    .or(`deadline.is.null,deadline.gte.${today}`)
    .eq('link_ok', true)
    .not('description', 'is', null)

  // Hiding the strip is the safe outcome, since nothing unverified gets
  // featured, but it must not be silent. A vanished carousel used to look like
  // a design choice. Now the reason is in the logs where it can be found.
  if (error) {
    console.error('featured grants query failed:', error.message)
    return []
  }
  if (!data || data.length === 0) {
    console.warn('featured grants: no live, link-checked grants available')
    return []
  }

  const rows = data as Row[]
  const linked = rows.filter((r) => (r.application_link ?? '').trim() !== '')

  // Curated first. Six of the featured pool, reshuffled each visit.
  const chosen = shuffle(linked.filter((r) => r.featured)).slice(0, FEATURED_COUNT)

  // Top up only if the curated pool has thinned. This should be rare; when it
  // happens it means featured grants have closed or lost their links faster
  // than they have been replaced, which is worth seeing in the logs.
  if (chosen.length < MIN_FEATURED) {
    console.warn(
      `featured grants: only ${chosen.length} live featured; topping up from the general pool`,
    )
    const chosenIds = new Set(chosen.map((r) => r.id))
    const filler = shuffle(linked.filter((r) => !chosenIds.has(r.id)))
    chosen.push(...filler.slice(0, FEATURED_COUNT - chosen.length))
  }

  return chosen.map((r) => {
      const days = daysUntil(r.deadline)
      return {
        id: r.id,
        name: r.name,
        funder: r.funder,
        amount: r.amount,
        deadlineText: deadlineLabel(r.deadline, r.deadline_type),
        urgent: days !== null && days >= 0 && days <= 30,
        daysLeft: days,
        kicker: [r.funding_type, r.cci_sector].filter(Boolean).join(' · ') || null,
        who: r.eligible_countries?.slice(0, 3).join(' · ') ?? null,
        checkedAt: r.link_checked_at,
        href: r.application_link!.trim(),
      }
    })
}

export default async function Home() {
  const grants = await featured()

  return (
    <main>
      {/* ---- Hero. The Find, overlaid in clear space beside the words. ---- */}
      <section className="bg-[#121412] text-[#f6f4ec]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex flex-col gap-7">
            {/* Instruments, named rather than gathered under "funding". Investment
                earns its place: three listings are equity or growth capital
                (Sony Innovation Fund, IFC–Sony, HEVA Fund), and it tells a
                creative business the site is for them too. */}
            <p className="label text-[#8fa487]">
              Grants, prizes, residencies, fellowships, investment
            </p>
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-[44px] leading-[0.95] sm:text-[68px]">
              The funding is out there.{' '}
              <span className="text-[var(--accent)]">We help you find it.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[#dce3d5]">
              A checked, searchable record of the funding open to African creatives, on the
              continent and in the diaspora.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/grants"
                className="bg-[var(--accent)] px-7 py-3.5 text-[14px] font-bold text-[#121412] transition-colors hover:bg-[#f6f4ec]"
              >
                Browse the grants
              </Link>
              <Link
                href="/contact/submit"
                className="border-2 border-[#f6f4ec] px-7 py-3.5 text-[14px] font-bold text-[#f6f4ec] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]"
              >
                List an opportunity
              </Link>
            </div>
          </div>

          {/* One motif per section, and never behind the text: it sits beside
              the words in its own column, and drops away on small screens. */}
          <TheFind
            tone="ivory"
            cols={3}
            rows={7}
            coral={{ col: 1, row: 4 }}
            className="hidden h-[280px] w-[120px] justify-self-end lg:block"
          />
        </div>
      </section>

      <FeaturedCarousel grants={grants} />

      {/* ---- Funders band: Aperture on sage. ---- */}
      <section className="relative overflow-hidden bg-[var(--sage-deep)] text-[#f6f4ec]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="relative z-10 flex flex-col gap-5">
            <p className="label text-[#dce3d5]">For funders</p>
            <h2 className="font-[family-name:var(--font-display)] text-[32px] leading-[1.05] sm:text-[48px]">
              See who funds African creative work, and how to reach them.
            </h2>
            <p className="max-w-lg text-[17px] leading-relaxed text-[#eef1e9]">
              Every organisation putting money into the sector, with what they fund, who can
              apply and where to start.
            </p>
            <Link
              href="/funders"
              className="self-start border-2 border-[#f6f4ec] px-6 py-3 text-[14px] font-bold transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]"
            >
              Open the funders directory
            </Link>
          </div>
          <div aria-hidden="true" className="pointer-events-none relative min-h-[220px]">
            <Aperture className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </section>

      {/* ---- Digest ---- */}
      <div id="digest" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14">
        <EmailCapture />
      </div>
    </main>
  )
}
