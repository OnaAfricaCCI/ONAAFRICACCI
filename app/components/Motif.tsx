/**
 * The Ona motif, in its three static expressions.
 *
 * Everything is built from the logo's ring at the same 22% stroke ratio, which
 * is what makes it belong to Ona rather than to any grid of circles. Rings are
 * never thin outlines and never dots.
 *
 * The rules the guidelines set, enforced here:
 *   - One coral ring per motif. The filled ring is always singular.
 *   - One motif per layout. The Find and Aperture never appear together.
 *   - Never behind body text. Motif and paragraphs sit side by side.
 *
 * These are drawn in SVG rather than shipped as images, so they scale, follow
 * the theme, cost nothing to download and belong to us outright.
 */

/**
 * The Find — the primary expression.
 *
 * A field of rings with exactly one filled. Out of hundreds of opportunities,
 * the one that fits you. That is the product in a single picture.
 */
export function TheFind({
  tone = 'ink',
  className = '',
  /** Where the coral ring sits in the grid, counted in cells. */
  coral = { col: 1, row: 4 },
  cols = 3,
  rows = 7,
}: {
  tone?: 'ink' | 'ivory'
  className?: string
  coral?: { col: number; row: number }
  cols?: number
  rows?: number
}) {
  // SVG pattern ids must be unique in the document and identical between the
  // server render and the client. Deriving the id from the props satisfies
  // both: two motifs can only share an id when they draw the same thing.
  const id = `find-${tone}-${cols}x${rows}-${coral.col}-${coral.row}`
  const pitch = 28
  const stroke = tone === 'ivory' ? '#f6f4ec' : 'var(--ink)'
  const w = cols * pitch
  const h = rows * pitch

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r="8.9" fill="none" stroke={stroke} strokeWidth="2.2" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
      <circle
        cx={coral.col * pitch + pitch / 2}
        cy={coral.row * pitch + pitch / 2}
        r="7.8"
        fill="var(--accent)"
      />
    </svg>
  )
}

/**
 * The Find, as a full-width strip.
 *
 * Used beside a count. The coral ring is placed inside the first 540px so it
 * is visible on a phone as well as a desktop.
 */
export function FindStrip({ tone = 'ink', className = '' }: { tone?: 'ink' | 'ivory'; className?: string }) {
  const id = `find-strip-${tone}`
  const stroke = tone === 'ivory' ? '#f6f4ec' : 'var(--ink)'
  return (
    <svg className={className} aria-hidden="true" focusable="false" preserveAspectRatio="xMinYMid slice">
      <defs>
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="14" cy="14" r="8.9" fill="none" stroke={stroke} strokeWidth="2.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <circle cx="294" cy="28" r="7.8" fill="var(--accent)" />
    </svg>
  )
}

/**
 * Sightline — the system expression.
 *
 * A measured rule with the eye sitting on a point in time. The thick segment
 * runs from the start to where the deadline falls, so the distance left to run
 * is legible at a glance.
 *
 * `progress` is 0 to 1. A grant with no deadline gets no sightline at all:
 * drawing one would imply a date we do not have.
 */
export function Sightline({
  progress,
  className = '',
  label = 'Time until the deadline',
}: {
  progress: number
  className?: string
  label?: string
}) {
  const clamped = Math.max(0.04, Math.min(1, progress))
  const x = 6 + clamped * 288
  return (
    <svg viewBox="0 0 300 40" className={className} role="img" aria-label={label}>
      <line x1="2" y1="24" x2="298" y2="24" stroke="var(--ink)" strokeWidth="2" />
      <line x1="2" y1="24" x2={x} y2="24" stroke="var(--ink)" strokeWidth="5" />
      <circle cx={x} cy="24" r="9.8" fill="none" stroke="var(--ink)" strokeWidth="2.4" />
      <circle cx={x} cy="24" r="8.6" fill="var(--accent)" />
    </svg>
  )
}

/**
 * Sightline as a section rule.
 *
 * The guidelines name section dividers as one of Sightline's jobs, so a
 * masthead can end on the eye rather than on a plain border. No viewBox here:
 * the line stretches to the container while the ring keeps its true size, which
 * a viewBox would squash.
 */
export function SightlineRule({
  className = '',
  /** How far from the left the eye sits, in pixels. */
  at = 240,
}: {
  className?: string
  at?: number
}) {
  return (
    <svg className={className} height="28" width="100%" aria-hidden="true" focusable="false">
      <line x1="0" y1="14" x2="100%" y2="14" stroke="var(--border-md)" strokeWidth="2" />
      <line x1="0" y1="14" x2={at} y2="14" stroke="var(--ink)" strokeWidth="5" />
      <circle cx={at} cy="14" r="9.8" fill="none" stroke="var(--ink)" strokeWidth="2.4" />
      <circle cx={at} cy="14" r="8.6" fill="var(--accent)" />
    </svg>
  )
}

/**
 * Aperture — the campaign expression.
 *
 * The ring enlarged past the page edge. Used on sage or ink as a bold crop of
 * colour, never combined with The Find.
 */
export function Aperture({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 320"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="320" cy="250" r="194" fill="none" stroke="var(--ink)" strokeWidth="112" />
      <circle cx="320" cy="250" r="138" fill="var(--accent)" />
    </svg>
  )
}
