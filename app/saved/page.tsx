import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { closedState } from '@/lib/deadline'
import SavedList, { type SavedItem } from './SavedList'
import ProfileSetupCard from '@/app/components/ProfileSetupCard'
import AccountTabs from '@/app/components/AccountTabs'

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
        <span className="mf-lbl">Your account</span>
        <h1 className="mf-d mt-3 text-[34px] sm:text-[44px]">Saved opportunities</h1>
        <p className="mt-4 text-[17px]" style={{ color: 'var(--graphite)' }}>
          Sign in to see the opportunities you’ve saved. Your shortlist follows you across devices.
        </p>
        <Link href="/signin?next=/saved" className="mf-btn mt-6">Sign in</Link>
      </main>
    )
  }

  const { data: savedRows } = await supabase
    .from('saved_opportunities')
    .select('opportunity_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const ids = (savedRows ?? []).map((r) => r.opportunity_id)

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

  const { data: profile } = await supabase
    .from('grant_seeker_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const showSetupCard = profile?.status !== 'completed'

  return (
    <>
      <AccountTabs />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        <span className="mf-lbl">Saved opportunities</span>
        <h1 className="mf-d mt-3 text-[34px] sm:text-[44px]">Your shortlist.</h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--graphite)' }}>
          Private to you. <span className="tabular-nums">{items.length}</span> saved. Applications always happen on the funder’s own site.
        </p>

        <div className="mt-7 flex flex-col gap-6">
          {showSetupCard && <ProfileSetupCard />}
          <SavedList items={items} />
        </div>
      </main>
    </>
  )
}
