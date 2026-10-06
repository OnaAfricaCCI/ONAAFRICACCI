import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import DeleteProfileButton from './DeleteProfileButton'
import AccountTabs from '@/app/components/AccountTabs'
import { COUNTRY_NAME_BY_CODE } from '@/lib/countries'
import { APPLICANT_TYPES, DISCIPLINES, STAGES, SUPPORT_TYPES, LANGUAGES, labelFor, type Option } from '@/lib/profileTaxonomy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
}

const NA = <span className="italic" style={{ color: '#8FA487' }}>Not provided</span>

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
        <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>Sign in to view and manage your profile.</p>
        <Link href="/signin?next=/profile" className="mf-btn mt-6">Sign in</Link>
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

  const names = (opts: Option[], ids: string[] | null) => (ids && ids.length ? ids.map((id) => labelFor(opts, id)).join(', ') : null)
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Country', value: profile.country_code ? COUNTRY_NAME_BY_CODE.get(profile.country_code) : null },
    { label: 'Applying as', value: profile.applicant_type ? labelFor(APPLICANT_TYPES, profile.applicant_type) : null },
    { label: 'Organisation', value: profile.organisation_name },
    { label: 'Disciplines', value: names(DISCIPLINES, profile.disciplines) },
    { label: 'Career stage', value: profile.stage ? labelFor(STAGES, profile.stage) : null },
    { label: 'Support needed', value: names(SUPPORT_TYPES, profile.support_types) },
    { label: 'Languages', value: names(LANGUAGES, profile.languages) },
  ]

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
          Private to you. Used only to match you to opportunities, and never shown to funders. Signed in as{' '}
          <strong className="break-all" style={{ color: 'var(--ink)' }}>{user.email}</strong>.
        </p>

        <div className="mt-7" style={{ borderTop: '2px solid var(--ink)' }}>
          {rows.map((r) => (
            <div key={r.label} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-4" style={{ borderBottom: '1px solid #DCE3D5' }}>
              <span className="mf-lbl">{r.label}</span>
              <span className="text-[17px]">{r.value || NA}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3.5">
          <Link href="/recommendations" className="mf-btn">Opportunities for me</Link>
          <Link href="/saved" className="mf-btn-outline">Saved opportunities</Link>
        </div>

        {/* delete */}
        <div className="mt-10 p-6" style={{ border: '1.5px solid var(--ink)' }}>
          <span className="mf-lbl" style={{ color: 'var(--accent-deep)' }}>Delete profile</span>
          <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
            Deleting your profile removes your preferences and stops recommendations.{' '}
            <strong style={{ color: 'var(--ink)' }}>Your account and your saved opportunities stay exactly as they are.</strong>{' '}
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
