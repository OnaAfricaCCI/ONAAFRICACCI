import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import SetupWizard, { type WizardProfile } from './SetupWizard'
import { DISCIPLINES, disciplineMatchesSector, SUPPORT_TYPE_IDS } from '@/lib/profileTaxonomy'
import { AFRICA_CODE_TO_SCOPE } from '@/lib/countries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Set up your profile',
  description: 'A short, private profile so Ona can show you more relevant funding.',
  robots: { index: false, follow: false },
}

const SCOPE_TO_CODE = new Map(Object.entries(AFRICA_CODE_TO_SCOPE).map(([code, slug]) => [slug, code]))

export default async function SetupPage({
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
        <h1 className="font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">
          Create your profile
        </h1>
        <p className="mt-4 text-lg text-[var(--ink-2)]">
          You’ll need an account first. We’ll email you a secure sign-in link, then bring you straight back here.
        </p>
        <Link
          href="/signin?next=/profile/setup"
          className="mt-6 inline-block bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Sign in to continue
        </Link>
      </main>
    )
  }

  const { data: existing } = await supabase
    .from('grant_seeker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Suggestions from grant filters (entry point C). Only used to PREFILL; the
  // wizard asks the user to confirm before anything is saved.
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const suggestedSector = get('sector')
  const suggestedType = get('type')
  const suggestedPlace = get('place')
  const suggestedDisciplines = suggestedSector
    ? DISCIPLINES.filter((d) => disciplineMatchesSector(d.id, suggestedSector)).map((d) => d.id)
    : []
  const suggestedSupport = suggestedType && SUPPORT_TYPE_IDS.has(suggestedType) ? [suggestedType] : []
  const suggestedCountry = suggestedPlace ? SCOPE_TO_CODE.get(suggestedPlace) ?? null : null
  const hasSuggestions = suggestedDisciplines.length > 0 || suggestedSupport.length > 0 || !!suggestedCountry

  let initial: WizardProfile | null = null
  if (existing) {
    initial = {
      country_code: existing.country_code,
      applicant_type: existing.applicant_type,
      organisation_name: existing.organisation_name,
      organisation_country: existing.organisation_country,
      disciplines: existing.disciplines ?? [],
      stage: existing.stage,
      support_types: existing.support_types ?? [],
      languages: existing.languages ?? [],
    }
  } else if (hasSuggestions) {
    initial = {
      country_code: suggestedCountry,
      applicant_type: null,
      organisation_name: null,
      organisation_country: null,
      disciplines: suggestedDisciplines,
      stage: null,
      support_types: suggestedSupport,
      languages: [],
    }
  }

  // Only flag "from your filters" when we actually prefilled from filters and
  // there wasn't already a saved profile to resume.
  const suggestedFromFilters = !existing && hasSuggestions

  return (
    <SetupWizard
      initial={initial}
      suggestedFromFilters={suggestedFromFilters}
      entryPoint={suggestedFromFilters ? 'grants_filters' : 'setup'}
      alreadyCompleted={existing?.status === 'completed'}
    />
  )
}
