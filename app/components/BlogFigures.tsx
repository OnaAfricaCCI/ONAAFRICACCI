import type { ReactNode } from 'react'

/**
 * Designed figures a post can drop into its body.
 *
 * An essay about money needs to show the money. Rendering this piece as
 * paragraphs alone lost the capital stack, the Afreximbank timeline, the
 * Nairobi worked example and the gap between what a fund targets and what it
 * has actually opened, which were the places the argument became concrete.
 *
 * The body stays plain text and names a figure on its own line:
 *
 *     ::: capital-stack
 *
 * Only keys in this registry render. An unknown key renders nothing rather
 * than an error, so a typo in a post can never break the page.
 *
 * Geometry follows the brand: rings on a 28px grid, 22% stroke, one coral per
 * figure, radius 0, no soft shadows.
 */

const INK = '#121412'
const IVORY = '#F6F4EC'
const CORAL = '#FF6A4D'
const SAGE = '#8FA487'
const SAGE_MIST = '#DCE3D5'
const GRAPHITE = '#4A5249'
const SAGE_DEEP = '#5F7359'

/** A caption in the brand's label style, under a figure. */
function Caption({ children }: { children: ReactNode }) {
  return <figcaption className="mt-3 text-[13px] leading-relaxed text-[var(--ink-2)]">{children}</figcaption>
}

/**
 * The capital stack.
 *
 * Seven instruments, each a column of rings, with a single coral ring marking
 * the one a Nairobi production company with a signed contract actually needs.
 * Column heights are illustrative and the caption says so: they carry no data
 * and must not be read as if they did.
 */
function CapitalStack() {
  const COLUMNS = [
    { x: 140, y: 252, h: 140, label: 'GRANTS' },
    { x: 280, y: 168, h: 224, label: 'WORKING CAPITAL', coral: true },
    { x: 420, y: 196, h: 196, label: 'GROWTH DEBT' },
    { x: 560, y: 280, h: 112, label: 'GUARANTEES' },
    { x: 700, y: 140, h: 252, label: 'EQUITY' },
    { x: 840, y: 224, h: 168, label: 'PROJECT FINANCE' },
    { x: 980, y: 308, h: 84, label: 'IP-BACKED' },
  ]
  return (
    <figure className="my-4">
      <svg
        viewBox="0 0 1260 470"
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full"
        role="img"
        aria-label="The capital stack: seven columns of rings, one per funding instrument. A single coral ring marks working capital."
      >
        <defs>
          <pattern id="stackRings" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="8.9" fill="none" stroke={SAGE} strokeWidth="2.2" />
          </pattern>
          <pattern id="bgRings" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="8.9" fill="none" stroke="#2A302A" strokeWidth="2.2" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="1260" height="392" fill="url(#bgRings)" />
        <rect x="0" y="0" width="1260" height="392" fill={INK} opacity="0.35" />
        {COLUMNS.map((c) => (
          <g key={c.label}>
            <rect x={c.x} y={c.y} width="84" height={c.h} fill={INK} />
            <rect x={c.x} y={c.y} width="84" height={c.h} fill="url(#stackRings)" />
          </g>
        ))}
        {/* The one filled ring. Singular, always. */}
        <circle cx="322" cy="182" r="8.9" fill="none" stroke={CORAL} strokeWidth="2.2" />
        <circle cx="322" cy="182" r="7.8" fill={CORAL} />
        <line x1="112" y1="400" x2="1092" y2="400" stroke={IVORY} strokeWidth="2" />
        <g
          fontFamily="var(--font-body), sans-serif"
          fontSize="13"
          fontWeight="700"
          fill={SAGE_MIST}
          textAnchor="middle"
          letterSpacing="1.2"
        >
          {COLUMNS.map((c) => (
            <text key={c.label} x={c.x + 42} y="428" fill={c.coral ? CORAL : SAGE_MIST}>
              {c.label}
            </text>
          ))}
        </g>
      </svg>
      <Caption>
        The capital stack. Seven instruments, each for a different job. The coral ring is the one a
        Nairobi production company with a signed contract needs. Column heights are illustrative.
      </Caption>
    </figure>
  )
}

/** Two moments in one programme's size. Ivory then ink, so the second lands harder. */
function AfreximTimeline() {
  return (
    <figure className="my-4">
      <div className="grid gap-px bg-[var(--ink)] p-px sm:grid-cols-2">
        <div className="flex flex-col gap-1 bg-[var(--bg)] px-6 py-5">
          <span className="label text-[var(--sage-deep)]">2020</span>
          <span className="font-[family-name:var(--font-display)] text-[40px] leading-none">US$500m</span>
          <span className="text-sm leading-relaxed text-[var(--ink-2)]">Creative Africa Nexus launches</span>
        </div>
        <div className="flex flex-col gap-1 bg-[#121412] px-6 py-5 text-[#f6f4ec]">
          <span className="label text-[#8fa487]">October 2024</span>
          <span className="font-[family-name:var(--font-display)] text-[40px] leading-none text-[var(--accent)]">
            US$2bn
          </span>
          <span className="text-sm leading-relaxed text-[#dce3d5]">Window for the next three years</span>
        </div>
      </div>
      <Caption>Source: Afreximbank. A facility is lending capacity, not money disbursed.</Caption>
    </figure>
  )
}

/** The Nairobi example, on a sage panel so it reads as a worked case, not prose. */
function WorkedExample() {
  return (
    <figure className="my-4 bg-[var(--sage-mist)] px-7 py-7">
      <span className="label text-[var(--sage-deep)]">Worked example · Nairobi</span>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[34px] leading-none text-[#121412]">
            KES 10m
          </div>
          <div className="mt-1 text-sm text-[#4a5249]">Contract won</div>
        </div>
        <div>
          <div className="font-[family-name:var(--font-display)] text-[34px] leading-none text-[var(--accent-deep)]">
            KES 4m
          </div>
          <div className="mt-1 text-sm text-[#4a5249]">
            Needed upfront for crew, equipment and suppliers
          </div>
        </div>
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-[#4a5249]">
        A grant is unlikely to fit. Giving an investor a share of the company makes little sense for a
        single job. What the business needs is working capital against a credible contract.
      </p>
    </figure>
  )
}

/**
 * The distance between a headline figure and what is open today.
 *
 * Drawn to scale: the coral bar really is 2% of the track. A chart that
 * exaggerated the sliver to make it visible would be making the article's point
 * dishonestly.
 */
function HevaGap() {
  return (
    <figure className="my-4">
      <div className="flex items-baseline justify-between text-[13px] font-bold">
        <span>Targeted</span>
        <span>KES 1bn</span>
      </div>
      <div className="relative mt-2 h-[18px] bg-[var(--sage-mist)]">
        <div className="absolute inset-y-0 left-0 w-[2%] min-w-[6px] bg-[var(--accent)]" />
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[13px]">
        <span className="font-bold text-[var(--accent-deep)]">KES 20m live today</span>
        <span className="text-[var(--ink-2)]">2% of the target · HEVA and NCBA</span>
      </div>
      <Caption>The bar is drawn to scale.</Caption>
    </figure>
  )
}

/** The series hand-off, on ink, with the Aperture crop. */
function SeriesNext() {
  return (
    <aside className="relative my-6 overflow-hidden bg-[#121412] text-[#f6f4ec]">
      <div className="relative z-10 flex flex-col gap-4 px-7 py-9 sm:px-10 sm:py-11">
        <span className="label text-[#8fa487]">Next in the series · Part 2</span>
        <p className="max-w-lg font-[family-name:var(--font-display)] text-[30px] leading-[1.05] sm:text-[40px]">
          Who owns what gets built?
        </p>
        <p className="max-w-lg text-[16px] leading-relaxed text-[#dce3d5]">
          Fair returns for financiers, a meaningful stake for creators.
        </p>
      </div>
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/3 sm:block"
      >
        <circle cx="300" cy="230" r="186" fill="none" stroke={GRAPHITE} strokeWidth="52" />
        <circle cx="300" cy="230" r="160" fill={CORAL} />
      </svg>
    </aside>
  )
}

const FIGURES: Record<string, () => ReactNode> = {
  'capital-stack': CapitalStack,
  'afrexim-timeline': AfreximTimeline,
  'worked-example': WorkedExample,
  'heva-gap': HevaGap,
  'series-next': SeriesNext,
}

export default function BlogFigure({ name }: { name: string }) {
  const Figure = FIGURES[name]
  // An unknown key renders nothing. A typo in a post should never break a page.
  return Figure ? <Figure /> : null
}

export { SAGE_DEEP }
