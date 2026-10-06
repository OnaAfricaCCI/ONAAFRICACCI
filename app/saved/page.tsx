import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { closedState } from '@/lib/deadline'
import SavedList, { type SavedItem } from './SavedList'
import ProfileSetupCard from '@/app/components/ProfileSetupCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Saved opportunities',
  robots: { index: false, follow: false },
}

const CLOSED_LABEL: Record<string, string | null> = {
  open: null,
  'recently-closed': 'Recently closed',
  gone: 'No longer open',
}

export default async function SavedPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">Saved opportunities</h1>
        <p className="mt-4 text-lg text-[var(--ink-2)]">
          Sign in to see the opportunities you’ve saved. Your shortlist follows you across devices.
        </p>
        <Link href="/signin?next=/saved" className="mt-6 inline-block bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]">
          Sign in
        </Link>
      </main>
    )
  }

  // Saved ids (private, via the user's own session → RLS).
  const { data: savedRows } = await supabase
    .from('saved_opportunities')
    .select('opportunity_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const ids = (savedRows ?? []).map((r) => r.opportunity_id)

  // Opportunity details (public content) read with the service role, safe
  // columns only. Handle any that have since been removed, gracefully.
  let items: SavedItem[] = []
  if (ids.length) {
    const { data: opps } = await supabaseAdmin
      .from('opportunities')
      .select('id,name,slug,funder,funding_type,cci_sector,deadline,deadline_type')
      .in('id', ids)
    const byId = new Map((opps ?? []).map((o) => [o.id as string, o]))
    items = ids.map((id) => {
      const o = byId.get(id)
      if (!o) return { id, name: '', slug: null, funder: null, funding_type: null, cci_sector: null, closedLabel: 'No longer listed', missing: true }
      const state = closedState(o.deadline as string | null, o.deadline_type as string | null)
      return {
        id,
        name: o.name as string,
        slug: (o.slug as string | null) ?? null,
        funder: (o.funder as string | null) ?? null,
        funding_type: (o.funding_type as string | null) ?? null,
        cci_sector: (o.cci_sector as string | null) ?? null,
        closedLabel: CLOSED_LABEL[state] ?? null,
      }
    })
  }

  // Show the setup nudge only when there's no completed profile.
  const { data: profile } = await supabase
    .from('grant_seeker_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const showSetupCard = profile?.status !== 'completed'

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">Your account</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-tight sm:text-[44px]">Saved opportunities</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">
        Your private shortlist. Applications always happen on the funder’s own site.
      </p>

      <div className="mt-8">
        {showSetupCard && <ProfileSetupCard />}
        <SavedList items={items} />
      </div>
    </main>
  )
}
