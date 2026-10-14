'use client'

/**
 * Phase 2 — the discreet, inline invitation shown above the opportunity grid on
 * the "For you" page, and the batch it opens. Never a blocking modal; it never
 * prevents browsing. One batch at a time; the server decides which (or none).
 *
 * The same component also drives the manual entry point from the profile page
 * (`startOpen`), so someone can continue even after automatic invitations stop.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { COUNTRIES_WORLD, COUNTRY_NAME_BY_CODE } from '@/lib/countries'
import {
  GOALS, GOALS_EXCLUSIVE, TIMEFRAMES, WILLING_LOCATIONS, WILLING_LOCATIONS_EXCLUSIVE,
  APPLICATIONS_COUNTS, PRIOR_SUPPORT, PRIOR_SUPPORT_EXCLUSIVE, BARRIERS, BARRIERS_EXCLUSIVE,
  TYPICAL_AMOUNTS, FIT_RATINGS, ACTIONS_TAKEN, ACTIONS_TAKEN_EXCLUSIVE,
  ORG_APPLICANT_TYPES, type Option,
} from '@/lib/profileTaxonomy'
import { ChoiceOption, SelectCount } from '@/app/components/ProfileControls'

type Batch = 1 | 2 | 3
export type Phase2Answers = {
  goals: string[]; timeframe: string | null; willing_locations: string[]
  applications_count: string | null; prior_support: string[]; barriers: string[]; barriers_other: string | null
  citizenship: string[]; citizenship_prefer_not: boolean; registered_in: string[]; members_based_in: string[]
  typical_amount: string | null; fit_rating: string | null; fit_note: string | null; actions_taken: string[]
}

const EMPTY: Phase2Answers = {
  goals: [], timeframe: null, willing_locations: [],
  applications_count: null, prior_support: [], barriers: [], barriers_other: null,
  citizenship: [], citizenship_prefer_not: false, registered_in: [], members_based_in: [],
  typical_amount: null, fit_rating: null, fit_note: null, actions_taken: [],
}

const BATCH_TITLE: Record<Batch, string> = { 1: 'Goals', 2: 'Funding experience', 3: 'Matching & outcomes' }
const BATCH_INTRO: Record<Batch, string> = {
  1: 'All optional. Answer what you like and finish whenever you’re ready.',
  2: 'All optional. These answers help us understand the community and never affect your eligibility.',
  3: 'All optional. We never request identity or registration documents.',
}

export default function Phase2({
  batch, applicantType, initial, variant = 'invite',
}: {
  batch: Batch
  applicantType: string | null
  initial?: Partial<Phase2Answers>
  /** 'invite' = the discreet For-you card with "Not now"; 'manual' = the profile entry point. */
  variant?: 'invite' | 'manual'
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'invite' | 'form' | 'done'>('invite')
  const [doneKind, setDoneKind] = useState<'toast' | 'full' | 'neutral'>('toast')
  const [ans, setAns] = useState<Phase2Answers>({ ...EMPTY, ...initial })
  const [busy, setBusy] = useState<false | 'save' | 'later' | 'dismiss'>(false)
  const [error, setError] = useState('')

  // Record that the automatic invitation was seen (no personal data; batch number
  // only). The manual profile entry point is not an automatic invitation.
  const viewed = useRef(false)
  useEffect(() => {
    if (variant === 'invite' && mode === 'invite' && !viewed.current) { viewed.current = true; track({ name: 'profile_invite_view', entry_point: `batch${batch}` }) }
  }, [variant, mode, batch])

  // ---- answer helpers ------------------------------------------------------
  const setSingle = (key: keyof Phase2Answers, id: string) =>
    setAns((a) => ({ ...a, [key]: a[key] === id ? null : id }))
  const setText = (key: keyof Phase2Answers, v: string) => setAns((a) => ({ ...a, [key]: v || null }))
  const toggleMulti = (key: keyof Phase2Answers, id: string, exclusive: Set<string>, max?: number) =>
    setAns((a) => {
      const cur = a[key] as string[]
      if (exclusive.has(id)) return { ...a, [key]: cur.includes(id) ? [] : [id] }
      let next = cur.filter((x) => !exclusive.has(x)) // choosing a real answer clears any exclusive one
      if (next.includes(id)) next = next.filter((x) => x !== id)
      else { if (max && next.length >= max) return a; next = [...next, id] }
      return { ...a, [key]: next }
    })
  const addCountry = (key: 'citizenship' | 'registered_in' | 'members_based_in', code: string) =>
    setAns((a) => {
      const cur = a[key]
      const extra = key === 'citizenship' ? { citizenship_prefer_not: false } : {}
      return cur.includes(code) ? a : { ...a, [key]: [...cur, code], ...extra }
    })
  const removeCountry = (key: 'citizenship' | 'registered_in' | 'members_based_in', code: string) =>
    setAns((a) => ({ ...a, [key]: a[key].filter((c) => c !== code) }))
  const togglePreferNot = () =>
    setAns((a) => ({ ...a, citizenship_prefer_not: !a.citizenship_prefer_not, citizenship: a.citizenship_prefer_not ? a.citizenship : [] }))

  // ---- persistence ---------------------------------------------------------
  async function send(action: 'submit' | 'save-partial' | 'dismiss') {
    const kind = action === 'dismiss' ? 'dismiss' : action === 'save-partial' ? 'later' : 'save'
    setBusy(kind); setError('')
    try {
      const res = await fetch('/api/profile/phase2', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, batch, ...ans }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      return data as { thankYou?: 'full' | 'neutral' | null }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
      return null
    }
  }

  async function onDismiss() {
    track({ name: 'profile_invite_click', entry_point: `batch${batch}_dismiss` })
    const r = await send('dismiss')
    if (r) router.refresh()
  }
  // Note: no router.refresh() on save. The confirmation (toast or thank-you)
  // lives inside this component; a refresh would re-run the server page, which —
  // now that this batch is done — stops rendering <Phase2> and would unmount the
  // confirmation before it's seen. The server state is already correct, so the
  // next navigation or reload naturally reflects it.
  async function onSaveLater() {
    const r = await send('save-partial')
    if (r) { setDoneKind('toast'); setMode('done') }
  }
  async function onSave() {
    const r = await send('submit')
    if (!r) return
    track({ name: 'profile_step_completed', step: 10 + batch })
    if (batch === 3 && r.thankYou) setDoneKind(r.thankYou)
    else setDoneKind('toast')
    setMode('done')
  }

  // ---- invitation / manual entry ------------------------------------------
  if (mode === 'invite') {
    if (variant === 'manual') {
      return (
        <section aria-label="A little more about you" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          style={{ border: '1px solid var(--line)' }}>
          <div>
            <p className="mf-d text-[19px]">A little more about you</p>
            <p className="mt-1 text-[14px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
              Three short optional batches help us recommend better and understand the community. Continue whenever you like, even if automatic invitations have stopped.
            </p>
          </div>
          <button type="button" onClick={() => setMode('form')} className="mf-btn whitespace-nowrap">Continue</button>
        </section>
      )
    }
    return (
      <section aria-label="A short optional survey" className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        style={{ border: '1px solid var(--line)', background: 'var(--sage-mist)' }}>
        <div>
          <p className="mf-d text-[19px]">Help us make Ona Funds more useful to you.</p>
          <p className="mt-1 text-[14px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
            Now that you’ve spent some time with Ona Funds, tell us a little more about what you need. These questions are optional, and you can answer them later.
          </p>
        </div>
        <div className="flex flex-none items-center gap-4">
          <button type="button" onClick={onDismiss} disabled={!!busy} className="text-[14px] font-bold underline underline-offset-4 disabled:opacity-60" style={{ color: 'var(--graphite)' }}>Not now</button>
          <button type="button" onClick={() => { track({ name: 'profile_invite_click', entry_point: `batch${batch}_open` }); setMode('form') }} className="mf-btn whitespace-nowrap">Answer a few questions</button>
        </div>
      </section>
    )
  }

  // ---- done states ---------------------------------------------------------
  if (mode === 'done') {
    if (doneKind === 'full' || doneKind === 'neutral') {
      return (
        <section className="mb-6 p-7 sm:p-9" style={{ border: '1px solid var(--ink)', background: 'var(--sage-mist)' }}>
          {doneKind === 'full' ? (
            <>
              <h2 className="mf-d text-[26px] sm:text-[30px]">Thank you for helping shape Ona Funds.</h2>
              <p className="mt-3 max-w-2xl text-[16px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                What you’ve shared helps us understand your work, the support you’re looking for and the barriers you face.
              </p>
              <p className="mt-3 max-w-2xl text-[16px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                Your answers will help us improve opportunity recommendations and build a clearer picture of what this community needs, so our conversations with funders reflect the experiences of the people using Ona Funds.
              </p>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
                Your individual profile stays private. Any findings shared with funders will be grouped and will not identify you.
              </p>
            </>
          ) : (
            <>
              <h2 className="mf-d text-[26px] sm:text-[30px]">You’re all set.</h2>
              <p className="mt-3 text-[16px] leading-relaxed" style={{ color: 'var(--ink)' }}>You can add more details to your profile anytime.</p>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3.5">
            <Link href="/profile" className="mf-btn">Back to My Funding</Link>
            {doneKind === 'full' && <Link href="/profile" className="mf-btn-outline">Review my answers</Link>}
          </div>
        </section>
      )
    }
    return (
      <section role="status" className="mb-6 flex items-center gap-3 p-4" style={{ border: '1px solid var(--sage-deep)', background: 'var(--sage-mist)', color: 'var(--ink)' }}>
        <span aria-hidden="true" style={{ color: 'var(--sage-deep)', fontWeight: 900 }}>✓</span>
        <p className="text-[15px]">Thank you — your answers have been saved.</p>
      </section>
    )
  }

  // ---- the batch form ------------------------------------------------------
  return (
    <section aria-label={`A little more about you, batch ${batch} of 3`} className="mb-6 p-6 sm:p-9" style={{ border: '1px solid var(--ink)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="mf-lbl">A little more about you · Batch {batch} of 3 · {BATCH_TITLE[batch]}</span>
        <button type="button" onClick={onSaveLater} disabled={!!busy} className="text-[14px] font-bold underline underline-offset-4 disabled:opacity-60" style={{ color: 'var(--accent-deep)' }}>
          {busy === 'later' ? 'Saving…' : 'Save and finish later'}
        </button>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>{BATCH_INTRO[batch]}</p>

      <div className="mt-7 flex flex-col gap-9">
        {batch === 1 && <Batch1 ans={ans} setSingle={setSingle} toggleMulti={toggleMulti} />}
        {batch === 2 && <Batch2 ans={ans} setSingle={setSingle} toggleMulti={toggleMulti} setText={setText} />}
        {batch === 3 && <Batch3 ans={ans} applicantType={applicantType} setSingle={setSingle} toggleMulti={toggleMulti} setText={setText} addCountry={addCountry} removeCountry={removeCountry} togglePreferNot={togglePreferNot} />}
      </div>

      {error && <p role="alert" className="mt-6 p-3 text-[14px]" style={{ border: '1.5px solid var(--accent-deep)', background: 'var(--sage-mist)', color: 'var(--ink)' }}>{error}</p>}

      <div className="mt-8 flex items-center justify-end border-t border-[var(--line)] pt-6">
        <button type="button" onClick={onSave} disabled={!!busy} className="mf-btn disabled:opacity-60">
          {busy === 'save' ? 'Saving…' : batch === 3 ? 'Finish' : 'Save this batch'}
        </button>
      </div>
    </section>
  )
}

// --- shared question scaffold ------------------------------------------------
function Question({ title, help, count, children }: { title: string; help?: string; count?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="mf-d text-[20px] sm:text-[22px]">{title}</h3>
        {count}
      </div>
      {help && <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>{help}</p>}
      <div className="mt-1 flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

type Helpers = {
  ans: Phase2Answers
  setSingle: (k: keyof Phase2Answers, id: string) => void
  toggleMulti: (k: keyof Phase2Answers, id: string, exclusive: Set<string>, max?: number) => void
  setText?: (k: keyof Phase2Answers, v: string) => void
}

function Radios({ options, value, onPick }: { options: Option[]; value: string | null; onPick: (id: string) => void }) {
  return <>{options.map((o) => <ChoiceOption key={o.id} name={`q-${o.id}`} label={o.label} selected={value === o.id} onChange={() => onPick(o.id)} />)}</>
}
function Checks({ options, selected, exclusive, onToggle }: { options: Option[]; selected: string[]; exclusive: Set<string>; onToggle: (id: string) => void }) {
  return <>{options.map((o) => (
    <ChoiceOption key={o.id} multi label={o.label} desc={exclusive.has(o.id) ? 'Exclusive of the other answers.' : undefined}
      selected={selected.includes(o.id)} onChange={() => onToggle(o.id)} />
  ))}</>
}

function Batch1({ ans, setSingle, toggleMulti }: Helpers) {
  return (
    <>
      <Question title="What would you most like support to help you do over the next 12 months?" count={<SelectCount selected={ans.goals.length} max={3} />}>
        <Checks options={GOALS} selected={ans.goals} exclusive={new Set([GOALS_EXCLUSIVE])} onToggle={(id) => toggleMulti('goals', id, new Set([GOALS_EXCLUSIVE]), 3)} />
      </Question>
      <Question title="How soon are you hoping to find an opportunity?" help="Choose one.">
        <Radios options={TIMEFRAMES} value={ans.timeframe} onPick={(id) => setSingle('timeframe', id)} />
      </Question>
      <Question title="Where would you be willing to take part in an opportunity?" help="Select all that apply.">
        <Checks options={WILLING_LOCATIONS} selected={ans.willing_locations} exclusive={new Set([WILLING_LOCATIONS_EXCLUSIVE])} onToggle={(id) => toggleMulti('willing_locations', id, new Set([WILLING_LOCATIONS_EXCLUSIVE]))} />
      </Question>
    </>
  )
}

function Batch2({ ans, setSingle, toggleMulti, setText }: Helpers) {
  return (
    <>
      <Question title="In the past 12 months, approximately how many funding or support opportunities have you applied for?" help="If answering for an organisation, include its applications. Choose one.">
        <Radios options={APPLICATIONS_COUNTS} value={ans.applications_count} onPick={(id) => setSingle('applications_count', id)} />
      </Question>
      <Question title="Have you previously received funding or support through an application or competition?" help="Select all that apply.">
        <Checks options={PRIOR_SUPPORT} selected={ans.prior_support} exclusive={PRIOR_SUPPORT_EXCLUSIVE} onToggle={(id) => toggleMulti('prior_support', id, PRIOR_SUPPORT_EXCLUSIVE)} />
      </Question>
      <Question title="What most often makes it difficult to pursue an opportunity?" count={<SelectCount selected={ans.barriers.length} max={3} />}>
        <Checks options={BARRIERS} selected={ans.barriers} exclusive={new Set([BARRIERS_EXCLUSIVE])} onToggle={(id) => toggleMulti('barriers', id, new Set([BARRIERS_EXCLUSIVE]), 3)} />
        {ans.barriers.includes('other') && (
          <div className="mt-1 flex flex-col gap-2.5 pl-[18px]" style={{ borderLeft: '3px solid var(--accent)' }}>
            <label htmlFor="barriers-other" className="mf-lbl">Something else — please specify</label>
            <input id="barriers-other" className="mf-fld" value={ans.barriers_other ?? ''} onChange={(e) => setText!('barriers_other', e.target.value)} />
          </div>
        )}
      </Question>
    </>
  )
}

function Batch3({
  ans, applicantType, setSingle, toggleMulti, setText, addCountry, removeCountry, togglePreferNot,
}: Helpers & {
  applicantType: string | null
  addCountry: (k: 'citizenship' | 'registered_in' | 'members_based_in', code: string) => void
  removeCountry: (k: 'citizenship' | 'registered_in' | 'members_based_in', code: string) => void
  togglePreferNot: () => void
}) {
  // The location question has three distinct meanings by applicant type.
  const isOrg = applicantType ? ORG_APPLICANT_TYPES.has(applicantType) : false
  const isCollective = applicantType === 'collective'
  const locKey: 'citizenship' | 'registered_in' | 'members_based_in' = isOrg ? 'registered_in' : isCollective ? 'members_based_in' : 'citizenship'
  const locTitle = isOrg
    ? 'In which country or countries is your organisation or business registered?'
    : isCollective
      ? 'In which country or countries are your members based?'
      : 'Which country or countries are you a citizen of?'
  const locHelp = locKey === 'citizenship'
    ? 'Some opportunities use citizenship as an eligibility requirement. Select all that apply, or skip this question. We keep citizenship separate from where you are based.'
    : 'Select all that apply, or skip this question. We keep this separate from where you are based.'

  return (
    <>
      <Question title={locTitle} help={locHelp}>
        <CountryChips selected={ans[locKey]} onAdd={(c) => addCountry(locKey, c)} onRemove={(c) => removeCountry(locKey, c)} disabled={locKey === 'citizenship' && ans.citizenship_prefer_not} />
        {locKey === 'citizenship' && (
          <ChoiceOption multi label="Prefer not to say." desc="Exclusive of any country selection."
            selected={ans.citizenship_prefer_not} onChange={togglePreferNot} />
        )}
      </Question>
      <Question title="When looking for financial support, what amount would usually be useful for your next project?" help="Choose one. Amounts below are in US dollars; an estimate is fine.">
        <Radios options={TYPICAL_AMOUNTS} value={ans.typical_amount} onPick={(id) => setSingle('typical_amount', id)} />
      </Question>
      <Question title="How well do the opportunities you’ve seen on Ona Funds fit what you’re looking for?" help="Choose one.">
        <Radios options={FIT_RATINGS} value={ans.fit_rating} onPick={(id) => setSingle('fit_rating', id)} />
      </Question>
      <Question title="What would make the opportunities more relevant to you?">
        <textarea className="mf-fld" rows={3} value={ans.fit_note ?? ''} onChange={(e) => setText!('fit_note', e.target.value)} placeholder="Optional" />
      </Question>
      <Question title="Which of these have you done after discovering an opportunity through Ona Funds?" help="Select all that apply. These are self-reported actions, not verified awards or proof that Ona Funds caused an outcome.">
        <Checks options={ACTIONS_TAKEN} selected={ans.actions_taken} exclusive={ACTIONS_TAKEN_EXCLUSIVE} onToggle={(id) => toggleMulti('actions_taken', id, ACTIONS_TAKEN_EXCLUSIVE)} />
      </Question>
    </>
  )
}

// --- a compact multi-country picker: a datalist to add, chips to remove ------
function CountryChips({ selected, onAdd, onRemove, disabled }: { selected: string[]; onAdd: (code: string) => void; onRemove: (code: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('')
  const NAME_TO_CODE = new Map(COUNTRIES_WORLD.map((c) => [c.name.toLowerCase(), c.code]))
  const commit = (v: string) => {
    const code = NAME_TO_CODE.get(v.trim().toLowerCase())
    if (code) { onAdd(code); setText('') }
  }
  return (
    <div className="flex flex-col gap-3">
      <input
        list="country-add-list" className="mf-fld max-w-sm" placeholder="Start typing a country…" value={text} disabled={disabled}
        onChange={(e) => { setText(e.target.value); const code = NAME_TO_CODE.get(e.target.value.trim().toLowerCase()); if (code) { onAdd(code); setText('') } }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(text) } }}
      />
      <datalist id="country-add-list">{COUNTRIES_WORLD.filter((c) => !selected.includes(c.code)).map((c) => <option key={c.code} value={c.name} />)}</datalist>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((code) => (
            <li key={code}>
              <button type="button" onClick={() => onRemove(code)} className="flex items-center gap-2 px-3 py-1.5 text-[14px]" style={{ border: '1px solid var(--ink)' }}>
                {COUNTRY_NAME_BY_CODE.get(code) ?? code}<span aria-hidden="true" style={{ color: 'var(--accent-deep)', fontWeight: 900 }}>×</span>
                <span className="sr-only">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
