'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import PrivacyNotice from '@/app/components/PrivacyNotice'
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
  country_code: null,
  applicant_type: null,
  organisation_name: null,
  organisation_country: null,
  disciplines: [],
  stage: null,
  support_types: [],
  languages: [],
}

function resumeStep(p: WizardProfile): number {
  if (!p.country_code || !p.applicant_type) return 1
  if (p.disciplines.length === 0) return 2
  if (p.support_types.length === 0) return 3
  return 4
}

export default function SetupWizard({
  initial,
  suggestedFromFilters,
  entryPoint,
  alreadyCompleted = false,
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

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const set = <K extends keyof WizardProfile>(key: K, value: WizardProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggle = (key: 'disciplines' | 'support_types' | 'languages', id: string) =>
    setForm((f) => {
      const have = f[key].includes(id)
      return { ...f, [key]: have ? f[key].filter((x) => x !== id) : [...f[key], id] }
    })

  const isOrg = form.applicant_type ? ORG_APPLICANT_TYPES.has(form.applicant_type) : false

  async function saveDraft(): Promise<boolean> {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save-draft', ...form }),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError('We couldn’t save that just now. Your answers are still here — please try again.')
      return false
    } finally {
      setSaving(false)
    }
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
    if (invalid) {
      setError(invalid)
      return
    }
    if (!(await saveDraft())) return
    track({ name: 'profile_step_completed', step })
    setStep((s) => s + 1)
  }

  async function onFinishLater() {
    await saveDraft()
    router.push('/profile')
  }

  async function onComplete() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', ...form }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not save your profile.')
      }
      track(alreadyCompleted ? { name: 'profile_updated' } : { name: 'profile_completed' })
      router.push(alreadyCompleted ? '/profile?updated=1' : '/profile/ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Please try again.')
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">
        {step <= 3 ? `Step ${step} of 3` : 'Review'}
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-[1.1] outline-none sm:text-[44px]"
      >
        {step === 1 && 'About you'}
        {step === 2 && 'Your creative work'}
        {step === 3 && 'Funding preferences'}
        {step === 4 && 'Check your answers'}
      </h1>

      {step === 1 && <PrivacyNotice className="mt-6" />}
      {suggestedFromFilters && step <= 3 && (
        <p className="mt-6 border-l-2 border-[var(--accent)] bg-[var(--blush)]/30 p-3 text-sm text-[var(--ink-2)]">
          We’ve suggested a few answers from the filters you were using. Please check they’re right
          before continuing — nothing is saved to your profile until you confirm.
        </p>
      )}

      {/* progress bar */}
      {step <= 3 && (
        <div aria-hidden="true" className="mt-6 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 flex-1 ${n <= step ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} />
          ))}
        </div>
      )}

      <div className="mt-8">
        {step === 1 && (
          <div className="space-y-8">
            <CountrySelect
              label="Country of residence"
              value={form.country_code}
              onChange={(code) => set('country_code', code || null)}
              required
            />
            <Fieldset legend="Who are you applying as?" hint="The capacity you usually seek funding in.">
              {APPLICANT_TYPES.map((o) => (
                <Radio
                  key={o.id}
                  name="applicant_type"
                  option={o}
                  checked={form.applicant_type === o.id}
                  onChange={() => set('applicant_type', o.id)}
                />
              ))}
            </Fieldset>
            {isOrg && (
              <div className="space-y-5 border-l-2 border-[var(--line)] pl-5">
                <p className="text-sm text-[var(--ink-soft)]">
                  Optional. These are self-reported details, not proof of authority to represent an organisation.
                </p>
                <div>
                  <label htmlFor="org-name" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
                    Organisation name
                  </label>
                  <input
                    id="org-name"
                    value={form.organisation_name ?? ''}
                    onChange={(e) => set('organisation_name', e.target.value || null)}
                    className="control-h mt-1.5 w-full max-w-sm border-2 border-[var(--border-md)] bg-[var(--bg)] px-3 text-sm focus:border-[var(--ink)] focus:outline-none"
                  />
                </div>
                <CountrySelect
                  label="Organisation’s country of registration"
                  value={form.organisation_country}
                  onChange={(code) => set('organisation_country', code || null)}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <Fieldset legend="Which creative disciplines do you work in?" hint="Choose all that apply.">
              <Chips options={DISCIPLINES} selected={form.disciplines} onToggle={(id) => toggle('disciplines', id)} />
            </Fieldset>
            <Fieldset legend="Where are you in your journey? (optional)">
              <div className="flex flex-col gap-2">
                {STAGES.map((o) => (
                  <Radio key={o.id} name="stage" option={o} checked={form.stage === o.id} onChange={() => set('stage', o.id)} />
                ))}
              </div>
            </Fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <Fieldset legend="What kinds of funding are you looking for?" hint="Choose all that apply.">
              <Chips options={SUPPORT_TYPES} selected={form.support_types} onToggle={(id) => toggle('support_types', id)} />
            </Fieldset>
            <Fieldset
              legend="Preferred application languages (optional)"
              hint="Stored for your reference. We don’t yet have reliable language data on opportunities, so this won’t change your recommendations."
            >
              <Chips options={LANGUAGES} selected={form.languages} onToggle={(id) => toggle('languages', id)} />
            </Fieldset>
          </div>
        )}

        {step === 4 && (
          <ReviewList form={form} onEdit={(s) => setStep(s)} />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 border-2 border-[var(--terracotta)] bg-[var(--blush)]/40 p-3 text-sm text-[var(--ink)]">
          {error}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {saving ? 'Saving' : ''}
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-6">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]"
          >
            ← Back
          </button>
        )}
        {step <= 3 && (
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            onClick={onComplete}
            disabled={saving}
            className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save my profile'}
          </button>
        )}
        <button
          type="button"
          onClick={onFinishLater}
          disabled={saving}
          className="text-[13px] font-semibold text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)] disabled:opacity-60"
        >
          Finish later
        </button>
      </div>

      <p className="mt-6 text-xs text-[var(--ink-3)]">
        Your saved opportunities stay with your account whether or not you finish this.{' '}
        <Link href="/saved" className="underline underline-offset-2">
          View saved
        </Link>
      </p>
    </main>
  )
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-display)] text-lg leading-snug">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-[var(--ink-soft)]">{hint}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

function Radio({ name, option, checked, onChange }: { name: string; option: Option; checked: boolean; onChange: () => void }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 border-2 p-3 text-sm ${checked ? 'border-[var(--ink)] bg-[var(--sage-mist)]/50' : 'border-[var(--border-md)] hover:border-[var(--accent)]'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-[var(--terracotta)]" />
      {option.label}
    </label>
  )
}

function Chips({ options, selected, onToggle }: { options: Option[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.id)}
            className={`border-2 px-3 py-2 text-sm font-medium transition-colors ${on ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]' : 'border-[var(--border-md)] hover:border-[var(--accent)]'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ReviewList({ form, onEdit }: { form: WizardProfile; onEdit: (step: number) => void }) {
  const na = <span className="text-[var(--ink-3)]">Not provided</span>
  const names = (opts: Option[], ids: string[]) =>
    ids.length ? ids.map((id) => labelFor(opts, id)).join(', ') : null
  const rows: { label: string; value: React.ReactNode; step: number }[] = [
    { label: 'Country of residence', value: form.country_code ? COUNTRY_NAME_BY_CODE.get(form.country_code) : null, step: 1 },
    { label: 'Applying as', value: form.applicant_type ? labelFor(APPLICANT_TYPES, form.applicant_type) : null, step: 1 },
    { label: 'Organisation', value: form.organisation_name, step: 1 },
    { label: 'Organisation country', value: form.organisation_country ? COUNTRY_NAME_BY_CODE.get(form.organisation_country) : null, step: 1 },
    { label: 'Disciplines', value: names(DISCIPLINES, form.disciplines), step: 2 },
    { label: 'Stage', value: form.stage ? labelFor(STAGES, form.stage) : null, step: 2 },
    { label: 'Support types', value: names(SUPPORT_TYPES, form.support_types), step: 3 },
    { label: 'Languages', value: names(LANGUAGES, form.languages), step: 3 },
  ]
  return (
    <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_auto] gap-x-4 py-4 sm:grid-cols-[12rem_1fr_auto]">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">{r.label}</dt>
          <dd className="text-[15px]">{r.value || na}</dd>
          <button
            type="button"
            onClick={() => onEdit(r.step)}
            className="justify-self-end text-xs font-semibold uppercase tracking-[0.12em] text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
          >
            Change
            <span className="sr-only"> {r.label}</span>
          </button>
        </div>
      ))}
    </dl>
  )
}
