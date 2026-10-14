import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rankRecommendations, CHECK_REQUIREMENTS, type RecProfile } from '@/lib/recommend'
import RecommendationList, { type RecItem } from './RecommendationList'
import AccountTabs from '@/app/components/AccountTabs'
import AccountGate from '@/app/components/AccountGate'
import Phase2 from '@/app/components/Phase2'
import { registerVisit, eligibleBatch, type Phase2State } from '@/lib/phase2'

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
        <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>Sign in, or create an account, and set up a profile so Ona can match opportunities to you.</p>
        <AccountGate defaultMode="signin" />
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('grant_seeker_profiles')
    .select('status, country_code, disciplines, support_types, open_to_all, applicant_type, visit_count, last_visit_at, last_invited_visit, batch1_completed, batch2_completed, batch3_completed, batch1_dismissals, batch2_dismissals, batch3_dismissals, batch1_dismissed_visit, batch2_dismissed_visit, batch3_dismissed_visit')
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
    open_to_all: profile.open_to_all ?? false,
  }

  // Phase 2 — count this as a return visit if it is 30+ min since the last, then
  // decide whether a batch is due. Visit counting lives on the "For you" page:
  // it is the authenticated surface people return to, and where the invitation
  // shows. Reloads within a session never advance the count (see registerVisit).
  const visit = registerVisit(
    { visit_count: profile.visit_count ?? 0, last_visit_at: profile.last_visit_at ?? null },
    Date.now(),
  )
  if (visit.isNewVisit) {
    await supabase
      .from('grant_seeker_profiles')
      .update({ visit_count: visit.visit_count, last_visit_at: visit.last_visit_at })
      .eq('user_id', user.id)
  }
  const phase2State: Phase2State = {
    visit_count: visit.visit_count,
    batch1_completed: !!profile.batch1_completed,
    batch2_completed: !!profile.batch2_completed,
    batch3_completed: !!profile.batch3_completed,
    batch1_dismissals: profile.batch1_dismissals ?? 0,
    batch2_dismissals: profile.batch2_dismissals ?? 0,
    batch3_dismissals: profile.batch3_dismissals ?? 0,
    batch1_dismissed_visit: profile.batch1_dismissed_visit ?? null,
    batch2_dismissed_visit: profile.batch2_dismissed_visit ?? null,
    batch3_dismissed_visit: profile.batch3_dismissed_visit ?? null,
    last_invited_visit: profile.last_invited_visit ?? null,
  }
  const batchToOffer = eligibleBatch(phase2State)

  const today = new Date().toISOString().slice(0, 10)
  // When someone is "open to different kinds of opportunities" we don't restrict
  // by funding_type at all — every open opportunity is a candidate, and matching
  // then happens on discipline. Otherwise we pre-filter to the funding types they
  // chose. (Without this, an "open to anything" profile — empty support_types —
  // would filter to a sentinel and return nothing.)
  let query = supabaseAdmin
    .from('opportunities')
    .select('id,name,slug,funder,funding_type,cci_sector,amount,deadline,deadline_type,application_status,programme_frequency,frequency_detail,next_open_date,scopes,eligible_countries')
    .not('description', 'is', null)
    .or(`deadline_type.neq.fixed,deadline.is.null,deadline.gte.${today}`)
    .limit(600)
  if (!recProfile.open_to_all) {
    query = query.in('funding_type', recProfile.support_types.length ? recProfile.support_types : ['__none__'])
  }
  const { data: rows } = await query

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
      amount: (o.amount as string | null) ?? null,
      deadline: (o.deadline as string | null) ?? null,
      deadline_type: (o.deadline_type as string | null) ?? null,
      application_status: (o.application_status as string | null) ?? null,
      programme_frequency: (o.programme_frequency as string | null) ?? null,
      frequency_detail: (o.frequency_detail as string | null) ?? null,
      next_open_date: (o.next_open_date as string | null) ?? null,
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

        {batchToOffer && (
          <div className="mt-6">
            <Phase2 batch={batchToOffer} applicantType={profile.applicant_type ?? null} />
          </div>
        )}

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
