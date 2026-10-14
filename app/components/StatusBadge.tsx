import { deriveStatus, frequencyText, type StatusInput } from '@/lib/opportunityStatus'

/** Fixed today for server render; the decay rules only need the date. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const TONE_STYLE: Record<string, React.CSSProperties> = {
  open: { background: 'var(--sage-deep, #5F7359)', color: '#F6F4EC', border: '1.5px solid var(--sage-deep, #5F7359)' },
  soon: { background: 'var(--sage-mist, #DCE3D5)', color: '#2b332a', border: '1.5px solid var(--sage, #8FA487)' },
  muted: { background: 'transparent', color: 'var(--ink-2, #3A3E39)', border: '1.5px solid var(--graphite, #4A5249)' },
  closed: { background: 'var(--graphite, #4A5249)', color: '#F6F4EC', border: '1.5px solid var(--graphite, #4A5249)' },
}

/**
 * The status badge + optional cadence. Presentational and server-safe, so the
 * grant page, the browse list and related lists all read identically.
 */
export default function StatusBadge({
  opportunity,
  frequency,
  frequencyDetail,
  size = 'md',
  showFrequency = true,
}: {
  opportunity: StatusInput
  frequency?: string | null
  frequencyDetail?: string | null
  size?: 'sm' | 'md'
  showFrequency?: boolean
}) {
  const view = deriveStatus(opportunity, todayISO())
  const freq = showFrequency ? frequencyText(frequency, frequencyDetail) : ''
  const pad = size === 'sm' ? '3px 8px' : '5px 11px'
  const fontSize = size === 'sm' ? 10.5 : 11.5
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className="inline-flex items-center font-bold uppercase"
        style={{ ...TONE_STYLE[view.tone], padding: pad, fontSize, letterSpacing: '0.06em', fontFamily: 'var(--font-display, inherit)' }}
      >
        {view.label}
      </span>
      {freq && (
        <span className="font-semibold uppercase tracking-[0.1em]" style={{ fontSize: fontSize - 1, color: 'var(--ink-soft, #6B7169)' }}>
          {freq}
        </span>
      )}
    </span>
  )
}

/** The one-line supporting text, or null. For the grant detail page. */
export function statusSupporting(opportunity: StatusInput): string | null {
  return deriveStatus(opportunity, todayISO()).supporting
}

const KEY_ITEMS: { label: string; tone: string; meaning: string }[] = [
  { label: 'Open for applications', tone: 'open', meaning: 'Apply now.' },
  { label: 'Opens on [date]', tone: 'soon', meaning: 'A future opening date is announced.' },
  { label: 'Awaiting next call', tone: 'muted', meaning: 'Closed between rounds; expected back.' },
  { label: 'Closed — future calls unconfirmed', tone: 'closed', meaning: 'Closed; return uncertain.' },
  { label: 'By invitation / nomination only', tone: 'muted', meaning: 'No open application.' },
  { label: 'Current window not confirmed', tone: 'muted', meaning: 'Check the funder’s site.' },
]

/** A short, on-brand explanation of the status labels, for near the filters. */
export function StatusKey() {
  return (
    <div className="border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">What the labels mean</p>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {KEY_ITEMS.map((it) => (
          <li key={it.label} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--ink-2)]">
            <span
              className="inline-flex items-center font-bold uppercase"
              style={{ ...TONE_STYLE[it.tone], padding: '3px 8px', fontSize: 10.5, letterSpacing: '0.06em', fontFamily: 'var(--font-display, inherit)' }}
            >
              {it.label}
            </span>
            <span>{it.meaning}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
