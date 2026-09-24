/**
 * The Ona Funds mark.
 *
 * Drawn, not set in a typeface. The wordmark is geometry on a 100-unit
 * x-height: three equal circles with 20-unit gaps and a 22-unit stroke, which
 * is 22% of a circle's diameter. Only the "o" carries colour, because the "o"
 * is the eye and the eye is the whole idea. The ring is the record, steady and
 * precise. The coral centre is what it keeps in view.
 *
 * "funds" sits beside it in Outfit Regular on the same baseline: weight
 * carries the name, lightness carries the descriptor.
 *
 * Rules taken from the guidelines and enforced here rather than left to each
 * caller: never colour the n or the a, never add a pupil, never stretch or
 * outline the mark, never write the name as "ONA".
 */

type Tone = 'ink' | 'ivory' | 'coral' | 'sage'

/** Ring colour and centre colour for each surface the mark sits on. */
const TONES: Record<Tone, { stroke: string; eye: string }> = {
  ink: { stroke: 'var(--ink)', eye: 'var(--accent)' },
  ivory: { stroke: '#f6f4ec', eye: 'var(--accent)' },
  // On coral the centre flips to ivory so the eye stays open.
  coral: { stroke: 'var(--ink)', eye: '#f6f4ec' },
  sage: { stroke: '#f6f4ec', eye: 'var(--accent)' },
}

/**
 * The full lockup: ona + funds.
 *
 * Minimum size is 72px wide on screen; below that use the symbol instead.
 */
export function Logo({
  tone = 'ink',
  width = 132,
  className = '',
}: {
  tone?: Tone
  width?: number
  className?: string
}) {
  const { stroke, eye } = TONES[tone]
  return (
    <svg
      viewBox="0 -44 880 146"
      style={{ width, height: 'auto' }}
      className={className}
      role="img"
      aria-label="Ona Funds"
    >
      {/* o: a ring with a filled centre. The only colour in the mark. */}
      <circle cx="50" cy="50" r="39" fill="none" stroke={stroke} strokeWidth="22" />
      <circle cx="50" cy="50" r="28" fill={eye} />
      {/* n: a stem plus an arch */}
      <path d="M131,100 V50 A39,39 0 0 1 209,50 V100" fill="none" stroke={stroke} strokeWidth="22" />
      <rect x="120" y="0" width="22" height="100" fill={stroke} />
      {/* a: a ring plus a right stem */}
      <circle cx="290" cy="50" r="39" fill="none" stroke={stroke} strokeWidth="22" />
      <rect x="318" y="0" width="22" height="100" fill={stroke} />
      <text
        x="376"
        y="100"
        fontFamily="var(--font-display), Outfit, sans-serif"
        fontWeight="400"
        fontSize="196"
        letterSpacing="-4"
        fill={stroke}
      >
        funds
      </text>
    </svg>
  )
}

/**
 * The symbol: the "o" alone.
 *
 * For favicons, avatars, tight spaces and as a signature in a corner. Also the
 * footer sign-off.
 */
export function LogoSymbol({
  tone = 'ink',
  size = 28,
  className = '',
  title = 'Ona Funds',
}: {
  tone?: Tone
  size?: number
  className?: string
  title?: string
}) {
  const { stroke, eye } = TONES[tone]
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size }}
      className={className}
      role="img"
      aria-label={title}
    >
      <circle cx="50" cy="50" r="39" fill="none" stroke={stroke} strokeWidth="22" />
      <circle cx="50" cy="50" r="28" fill={eye} />
    </svg>
  )
}
