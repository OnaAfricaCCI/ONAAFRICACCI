'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { track } from '@/lib/analytics'
import SignInDialog from './SignInDialog'

/**
 * One place that knows: who is signed in, which opportunities they've saved,
 * and how to save / open the sign-in dialog. Mounted once in the layout so a
 * page full of Save buttons shares a single session check and a single
 * fetch of saved ids — not one request per card.
 *
 * Signed-out "Save" doesn't fail: it opens the sign-in dialog and remembers the
 * opportunity as a pending save, which completes once after the magic link.
 */
type DialogState =
  | { open: false }
  | { open: true; pendingSaveId: string | null; heading?: string; body?: string }

type AccountValue = {
  user: User | null
  ready: boolean
  isSaved: (opportunityId: string) => boolean
  toggleSave: (opportunityId: string, from: 'list' | 'detail' | 'saved_page') => Promise<void>
  openSignIn: (opts?: { pendingSaveId?: string; heading?: string; body?: string }) => void
}

const Ctx = createContext<AccountValue | null>(null)

export function useAccount(): AccountValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}

export default function AccountProvider({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const [toast, setToast] = useState<string | null>(null)
  const inFlight = useRef<Set<string>>(new Set())

  // After a pending save completes through the magic link, the user returns to
  // the page they came from with ?saved=1. Show a one-time confirmation here
  // (on whatever page that is) and tidy the URL.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('saved') === '1') {
        // Intentional: show the one-time confirmation on mount after return.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToast('Saved to your shortlist.')
        params.delete('saved')
        const qs = params.toString()
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
        )
        const t = setTimeout(() => setToast(null), 4000)
        return () => clearTimeout(t)
      }
    } catch {
      /* no-op */
    }
  }, [])

  // Track the session and keep it in step with sign-in / sign-out.
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!active) return
      setUser(data.user ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
      },
    )
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  // Load the saved ids once per sign-in.
  useEffect(() => {
    if (!user) {
      // Clear the shortlist when signed out — intentional sync to auth state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedIds(new Set())
      return
    }
    let active = true
    fetch('/api/saved')
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d: { ids?: string[] }) => active && setSavedIds(new Set(d.ids ?? [])))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user])

  const openSignIn: AccountValue['openSignIn'] = useCallback((opts) => {
    setDialog({ open: true, pendingSaveId: opts?.pendingSaveId ?? null, heading: opts?.heading, body: opts?.body })
  }, [])

  const toggleSave = useCallback(
    async (opportunityId: string, from: 'list' | 'detail' | 'saved_page') => {
      if (!user) {
        openSignIn({
          pendingSaveId: opportunityId,
          heading: 'Keep this opportunity in your shortlist',
          body: 'Create an account to save opportunities and return to them across devices.',
        })
        return
      }
      if (inFlight.current.has(opportunityId)) return
      inFlight.current.add(opportunityId)
      const currentlySaved = savedIds.has(opportunityId)
      // Optimistic update.
      setSavedIds((prev) => {
        const nxt = new Set(prev)
        if (currentlySaved) nxt.delete(opportunityId)
        else nxt.add(opportunityId)
        return nxt
      })
      try {
        const res = await fetch('/api/saved', {
          method: currentlySaved ? 'DELETE' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ opportunity_id: opportunityId }),
        })
        if (!res.ok) throw new Error('save failed')
        track(
          currentlySaved
            ? { name: 'opportunity_unsaved', from: from === 'saved_page' ? 'saved_page' : from }
            : { name: 'opportunity_saved', from: from === 'saved_page' ? 'detail' : from },
        )
      } catch {
        // Roll back on failure.
        setSavedIds((prev) => {
          const nxt = new Set(prev)
          if (currentlySaved) nxt.add(opportunityId)
          else nxt.delete(opportunityId)
          return nxt
        })
      } finally {
        inFlight.current.delete(opportunityId)
      }
    },
    [user, savedIds, openSignIn],
  )

  // Called by the dialog after a successful email+password sign-in / sign-up.
  // The session cookies are now set, so we complete any pending save here —
  // no page round-trip, the person stays where they were.
  const onAuthed = useCallback(async (pendingId?: string | null) => {
    setDialog({ open: false })
    await new Promise((r) => setTimeout(r, 150)) // let the session cookies flush
    if (pendingId) {
      try {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ opportunity_id: pendingId }),
        })
        setSavedIds((prev) => new Set(prev).add(pendingId))
        track({ name: 'opportunity_saved', from: 'pending' })
      } catch {
        /* the savedIds refetch on sign-in will recover it */
      }
    }
    setToast(pendingId ? 'Saved to your shortlist.' : 'You’re signed in.')
    setTimeout(() => setToast(null), 4000)
  }, [])

  const value: AccountValue = {
    user,
    ready,
    isSaved: (id) => savedIds.has(id),
    toggleSave,
    openSignIn,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {dialog.open && (
        <SignInDialog
          pendingSaveId={dialog.pendingSaveId}
          heading={dialog.heading}
          body={dialog.body}
          onClose={() => setDialog({ open: false })}
          onAuthed={onAuthed}
        />
      )}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 border-2 border-[var(--ink)] bg-[var(--sage-mist)] px-5 py-3 text-sm font-semibold text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]"
        >
          {toast}
        </div>
      )}
    </Ctx.Provider>
  )
}
