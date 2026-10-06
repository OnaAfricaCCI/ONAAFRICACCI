import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import DeleteProfileButton from './DeleteProfileButton'
import { COUNTRY_NAME_BY_CODE } from '@/lib/countries'
import {
  APPLICANT_TYPES,
  DISCIPLINES,
  STAGES,
  SUPPORT_TYPES,
  LANGUAGES,
  labelFor,
  type Option,
} from '@/lib/profileTaxonomy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
}

const NA = <span className="text-[var(--ink-3)]">Not provided</span>

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
        <h1 className="font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">Your profile</h1>
        <p className="mt-4 text-lg text-[var(--ink-2)]">Sign in to view and manage your profile.</p>
        <Link href="/signin?next=/profile" className="mt-6 inline-block bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]">
          Sign in
        </Link>
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

  // No profile (or just deleted) → invite to create, but keep saved available.
  if (!profile || profile.status === 'draft') {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <h1 className="font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">Your profile</h1>
        {justDeleted && (
          <p className="mt-4 border-l-2 border-[var(--sage)] bg-[var(--sage-mist)]/40 p-3 text-sm">
            Your profile was deleted. Your account and saved opportunities are still here.
          </p>
        )}
        <p className="mt-4 text-lg text-[var(--ink-2)]">
          {profile?.status === 'draft'
            ? 'You have a profile in progress. Pick up where you left off, and Ona can start matching opportunities to you.'
            : 'You don’t have a profile yet. A short, private profile lets Ona show you funding that fits your work.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/profile/setup" className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]">
            {profile?.status === 'draft' ? 'Continue setup' : 'Create my profile'}
          </Link>
          <Link href="/saved" className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">
            My saved opportunities
          </Link>
        </div>
        <SignOut />
      </main>
    )
  }

  const names = (opts: Option[], ids: string[] | null) =>
    ids && ids.length ? ids.map((id) => labelFor(opts, id)).join(', ') : null
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Country of residence', value: profile.country_code ? COUNTRY_NAME_BY_CODE.get(profile.country_code) : null },
    { label: 'Applying as', value: profile.applicant_type ? labelFor(APPLICANT_TYPES, profile.applicant_type) : null },
    { label: 'Organisation', value: profile.organisation_name },
    { label: 'Organisation country', value: profile.organisation_country ? COUNTRY_NAME_BY_CODE.get(profile.organisation_country) : null },
    { label: 'Disciplines', value: names(DISCIPLINES, profile.disciplines) },
    { label: 'Stage', value: profile.stage ? labelFor(STAGES, profile.stage) : null },
    { label: 'Support types', value: names(SUPPORT_TYPES, profile.support_types) },
    { label: 'Languages', value: names(LANGUAGES, profile.languages) },
  ]

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">Your account</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">My profile</h1>
      {justUpdated && (
        <p className="mt-4 border-l-2 border-[var(--sage)] bg-[var(--sage-mist)]/40 p-3 text-sm">Your profile was updated.</p>
      )}
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">
        Private to you and never shared with funders. Edits change which opportunities we recommend.
        Signed in as <strong className="break-all">{user.email}</strong>.
      </p>

      <dl className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">{r.label}</dt>
            <dd className="text-[15px]">{r.value || NA}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/profile/setup" className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]">
          Edit my profile
        </Link>
        <Link href="/recommendations" className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">
          Opportunities for me
        </Link>
        <Link href="/saved" className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">
          Saved opportunities
        </Link>
      </div>

      <div className="mt-12 border-t border-[var(--line)] pt-8">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Delete your profile</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
          Deleting your profile removes your preferences. Your account stays, and so do your saved
          opportunities. For a data request or to delete your whole account, email{' '}
          <a href="mailto:hello@onafunds.com" className="underline underline-offset-2">hello@onafunds.com</a>.
        </p>
        <div className="mt-4">
          <DeleteProfileButton />
        </div>
      </div>

      <SignOut />
    </main>
  )
}

function SignOut() {
  return (
    <form action="/auth/signout" method="post" className="mt-12 border-t border-[var(--line)] pt-6">
      <button type="submit" className="text-[13px] font-semibold text-[var(--ink-soft)] underline underline-offset-4 hover:text-[var(--accent)]">
        Sign out
      </button>
    </form>
  )
}
