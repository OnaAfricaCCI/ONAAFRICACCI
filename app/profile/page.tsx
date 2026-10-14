import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import DeleteProfileButton from './DeleteProfileButton'
import AccountTabs from '@/app/components/AccountTabs'
import AccountGate from '@/app/components/AccountGate'
import { COUNTRY_NAME_BY_CODE } from '@/lib/countries'
import Phase2 from '@/app/components/Phase2'
import {
  APPLICANT_TYPES, DISCIPLINES, STAGES, SUPPORT_TYPES, labelFor, type Option,
  CAREER_STAGE_APPLICANT_TYPES, ORG_APPLICANT_TYPES,
  GOALS, TIMEFRAMES, WILLING_LOCATIONS, APPLICATIONS_COUNTS, PRIOR_SUPPORT, BARRIERS,
  TYPICAL_AMOUNTS, FIT_RATINGS, ACTIONS_TAKEN,
} from '@/lib/profileTaxonomy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
}

const NA = <span className="italic" style={{ color: '#8FA487' }}>Not provided</span>
// Phase 2 optionals are neutral when blank — never read as ineligibility.
const NOT_YET = <span className="italic" style={{ color: '#8FA487' }}>Not answered yet</span>

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="mf-d text-[34px] sm:text-[44px]">Your profile</h1>
        <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>Sign in, or create an account, to view and manage your profile.</p>
        <AccountGate defaultMode="signin" />
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('grant_seeker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const justDeleted = sp.deleted === '1'
  const justUpdated = sp.updated === '1'

  if (!profile || profile.status === 'draft') {
    return (
      <>
        <AccountTabs />
        <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
          <h1 className="mf-d text-[34px] sm:text-[44px]">Your profile</h1>
          {justDeleted && (
            <p className="mt-4 p-3 text-[14px]" style={{ borderLeft: '3px solid #8FA487', background: 'rgba(143,164,135,.18)' }}>
              Your profile was deleted. Your account and saved opportunities are still here.
            </p>
          )}
          <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>
            {profile?.status === 'draft'
              ? 'You have a profile in progress. Pick up where you left off, and Ona can start matching opportunities to you.'
              : 'You don’t have a profile yet. A short, private profile lets Ona show you funding that fits your work.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3.5">
            <Link href="/profile/setup" className="mf-btn">{profile?.status === 'draft' ? 'Continue setup' : 'Create my profile'}</Link>
            <Link href="/saved" className="mf-btn-outline">My saved opportunities</Link>
          </div>
          <SignOut />
        </main>
      </>
    )
  }

  const names = (opts: Option[], ids: string[] | null) => (ids && ids.length ? ids.map((id) => labelFor(opts, id)).join('; ') : null)
  const countryNames = (codes: string[] | null) => (codes && codes.length ? codes.map((c) => COUNTRY_NAME_BY_CODE.get(c) ?? c).join('; ') : null)
  const isIndividual = profile.applicant_type ? CAREER_STAGE_APPLICANT_TYPES.has(profile.applicant_type) : false
  const isOrg = profile.applicant_type ? ORG_APPLICANT_TYPES.has(profile.applicant_type) : false
  const isCollective = profile.applicant_type === 'collective'

  // Creative areas = taxonomy disciplines plus any "Another area" free text.
  const areas = [names(DISCIPLINES, profile.disciplines), profile.disciplines_other ? `Another: ${profile.disciplines_other}` : null].filter(Boolean).join('; ')
  // Applying as = type, with an organisation/collective name appended when given.
  const applyingAs = profile.applicant_type
    ? [labelFor(APPLICANT_TYPES, profile.applicant_type), profile.organisation_name].filter(Boolean).join(' · ')
    : null

  const phase1Rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Based in', value: profile.country_code ? COUNTRY_NAME_BY_CODE.get(profile.country_code) : null },
    { label: 'Applying as', value: applyingAs },
    { label: 'Creative areas', value: areas || null },
    ...(isIndividual ? [{ label: 'Career stage', value: profile.stage ? labelFor(STAGES, profile.stage) : null }] : []),
    { label: 'Opportunity interests', value: profile.open_to_all ? 'Open to different kinds of opportunities' : names(SUPPORT_TYPES, profile.support_types) },
  ]

  // Phase 2 answers. "None", "Not sure" and "Prefer not to say" are real answers;
  // a blank is "Not answered yet" (neutral, never ineligibility).
  const locationRow = isOrg
    ? { label: 'Registered in', value: countryNames(profile.registered_in) }
    : isCollective
      ? { label: 'Members based in', value: countryNames(profile.members_based_in) }
      : { label: 'Citizenship', value: profile.citizenship_prefer_not ? 'Prefer not to say' : countryNames(profile.citizenship) }
  const phase2Rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Goals (12 months)', value: names(GOALS, profile.goals) },
    { label: 'Hoping to find', value: profile.timeframe ? labelFor(TIMEFRAMES, profile.timeframe) : null },
    { label: 'Willing to take part', value: names(WILLING_LOCATIONS, profile.willing_locations) },
    { label: 'Applications (12 months)', value: profile.applications_count ? labelFor(APPLICATIONS_COUNTS, profile.applications_count) : null },
    { label: 'Prior support', value: names(PRIOR_SUPPORT, profile.prior_support) },
    { label: 'Main difficulties', value: [names(BARRIERS, profile.barriers), profile.barriers_other ? `Other: ${profile.barriers_other}` : null].filter(Boolean).join('; ') || null },
    locationRow,
    { label: 'Typical amount', value: profile.typical_amount ? labelFor(TYPICAL_AMOUNTS, profile.typical_amount) : null },
    { label: 'Fit with Ona Funds', value: [profile.fit_rating ? labelFor(FIT_RATINGS, profile.fit_rating) : null, profile.fit_note].filter(Boolean).join(' — ') || null },
    { label: 'Actions taken', value: names(ACTIONS_TAKEN, profile.actions_taken) },
  ]
  const startedPhase2 = !!(profile.batch1_completed || profile.batch2_completed || profile.batch3_completed) ||
    phase2Rows.some((r) => r.value)
  const openBatch: 1 | 2 | 3 | null = !profile.batch1_completed ? 1 : !profile.batch2_completed ? 2 : !profile.batch3_completed ? 3 : null

  return (
    <>
      <AccountTabs />
      <main className="mx-auto max-w-[760px] px-5 py-10 sm:py-12">
        {justUpdated && (
          <p className="mb-5 p-3 text-[14px]" style={{ borderLeft: '3px solid #8FA487', background: 'rgba(143,164,135,.18)' }}>Your profile was updated.</p>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mf-lbl">My profile</span>
            <h1 className="mf-d mt-3 text-[34px] sm:text-[40px]">Your preferences.</h1>
          </div>
          <Link href="/profile/setup" className="mf-btn-outline">Edit</Link>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
          Your profile is private and is not shown to funders. We use your answers to improve your recommendations and
          understand the needs of people using Ona Funds. We may share grouped findings with partners and funders,
          without identifying individual users. Signed in as{' '}
          <strong className="break-all" style={{ color: 'var(--ink)' }}>{user.email}</strong>.
        </p>

        <div className="mt-7" style={{ borderTop: '2px solid var(--ink)' }}>
          {phase1Rows.map((r) => (
            <div key={r.label} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-4" style={{ borderBottom: '1px solid #DCE3D5' }}>
              <span className="mf-lbl">{r.label}</span>
              <span className="text-[17px]">{r.value || NA}</span>
            </div>
          ))}
        </div>

        {/* Phase 2 — the optional "a little more about you" answers. */}
        {startedPhase2 && (
          <div className="mt-10">
            <span className="mf-lbl">A little more about you</span>
            <div className="mt-3" style={{ borderTop: '2px solid var(--ink)' }}>
              {phase2Rows.map((r) => (
                <div key={r.label} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-4" style={{ borderBottom: '1px solid #DCE3D5' }}>
                  <span className="mf-lbl">{r.label}</span>
                  <span className="text-[17px]">{r.value || NOT_YET}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {openBatch && (
          <div className="mt-8">
            <Phase2 batch={openBatch} applicantType={profile.applicant_type ?? null} variant="manual" />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3.5">
          <Link href="/recommendations" className="mf-btn">Opportunities for me</Link>
          <Link href="/saved" className="mf-btn-outline">Saved opportunities</Link>
        </div>

        {/* delete */}
        <div className="mt-10 p-6" style={{ border: '1.5px solid var(--ink)' }}>
          <span className="mf-lbl" style={{ color: 'var(--accent-deep)' }}>Delete profile</span>
          <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
            Deleting your profile removes your preferences and stops recommendations.{' '}
            You can build a new profile anytime. For a data request or to delete your whole account, email{' '}
            <a href="mailto:hello@onafunds.com" className="underline underline-offset-2">hello@onafunds.com</a>.
          </p>
          <div className="mt-4"><DeleteProfileButton /></div>
        </div>

        <SignOut />
      </main>
    </>
  )
}

function SignOut() {
  return (
    <form action="/auth/signout" method="post" className="mt-12 border-t border-[var(--line)] pt-6">
      <button type="submit" className="text-[14px] font-semibold underline underline-offset-4" style={{ color: 'var(--ink-soft)' }}>Sign out</button>
    </form>
  )
}
