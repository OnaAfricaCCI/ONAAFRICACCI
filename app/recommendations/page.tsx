import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rankRecommendations, CHECK_REQUIREMENTS, type RecProfile } from '@/lib/recommend'
import RecommendationList, { type RecItem } from './RecommendationList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Opportunities for you',
  robots: { index: false, follow: false },
}

const MAX = 40

export default async function RecommendationsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Shell>
        <p className="mt-4 text-lg text-[var(--ink-2)]">Sign in and set up a profile so Ona can match opportunities to you.</p>
        <Link href="/signin?next=/recommendations" className="mt-6 inline-block bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]">Sign in</Link>
      </Shell>
    )
  }

  const { data: profile } = await supabase
    .from('grant_seeker_profiles')
    .select('status, country_code, disciplines, support_types')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.status !== 'completed') {
    return (
      <Shell>
        <p className="mt-4 text-lg text-[var(--ink-2)]">
          {profile ? 'Finish your profile and we’ll match opportunities to it.' : 'Create a short profile and we’ll match opportunities to it.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/profile/setup" className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]">
            {profile ? 'Continue setup' : 'Create my profile'}
          </Link>
          <Link href="/grants" className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">Browse all opportunities</Link>
        </div>
      </Shell>
    )
  }

  const recProfile: RecProfile = {
    country_code: profile.country_code,
    disciplines: profile.disciplines ?? [],
    support_types: profile.support_types ?? [],
  }

  // Candidates: open, publishable opportunities whose funding type the user
  // wants. Closed cycles are excluded here (type-aware, mirrors the grants list).
  const today = new Date().toISOString().slice(0, 10)
  const { data: rows } = await supabaseAdmin
    .from('opportunities')
    .select('id,name,slug,funder,funding_type,cci_sector,deadline,deadline_type,scopes,eligible_countries')
    .not('description', 'is', null)
    .in('funding_type', recProfile.support_types.length ? recProfile.support_types : ['__none__'])
    .or(`deadline_type.neq.fixed,deadline.is.null,deadline.gte.${today}`)
    .limit(600)

  const ranked = rankRecommendations(recProfile, (rows ?? []) as never[])
  const items: RecItem[] = ranked.slice(0, MAX).map(({ opportunity, reasons }) => {
    const o = opportunity as unknown as Record<string, unknown>
    return {
      id: o.id as string,
      name: o.name as string,
      slug: (o.slug as string | null) ?? null,
      funder: (o.funder as string | null) ?? null,
      funding_type: (o.funding_type as string | null) ?? null,
      cci_sector: (o.cci_sector as string | null) ?? null,
      reasons,
    }
  })

  return (
    <Shell>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--ink-2)]">
        These match the preferences in your profile. They’re not an eligibility decision. {CHECK_REQUIREMENTS}
      </p>

      {items.length === 0 ? (
        <div className="mt-8 border-2 border-dashed border-[var(--line)] p-12 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl">No current matches for your preferences.</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Open cycles change often. Try widening your preferences, or browse everything.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/profile/setup" className="border-2 border-[var(--ink)] px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">Edit my preferences</Link>
            <Link href="/grants" className="border-2 border-[var(--ink)] px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">Browse all opportunities</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <RecommendationList items={items} />
          <p className="mt-6 text-sm text-[var(--ink-soft)]">
            Not seeing the right things?{' '}
            <Link href="/profile/setup" className="underline underline-offset-4 hover:text-[var(--accent)]">Edit your preferences</Link>{' '}
            or{' '}
            <Link href="/grants" className="underline underline-offset-4 hover:text-[var(--accent)]">browse all opportunities</Link>.
          </p>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">For you</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">Opportunities for you</h1>
      {children}
    </main>
  )
}
