'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import CountrySelect from '@/app/components/CountrySelect'
import { COUNTRY_NAME_BY_CODE } from '@/lib/countries'
import {
  APPLICANT_TYPES, CAREER_STAGE_APPLICANT_TYPES,
  DISCIPLINES, STAGES, SUPPORT_TYPES,
  labelFor, type Option,
} from '@/lib/profileTaxonomy'
import { ChoiceOption, QuestionProgress, SelectCount, PrivacyNote, Conditional } from '@/app/components/ProfileControls'

export type WizardProfile = {
  country_code: string | null
  applicant_type: string | null
  organisation_name: string | null
  disciplines: string[]
  disciplines_other: string | null
  stage: string | null
  support_types: string[]
  open_to_all: boolean
}

const EMPTY: WizardProfile = {
  country_code: null, applicant_type: null, organisation_name: null,
  disciplines: [], disciplines_other: null, stage: null, support_types: [], open_to_all: false,
}

/** Applicant types for which an optional organisation/collective name is asked (Q2). */
const NAME_TYPES = new Set(['collective', 'nonprofit', 'business'])

type StepKey = 'intro' | 'based' | 'type' | 'areas' | 'stage' | 'interests' | 'review'

/**
 * The ordered flow for the current applicant type. The career-stage question is
 * for individuals only — but until a type is chosen we assume it's present, so
 * the counter reads "of 5" from the start (the common path) and only drops to
 * "of 4" if a non-individual type is picked, rather than jumping up to 5.
 */
function flowFor(p: WizardProfile): StepKey[] {
  const includeStage = p.applicant_type === null || CAREER_STAGE_APPLICANT_TYPES.has(p.applicant_type)
  return ['intro', 'based', 'type', 'areas', ...(includeStage ? (['stage'] as StepKey[]) : []), 'interests', 'review']
}
/** The question steps only (for "Question N of M"). */
const questionsOf = (flow: StepKey[]): StepKey[] => flow.filter((s) => s !== 'intro' && s !== 'review')

function resumeStep(p: WizardProfile): StepKey {
  if (!p.country_code) return 'based'
  if (!p.applicant_type) return 'type'
  if (p.disciplines.length === 0 && !p.disciplines_other) return 'areas'
  if (p.support_types.length === 0 && !p.open_to_all) return 'interests'
  return 'review'
}

export default function SetupWizard({
  initial, suggestedFromFilters, entryPoint, alreadyCompleted = false,
}: {
  initial: WizardProfile | null
  suggestedFromFilters: boolean
  entryPoint: string
  alreadyCompleted?: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<WizardProfile>(initial ?? EMPTY)
  const [stepKey, setStepKey] = useState<StepKey>(initial ? resumeStep(initial) : 'intro')
  const [anotherOpen, setAnotherOpen] = useState<boolean>(!!initial?.disciplines_other)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; track({ name: 'profile_setup_started', entry_point: entryPoint }) }
  }, [entryPoint])
  useEffect(() => { headingRef.current?.focus() }, [stepKey])

  const flow = flowFor(form)
  const questions = questionsOf(flow)
  const qIndex = questions.indexOf(stepKey) // -1 for intro/review
  const set = <K extends keyof WizardProfile>(key: K, value: WizardProfile[K]) => setForm((f) => ({ ...f, [key]: value }))
  const toggleDiscipline = (id: string) =>
    setForm((f) => ({ ...f, disciplines: f.disciplines.includes(id) ? f.disciplines.filter((x) => x !== id) : [...f.disciplines, id] }))
  const toggleSupport = (id: string) =>
    setForm((f) => ({ ...f, open_to_all: false, support_types: f.support_types.includes(id) ? f.support_types.filter((x) => x !== id) : [...f.support_types, id] }))
  const isIndividual = form.applicant_type ? CAREER_STAGE_APPLICANT_TYPES.has(form.applicant_type) : false

  const payload = () => ({
    country_code: form.country_code,
    applicant_type: form.applicant_type,
    organisation_name: NAME_TYPES.has(form.applicant_type ?? '') ? form.organisation_name : null,
    disciplines: form.disciplines,
    disciplines_other: anotherOpen ? form.disciplines_other : null,
    stage: isIndividual ? form.stage : null,
    support_types: form.open_to_all ? [] : form.support_types,
    open_to_all: form.open_to_all,
  })

  async function saveDraft(): Promise<boolean> {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save-draft', ...payload() }),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError('We couldn’t save that just now. Your answers are still here — please try again.')
      return false
    } finally { setSaving(false) }
  }

  function stepValid(s: StepKey): string | null {
    if (s === 'based' && !form.country_code) return 'Please choose where you’re currently based.'
    if (s === 'type' && !form.applicant_type) return 'Please choose who would usually apply.'
    if (s === 'areas') {
      if (anotherOpen && !(form.disciplines_other ?? '').trim()) return 'Please describe your “Another area”, or unselect it.'
      if (form.disciplines.length === 0 && !(form.disciplines_other ?? '').trim()) return 'Please choose at least one area.'
    }
    if (s === 'interests' && form.support_types.length === 0 && !form.open_to_all) return 'Please choose at least one kind of opportunity.'
    return null
  }

  function goNext() { setStepKey(flow[Math.min(flow.indexOf(stepKey) + 1, flow.length - 1)]) }
  function goBack() { setStepKey(flow[Math.max(flow.indexOf(stepKey) - 1, 0)]) }

  async function onContinue() {
    const invalid = stepValid(stepKey)
    if (invalid) { setError(invalid); return }
    if (stepKey !== 'intro' && !(await saveDraft())) return
    if (qIndex >= 0) track({ name: 'profile_step_completed', step: qIndex + 1 })
    goNext()
  }
  async function onFinishLater() { await saveDraft(); router.push('/profile') }
  async function onComplete() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', ...payload() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not save your profile.') }
      track(alreadyCompleted ? { name: 'profile_updated' } : { name: 'profile_completed' })
      router.push(alreadyCompleted ? '/profile?updated=1' : '/profile/ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Please try again.')
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-[860px] px-5 py-10 sm:py-14">
      <div className="border border-[var(--ink)]">
        <div className="flex flex-col gap-7 px-7 py-9 sm:px-14 sm:py-11">

          {/* ---- INTRO ---- */}
          {stepKey === 'intro' && (
            <>
              <span className="mf-lbl">Set up your profile</span>
              <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[34px] outline-none sm:text-[44px]">Tell us about your work.</h1>
              <p className="max-w-xl text-[17px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
                A few quick questions to help us suggest relevant opportunities. You can update your answers anytime.
              </p>
              <PrivacyNote>
                Your profile is private and never shown to funders. It is not a funding application, and answering never affects your eligibility.
              </PrivacyNote>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
                <Link href="/grants" className="text-[15px] font-bold underline underline-offset-4" style={{ color: 'var(--accent-deep)' }}>Skip for now</Link>
                <button type="button" onClick={() => setStepKey('based')} className="mf-btn">Start</button>
              </div>
            </>
          )}

          {/* ---- QUESTION HEADER (progress) ---- */}
          {qIndex >= 0 && (
            <QuestionProgress index={qIndex + 1} total={questions.length} optional={stepKey === 'stage'} />
          )}

          {suggestedFromFilters && qIndex >= 0 && (
            <p className="p-3 text-[14px]" style={{ borderLeft: '3px solid var(--accent)', background: 'var(--sage-mist)', color: 'var(--ink)' }}>
              We’ve suggested a few answers from the filters you were using. Please check they’re right before continuing — nothing is saved until you confirm.
            </p>
          )}

          {/* ---- Q1 · BASED IN ---- */}
          {stepKey === 'based' && (
            <>
              <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[30px] outline-none sm:text-[36px]">Where are you currently based?</h1>
              <div className="flex flex-col gap-2">
                <CountrySelect label="Country" value={form.country_code} onChange={(c) => set('country_code', c || null)} required />
                <p className="text-[13px]" style={{ color: 'var(--graphite)' }}>
                  Where you live now. We keep this separate from citizenship and registration country, which we may ask about later.
                </p>
              </div>
            </>
          )}

          {/* ---- Q2 · APPLICANT TYPE ---- */}
          {stepKey === 'type' && (
            <>
              <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[30px] outline-none sm:text-[36px]">Who would usually apply for these opportunities?</h1>
              <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>Choose the best fit for now.</p>
              <div className="flex flex-col gap-3">
                {APPLICANT_TYPES.map((o) => (
                  <ChoiceOption key={o.id} name="applicant-type" label={o.label} selected={form.applicant_type === o.id} onChange={() => set('applicant_type', o.id)} />
                ))}
              </div>
              {NAME_TYPES.has(form.applicant_type ?? '') && (
                <Conditional>
                  <label htmlFor="org-name" className="mf-lbl">What is its name? <span style={{ color: 'var(--sage)', fontWeight: 700 }}>· Optional</span></label>
                  <input id="org-name" className="mf-fld" placeholder="Organisation, business or collective name"
                    value={form.organisation_name ?? ''} onChange={(e) => set('organisation_name', e.target.value || null)} />
                </Conditional>
              )}
            </>
          )}

          {/* ---- Q3 · CREATIVE AREAS ---- */}
          {stepKey === 'areas' && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[30px] outline-none sm:text-[36px]">Which creative or cultural areas do you work in?</h1>
                <SelectCount selected={form.disciplines.length + (anotherOpen ? 1 : 0)} />
              </div>
              <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>Select all that apply.</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {DISCIPLINES.map((o) => (
                  <ChoiceOption key={o.id} multi label={o.label} selected={form.disciplines.includes(o.id)} onChange={() => toggleDiscipline(o.id)} />
                ))}
                <ChoiceOption multi label="Another area" selected={anotherOpen}
                  onChange={() => { const next = !anotherOpen; setAnotherOpen(next); if (!next) set('disciplines_other', null) }} />
              </div>
              {anotherOpen && (
                <Conditional>
                  <label htmlFor="another-area" className="mf-lbl">Another area — please specify</label>
                  <input id="another-area" className="mf-fld" placeholder="Tell us the area in your own words"
                    value={form.disciplines_other ?? ''} onChange={(e) => set('disciplines_other', e.target.value || null)} />
                </Conditional>
              )}
            </>
          )}

          {/* ---- Q4 · CAREER STAGE (individuals only, optional) ---- */}
          {stepKey === 'stage' && (
            <>
              <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[30px] outline-none sm:text-[36px]">Which best describes where you are in your creative work?</h1>
              <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>Choose one. This helps us understand your needs; it does not determine your eligibility.</p>
              <div className="flex flex-col gap-3">
                {STAGES.map((o) => (
                  <ChoiceOption key={o.id} name="stage" label={o.label} selected={form.stage === o.id} onChange={() => set('stage', o.id)} />
                ))}
              </div>
            </>
          )}

          {/* ---- Q5 · OPPORTUNITY INTERESTS ---- */}
          {stepKey === 'interests' && (
            <>
              <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[30px] outline-none sm:text-[36px]">What kinds of opportunities would you like to see?</h1>
              <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>Select all that interest you.</p>
              <div className="flex flex-col gap-2.5">
                {SUPPORT_TYPES.map((o) => (
                  <ChoiceOption key={o.id} multi label={o.label} desc={o.desc} selected={form.support_types.includes(o.id)} onChange={() => toggleSupport(o.id)} />
                ))}
                <ChoiceOption multi label="I’m open to different kinds of opportunities."
                  selected={form.open_to_all}
                  onChange={() => setForm((f) => ({ ...f, open_to_all: !f.open_to_all, support_types: [] }))} />
              </div>
            </>
          )}

          {/* ---- REVIEW ---- */}
          {stepKey === 'review' && <ReviewList form={form} anotherOpen={anotherOpen} isIndividual={isIndividual} onEdit={(s) => setStepKey(s)} />}

          {error && (
            <p role="alert" className="p-3 text-[14px]" style={{ border: '1.5px solid var(--accent-deep)', background: 'var(--sage-mist)', color: 'var(--ink)' }}>{error}</p>
          )}
          <p aria-live="polite" className="sr-only">{saving ? 'Saving' : ''}</p>

          {/* ---- CONTROLS (not on intro) ---- */}
          {stepKey !== 'intro' && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
              <button type="button" onClick={goBack} className="mf-btn-outline">Back</button>
              <div className="flex items-center" style={{ gap: '1.1rem' }}>
                <button type="button" onClick={stepKey === 'stage' ? goNext : onFinishLater} disabled={saving} className="text-[15px] font-bold underline underline-offset-4 disabled:opacity-60" style={{ color: 'var(--accent-deep)' }}>
                  {stepKey === 'stage' ? 'Skip' : 'Finish later'}
                </button>
                {stepKey === 'review' ? (
                  <button type="button" onClick={onComplete} disabled={saving} className="mf-btn disabled:opacity-60">{saving ? 'Saving…' : 'Save my profile'}</button>
                ) : (
                  <button type="button" onClick={onContinue} disabled={saving} className="mf-btn disabled:opacity-60">{saving ? 'Saving…' : 'Continue'}</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-5 text-[13px]" style={{ color: 'var(--ink-soft)' }}>
        Your saved opportunities stay with your account whether or not you finish this.{' '}
        <Link href="/saved" className="underline underline-offset-2">View saved</Link>
      </p>
    </main>
  )
}

function ReviewList({ form, anotherOpen, isIndividual, onEdit }: { form: WizardProfile; anotherOpen: boolean; isIndividual: boolean; onEdit: (step: StepKey) => void }) {
  const na = <span className="italic" style={{ color: 'var(--sage)' }}>Not provided</span>
  const names = (opts: Option[], ids: string[]) => (ids.length ? ids.map((id) => labelFor(opts, id)).join('; ') : '')

  const areas = [names(DISCIPLINES, form.disciplines), anotherOpen && form.disciplines_other ? `Another: ${form.disciplines_other}` : '']
    .filter(Boolean).join('; ')
  const applyingAs = form.applicant_type
    ? [labelFor(APPLICANT_TYPES, form.applicant_type), NAME_TYPES.has(form.applicant_type) ? form.organisation_name : null].filter(Boolean).join(' · ')
    : ''
  const interests = form.open_to_all ? 'Open to different kinds of opportunities' : names(SUPPORT_TYPES, form.support_types)

  const rows: { label: string; value: React.ReactNode; step?: StepKey }[] = [
    { label: 'Based in', value: form.country_code ? COUNTRY_NAME_BY_CODE.get(form.country_code) : null, step: 'based' },
    { label: 'Applying as', value: applyingAs || null, step: 'type' },
    { label: 'Creative areas', value: areas || null, step: 'areas' },
    isIndividual
      ? { label: 'Career stage', value: form.stage ? labelFor(STAGES, form.stage) : null, step: 'stage' }
      : { label: 'Career stage', value: <span className="italic" style={{ color: 'var(--sage)' }}>Not shown for {applyingAs.split(' · ')[0].toLowerCase() || 'this applicant type'}</span> },
    { label: 'Opportunity interests', value: interests || null, step: 'interests' },
  ]

  return (
    <div>
      <span className="mf-lbl">Nearly done</span>
      <h1 className="mf-d mt-3 text-[32px] sm:text-[40px]">Check your answers.</h1>
      <p className="mb-5 mt-3 text-[16px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
        Here is what we will use to suggest opportunities for you. Change anything that is not right. Blanks are fine — they just mean fewer matches to start.
      </p>
      <div style={{ borderTop: '2px solid var(--ink)' }}>
        {rows.map((r) => (
          <div key={r.label} className="grid items-baseline gap-x-4 gap-y-1 py-[18px] sm:grid-cols-[200px_1fr_auto]" style={{ borderBottom: '1px solid var(--sage-mist)' }}>
            <span className="mf-lbl">{r.label}</span>
            <span className="text-[17px]">{r.value || na}</span>
            {r.step ? (
              <button type="button" onClick={() => onEdit(r.step!)} className="justify-self-start text-[14px] font-bold underline underline-offset-2 sm:justify-self-end" style={{ color: 'var(--accent-deep)' }}>
                Change<span className="sr-only"> {r.label}</span>
              </button>
            ) : <span />}
          </div>
        ))}
      </div>
      <div className="mt-6">
        <PrivacyNote>
          Saving your profile is not a funding application and does not guarantee eligibility. Your profile stays private and is never shown to funders.
        </PrivacyNote>
      </div>
    </div>
  )
}
