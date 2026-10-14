/**
 * Shared, on-brand controls for the My Funding profile flow (Phase 1 wizard and
 * the Phase 2 batches). These map the handoff's .opt / .mk / .odesc / progress
 * styles onto the existing design system (mf-* classes + brand tokens), so the
 * wizard and the batches look identical and stay theme-aware.
 */
import type { ReactNode } from 'react'

/** A single answer option — radio (single) or checkbox (multi). */
export function ChoiceOption({
  label, desc, selected, onChange, multi = false, name,
}: {
  label: string
  desc?: string
  selected: boolean
  onChange: () => void
  multi?: boolean
  name?: string
}) {
  return (
    <label className="mf-opt" data-sel={selected ? 'true' : undefined}>
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={name}
        checked={selected}
        onChange={onChange}
        className="sr-only"
      />
      <span className="mf-mk" data-round={multi ? undefined : 'true'} aria-hidden="true" />
      <span>
        {label}
        {desc && <span className="mf-odesc">{desc}</span>}
      </span>
    </label>
  )
}

/** The question-progress header: "Question N of M", a percentage, and a segmented bar. */
export function QuestionProgress({ index, total, optional }: { index: number; total: number; optional?: boolean }) {
  const pct = Math.round((index / total) * 100)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="mf-lbl">Question {index} of {total}{optional ? ' · Optional' : ''}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--graphite)' }}>{pct}%</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))` }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1.5" style={{ background: i < index ? 'var(--accent)' : 'var(--sage-mist)' }} />
        ))}
      </div>
    </div>
  )
}

/** A selection counter, e.g. "2 selected" or "Up to 3 · 2 selected". */
export function SelectCount({ selected, max }: { selected: number; max?: number }) {
  return (
    <span className="text-[12px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--sage-deep)' }}>
      {max ? `Up to ${max} · ` : ''}{selected} selected
    </span>
  )
}

/** The muted-green privacy note with the Ona ring mark. */
export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4" style={{ background: 'var(--sage-mist)' }}>
      <svg viewBox="0 0 100 100" width="18" height="18" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}>
        <circle cx="50" cy="50" r="39" fill="none" stroke="var(--sage-deep)" strokeWidth="22" />
        <circle cx="50" cy="50" r="28" fill="var(--sage-deep)" />
      </svg>
      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}>{children}</p>
    </div>
  )
}

/** A conditional sub-question with the coral left rule (e.g. "Another area"). */
export function Conditional({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 pl-[18px]" style={{ borderLeft: '3px solid var(--accent)' }}>
      {children}
    </div>
  )
}
