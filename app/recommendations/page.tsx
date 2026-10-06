import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rankRecommendations, CHECK_REQUIREMENTS, type RecProfile } from '@/lib/recommend'
import RecommendationList, { type RecItem } from './RecommendationList'
import AccountTabs from '@/app/components/AccountTabs'

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
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <span className="mf-lbl">For you</span>
        <h1 className="mf-d mt-3 text-[34px] sm:text-[44px]">Opportunities for you</h1>
        <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>Sign in and set up a profile so Ona can match opportunities to you.</p>
        <Link href="/signin?next=/recommendations" className="mf-btn mt-6">Sign in</Link>
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('grant_seeker_profiles')
    .select('status, country_code, disciplines, support_types')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.status !== 'completed') {
    return (
      <>
        <AccountTabs />
        <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
          <span className="mf-lbl">For you</span>
          <h1 className="mf-d mt-3 text-[34px] sm:text-[44px]">Matched to your work.</h1>
          <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>
            {profile ? 'Finish your profile and we’ll match opportunities to it.' : 'Create a short profile and we’ll match opportunities to it.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3.5">
            <Link href="/profile/setup" className="mf-btn">{profile ? 'Continue setup' : 'Create my profile'}</Link>
            <Link href="/grants" className="mf-btn-outline">Browse all opportunities</Link>
          </div>
        </main>
      </>
    )
  }

  const recProfile: RecProfile = {
    country_code: profile.country_code,
    disciplines: profile.disciplines ?? [],
    support_types: profile.support_types ?? [],
  }

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
    <>
      <AccountTabs />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        <span className="mf-lbl">Opportunities for you</span>
        <h1 className="mf-d mt-3 text-[34px] sm:text-[44px]">Matched to your work.</h1>

        <div className="mt-6 p-4 text-[14px] leading-relaxed" style={{ background: '#DCE3D5', color: '#121412' }}>
          <strong>These are preference matches, not eligibility decisions.</strong> {CHECK_REQUIREMENTS}
        </div>

        {items.length === 0 ? (
          <div className="mt-8 border-2 border-dashed border-[var(--line)] p-12 text-center">
            <p className="mf-d text-[22px]">No current matches for your preferences.</p>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--graphite)' }}>Open cycles change often. Try widening your preferences, or browse everything.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3.5">
              <Link href="/profile/setup" className="mf-btn-outline">Edit my preferences</Link>
              <Link href="/grants" className="mf-btn-outline">Browse all opportunities</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <RecommendationList items={items} />
            <p className="mt-6 text-[14px]" style={{ color: 'var(--ink-soft)' }}>
              Not seeing the right things?{' '}
              <Link href="/profile/setup" className="underline underline-offset-4">Edit your preferences</Link> or{' '}
              <Link href="/grants" className="underline underline-offset-4">browse all opportunities</Link>.
            </p>
          </div>
        )}
      </main>
    </>
  )
}
