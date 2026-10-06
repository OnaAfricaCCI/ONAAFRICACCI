'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import CountrySelect from '@/app/components/CountrySelect'
import { COUNTRY_NAME_BY_CODE } from '@/lib/countries'
import {
  APPLICANT_TYPES,
  ORG_APPLICANT_TYPES,
  DISCIPLINES,
  STAGES,
  SUPPORT_TYPES,
  LANGUAGES,
  labelFor,
  type Option,
} from '@/lib/profileTaxonomy'

export type WizardProfile = {
  country_code: string | null
  applicant_type: string | null
  organisation_name: string | null
  organisation_country: string | null
  disciplines: string[]
  stage: string | null
  support_types: string[]
  languages: string[]
}

const EMPTY: WizardProfile = {
  country_code: null, applicant_type: null, organisation_name: null, organisation_country: null,
  disciplines: [], stage: null, support_types: [], languages: [],
}

function resumeStep(p: WizardProfile): number {
  if (!p.country_code || !p.applicant_type) return 1
  if (p.disciplines.length === 0) return 2
  if (p.support_types.length === 0) return 3
  return 4
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
  const [step, setStep] = useState<number>(initial ? resumeStep(initial) : 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      track({ name: 'profile_setup_started', entry_point: entryPoint })
    }
  }, [entryPoint])

  useEffect(() => { headingRef.current?.focus() }, [step])

  const set = <K extends keyof WizardProfile>(key: K, value: WizardProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  const toggle = (key: 'disciplines' | 'support_types' | 'languages', id: string) =>
    setForm((f) => {
      const have = f[key].includes(id)
      return { ...f, [key]: have ? f[key].filter((x) => x !== id) : [...f[key], id] }
    })
  const isOrg = form.applicant_type ? ORG_APPLICANT_TYPES.has(form.applicant_type) : false

  async function saveDraft(): Promise<boolean> {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save-draft', ...form }),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError('We couldn’t save that just now. Your answers are still here — please try again.')
      return false
    } finally { setSaving(false) }
  }

  function stepValid(s: number): string | null {
    if (s === 1) {
      if (!form.country_code) return 'Please choose your country of residence.'
      if (!form.applicant_type) return 'Please choose who you’re applying as.'
    }
    if (s === 2 && form.disciplines.length === 0) return 'Please choose at least one discipline.'
    if (s === 3 && form.support_types.length === 0) return 'Please choose at least one support type.'
    return null
  }

  async function onContinue() {
    const invalid = stepValid(step)
    if (invalid) { setError(invalid); return }
    if (!(await saveDraft())) return
    track({ name: 'profile_step_completed', step })
    setStep((s) => s + 1)
  }
  async function onFinishLater() { await saveDraft(); router.push('/profile') }
  async function onComplete() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', ...form }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not save your profile.') }
      track(alreadyCompleted ? { name: 'profile_updated' } : { name: 'profile_completed' })
      router.push(alreadyCompleted ? '/profile?updated=1' : '/profile/ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Please try again.')
      setSaving(false)
    }
  }

  const pct = Math.round((step / 3) * 100)
  const stepEyebrow = step === 1 ? 'Step 1 of 3 · About you'
    : step === 2 ? 'Step 2 of 3 · Your work'
    : step === 3 ? 'Step 3 of 3 · Funding' : 'Nearly done'
  const stepHeading = step === 1 ? 'Tell us a little about you.'
    : step === 2 ? 'What do you make?'
    : step === 3 ? 'What are you looking for?' : 'Check your answers.'

  return (
    <main className="mx-auto max-w-[860px] px-5 py-10 sm:py-14">
      <div className="border border-[var(--ink)]">
        <div className="flex flex-col gap-7 px-7 py-9 sm:px-14 sm:py-11">
          {/* progress / eyebrow */}
          {step <= 3 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="mf-lbl">{stepEyebrow}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--graphite)' }}>{pct}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <span key={n} className="h-1.5" style={{ background: n <= step ? '#FF6A4D' : '#DCE3D5' }} />
                ))}
              </div>
            </div>
          ) : (
            <span className="mf-lbl">{stepEyebrow}</span>
          )}

          <h1 ref={headingRef} tabIndex={-1} className="mf-d text-[34px] outline-none sm:text-[40px]">{stepHeading}</h1>

          {suggestedFromFilters && step <= 3 && (
            <p className="p-3 text-[14px]" style={{ borderLeft: '3px solid #FF6A4D', background: 'rgba(255,201,184,.3)', color: 'var(--ink-2)' }}>
              We’ve suggested a few answers from the filters you were using. Please check they’re right
              before continuing — nothing is saved until you confirm.
            </p>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <CountrySelect label="Country of residence" value={form.country_code} onChange={(c) => set('country_code', c || null)} required />
                <span className="text-[13px]" style={{ color: 'var(--graphite)' }}>
                  We use this to surface calls open where you live, including diaspora-eligible ones.
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="mf-lbl">You are applying as</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {APPLICANT_TYPES.map((o) => (
                    <OptionBox key={o.id} option={o} selected={form.applicant_type === o.id} onSelect={() => set('applicant_type', o.id)} />
                  ))}
                </div>
              </div>
              {isOrg && (
                <div className="flex flex-col gap-4 border-l-2 border-[var(--line)] pl-5">
                  <p className="text-[13px]" style={{ color: 'var(--graphite)' }}>
                    Optional. Self-reported details, not proof of authority to represent an organisation.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="org-name" className="mf-lbl">Organisation name</label>
                    <input id="org-name" className="mf-fld max-w-sm" value={form.organisation_name ?? ''} onChange={(e) => set('organisation_name', e.target.value || null)} />
                  </div>
                  <CountrySelect label="Organisation’s country of registration" value={form.organisation_country} onChange={(c) => set('organisation_country', c || null)} />
                </div>
              )}
              <PrivacyBox />
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-7">
              <Group legend="Which creative disciplines do you work in?" hint="Choose all that apply.">
                <Chips options={DISCIPLINES} selected={form.disciplines} onToggle={(id) => toggle('disciplines', id)} />
              </Group>
              <Group legend="Where are you in your journey?" hint="Optional.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {STAGES.map((o) => (
                    <OptionBox key={o.id} option={o} selected={form.stage === o.id} onSelect={() => set('stage', o.id)} />
                  ))}
                </div>
              </Group>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-7">
              <Group legend="What kinds of funding are you looking for?" hint="Choose all that apply.">
                <Chips options={SUPPORT_TYPES} selected={form.support_types} onToggle={(id) => toggle('support_types', id)} />
              </Group>
              <Group legend="Preferred application languages" hint="Optional. Stored for your reference; it won’t change your recommendations yet.">
                <Chips options={LANGUAGES} selected={form.languages} onToggle={(id) => toggle('languages', id)} />
              </Group>
            </div>
          )}

          {/* STEP 4 — review */}
          {step === 4 && <ReviewList form={form} onEdit={(s) => setStep(s)} />}

          {error && (
            <p role="alert" className="p-3 text-[14px]" style={{ border: '1.5px solid var(--accent-active)', background: 'rgba(255,201,184,.4)', color: 'var(--ink)' }}>{error}</p>
          )}
          <p aria-live="polite" className="sr-only">{saving ? 'Saving' : ''}</p>

          {/* controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="mf-btn-outline">Back</button>
            ) : <span />}
            <div className="flex items-center" style={{ gap: '1.1rem' }}>
              <button type="button" onClick={onFinishLater} disabled={saving} className="text-[15px] font-bold underline underline-offset-4 disabled:opacity-60" style={{ color: 'var(--accent-deep)' }}>
                Finish later
              </button>
              {step <= 3 ? (
                <button type="button" onClick={onContinue} disabled={saving} className="mf-btn disabled:opacity-60">
                  {saving ? 'Saving…' : 'Continue'}
                </button>
              ) : (
                <button type="button" onClick={onComplete} disabled={saving} className="mf-btn disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save my profile'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-5 text-[13px]" style={{ color: 'var(--ink-soft)' }}>
        Your saved opportunities stay with your account whether or not you finish this.{' '}
        <Link href="/saved" className="underline underline-offset-2">View saved</Link>
      </p>
    </main>
  )
}

function PrivacyBox() {
  return (
    <div className="flex items-start gap-3 p-4" style={{ background: '#DCE3D5' }}>
      <svg viewBox="0 0 100 100" width="18" height="18" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}>
        <circle cx="50" cy="50" r="39" fill="none" stroke="#5F7359" strokeWidth="22" />
        <circle cx="50" cy="50" r="28" fill="#5F7359" />
      </svg>
      <p className="text-[14px] leading-relaxed" style={{ color: '#121412' }}>
        Your profile is private and only used to match you to opportunities. It is never shown to
        funders, and it is not a funding application. You can edit or delete it anytime.
      </p>
    </div>
  )
}

function Group({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mf-d p-0 text-[18px]" style={{ lineHeight: 1.15 }}>{legend}</legend>
      {hint && <p className="mt-1 text-[14px]" style={{ color: 'var(--graphite)' }}>{hint}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

function OptionBox({ option, selected, onSelect }: { option: Option; selected: boolean; onSelect: () => void }) {
  return (
    <label
      className="flex cursor-pointer items-center gap-3 px-4 py-3.5 text-[15px] font-semibold"
      style={
        selected
          ? { border: '1.5px solid var(--ink)', background: 'var(--ink)', color: 'var(--bg)' }
          : { border: '1.5px solid var(--ink)' }
      }
    >
      <input type="radio" name={option.id + '-grp'} checked={selected} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className="flex-none"
        style={
          selected
            ? { width: 16, height: 16, border: '2px solid var(--bg)', background: '#FF6A4D' }
            : { width: 16, height: 16, border: '2px solid var(--ink)' }
        }
      />
      {option.label}
    </label>
  )
}

function Chips({ options, selected, onToggle }: { options: Option[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const on = selected.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.id)}
            className="px-3.5 py-2.5 text-[14px] font-semibold"
            style={on ? { border: '1.5px solid var(--ink)', background: 'var(--ink)', color: 'var(--bg)' } : { border: '1.5px solid var(--ink)' }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ReviewList({ form, onEdit }: { form: WizardProfile; onEdit: (step: number) => void }) {
  const na = <span className="italic" style={{ color: '#8FA487' }}>Not provided</span>
  const names = (opts: Option[], ids: string[]) => (ids.length ? ids.map((id) => labelFor(opts, id)).join(', ') : null)
  const rows: { label: string; value: React.ReactNode; step: number }[] = [
    { label: 'Country', value: form.country_code ? COUNTRY_NAME_BY_CODE.get(form.country_code) : null, step: 1 },
    { label: 'Applying as', value: form.applicant_type ? labelFor(APPLICANT_TYPES, form.applicant_type) : null, step: 1 },
    { label: 'Organisation', value: form.organisation_name, step: 1 },
    { label: 'Disciplines', value: names(DISCIPLINES, form.disciplines), step: 2 },
    { label: 'Career stage', value: form.stage ? labelFor(STAGES, form.stage) : null, step: 2 },
    { label: 'Support needed', value: names(SUPPORT_TYPES, form.support_types), step: 3 },
    { label: 'Languages', value: names(LANGUAGES, form.languages), step: 3 },
  ]
  return (
    <div>
      <p className="mb-5 text-[16px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
        Here is what we will use to find funding for you. Change anything that is not right. Blanks are
        fine, they just mean fewer matches to start.
      </p>
      <div style={{ borderTop: '2px solid var(--ink)' }}>
        {rows.map((r) => (
          <div key={r.label} className="grid items-baseline gap-x-4 gap-y-1 py-[18px] sm:grid-cols-[200px_1fr_auto]" style={{ borderBottom: '1px solid #DCE3D5' }}>
            <span className="mf-lbl">{r.label}</span>
            <span className="text-[17px]">{r.value || na}</span>
            <button type="button" onClick={() => onEdit(r.step)} className="justify-self-start text-[14px] font-bold underline underline-offset-2 sm:justify-self-end" style={{ color: 'var(--accent-deep)' }}>
              Change<span className="sr-only"> {r.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
