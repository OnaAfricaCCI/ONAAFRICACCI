import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Blog components, built from the Ona Funds blog kit v1.
 *
 * Every block is drawn from text and shapes, never a picture, so it stays
 * sharp at any size. Every block also sets its own background and text
 * colours rather than letting the page show through. That is not a style
 * preference: the first build let the ivory page show behind the capital
 * stack, which turned its rings grey and made the sage labels invisible.
 *
 * A post names a figure on its own line and the renderer looks it up here:
 *
 *     ::: capital-stack
 *
 * An unknown name renders nothing rather than an error, so a typo in a post
 * can never break a page.
 */

const INK = '#121412'
const IVORY = '#F6F4EC'
const CORAL = '#FF6A4D'
const CORAL_DEEP = '#C23A22'
const BLUSH = '#FFC9B8'
const SAGE_DEEP = '#5F7359'
const SAGE = '#8FA487'
const SAGE_MIST = '#DCE3D5'
const GRAPHITE = '#4A5249'
const RULE = '#C9D1C1'

/**
 * A field of rings, as a CSS gradient rather than an image.
 *
 * The tile is one 37th of the container, which is what makes the whole header
 * scale with no image and no breakpoints: two tiles of margin, seven columns
 * of three tiles, six gaps of two tiles, two tiles of margin. 2 + 21 + 12 + 2.
 */
const ringField = (stroke: string) =>
  `radial-gradient(circle closest-side, transparent 56%, ${stroke} 58%, ${stroke} 71%, transparent 73%) 0 0 / calc(100cqi/37) calc(100cqi/37), ${INK}`

/**
 * 01 · Post header, the Find stack.
 *
 * Seven columns of rings on a field of darker rings, one coral ring marking
 * the instrument the post turns on. It runs full width directly under the
 * title, and replaces the link-preview image that used to sit there.
 */
export function PostHeaderStack({
  heights,
  highlight,
  labels,
  caption,
}: {
  /** Column heights, in tiles. */
  heights: number[]
  /** 1-based column carrying the coral ring. */
  highlight: number
  labels: string[]
  caption: ReactNode
}) {
  const tallest = Math.max(...heights)
  return (
    <figure className="my-2" style={{ background: INK, containerType: 'inline-size', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          padding: 'calc(100cqi/37) calc(200cqi/37) 0',
          background: ringField('#262C26'),
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${heights.length}, calc(300cqi/37))`,
            columnGap: 'calc(200cqi/37)',
            height: `calc(${(tallest + 2) * 100}cqi/37)`,
            alignItems: 'end',
          }}
        >
          {heights.map((h, i) => (
            <div
              key={i}
              style={{ position: 'relative', height: `calc(${h * 100}cqi/37)`, background: ringField(SAGE) }}
            >
              {i + 1 === highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 'calc(100cqi/37)',
                    width: 'calc(100cqi/37)',
                    height: 'calc(100cqi/37)',
                    background: `radial-gradient(circle closest-side, ${CORAL} 71%, transparent 73%)`,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Column numbers, so the legend below can be read on a phone. */}
      <div style={{ padding: '0 calc(200cqi/37)', background: INK }}>
        <div
          style={{
            borderTop: `2px solid ${IVORY}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${heights.length}, calc(300cqi/37))`,
            columnGap: 'calc(200cqi/37)',
            padding: '10px 0 0',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.06em',
            color: SAGE_MIST,
            textAlign: 'center',
          }}
        >
          {labels.map((_, i) => (
            <span key={i} style={i + 1 === highlight ? { color: CORAL } : undefined}>
              {String(i + 1).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: INK, padding: '16px clamp(16px,4cqi,40px) 20px' }}>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-bold" style={{ color: SAGE_MIST }}>
          {labels.map((l, i) => (
            <span key={l} style={i + 1 === highlight ? { color: CORAL } : undefined}>
              <span style={{ color: SAGE }}>{String(i + 1).padStart(2, '0')}</span> {l}
            </span>
          ))}
        </div>
        <figcaption className="mt-3 text-[13px] leading-relaxed" style={{ color: SAGE_MIST }}>
          {caption}
        </figcaption>
      </div>
    </figure>
  )
}

/** 02 · Stat pair. Two figures, before and after. The newer one goes dark. */
function StatPair() {
  return (
    <figure className="my-2 flex flex-col gap-2.5">
      <div
        className="grid"
        style={{ border: `1px solid ${INK}`, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}
      >
        <div className="flex flex-col gap-1 px-6 py-5" style={{ background: IVORY }}>
          <span className="label" style={{ color: SAGE_DEEP }}>2020</span>
          <span className="font-[family-name:var(--font-display)] text-[44px] leading-none" style={{ color: INK }}>
            US$500m
          </span>
          <span className="text-sm leading-relaxed" style={{ color: GRAPHITE }}>
            Creative Africa Nexus launches
          </span>
        </div>
        <div className="flex flex-col gap-1 px-6 py-5" style={{ background: INK }}>
          <span className="label" style={{ color: SAGE }}>October 2024</span>
          <span className="font-[family-name:var(--font-display)] text-[44px] leading-none" style={{ color: CORAL }}>
            US$2bn
          </span>
          <span className="text-sm leading-relaxed" style={{ color: SAGE_MIST }}>
            Window for the next three years
          </span>
        </div>
      </div>
      <figcaption className="text-[13px]" style={{ color: GRAPHITE }}>
        Source: Afreximbank. A facility is lending capacity, not money disbursed.
      </figcaption>
    </figure>
  )
}

/** 03 · Worked example. One scenario per post. The question stays in the box. */
function WorkedExample() {
  return (
    <aside
      className="my-2 flex flex-col gap-3.5 px-7 py-7 sm:px-8"
      style={{ background: SAGE_MIST, color: INK }}
    >
      <span className="label" style={{ color: '#4A5A45' }}>Worked example · Nairobi</span>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <div>
          <div className="font-[family-name:var(--font-display)] text-[36px] leading-none">KES 10m</div>
          <div className="mt-1 text-sm" style={{ color: GRAPHITE }}>Contract won</div>
        </div>
        <div>
          <div
            className="font-[family-name:var(--font-display)] text-[36px] leading-none"
            style={{ color: CORAL_DEEP }}
          >
            KES 4m
          </div>
          <div className="mt-1 text-sm" style={{ color: GRAPHITE }}>
            Needed upfront for crew, equipment and suppliers
          </div>
        </div>
      </div>
      <p className="text-[16px] leading-relaxed" style={{ color: GRAPHITE }}>
        A grant is unlikely to fit. Giving an investor a share of the company makes little sense for a
        single job. What the business needs is working capital against a credible contract.
      </p>
      <p
        className="pt-3.5 font-[family-name:var(--font-display)] text-[21px] leading-[1.3]"
        style={{ borderTop: `1px solid ${INK}`, fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        “What kind of capital fits what I am trying to do?”
      </p>
    </aside>
  )
}

/** 04 · Gap bar. Headline pledge against what is live. Always drawn to scale. */
function GapBar() {
  return (
    <figure
      className="my-2 flex flex-col gap-2.5 p-6"
      style={{ background: IVORY, border: `1px solid ${INK}`, color: INK }}
    >
      <div className="flex justify-between text-[13px] font-bold">
        <span>Targeted</span>
        <span>KES 1bn</span>
      </div>
      {/* The fill is live ÷ target. Enlarging it to be easier to see would
          make the article's own argument dishonestly. */}
      <div className="relative h-5" style={{ background: SAGE_MIST }}>
        <div className="absolute inset-y-0 left-0 w-[2%] min-w-[6px]" style={{ background: CORAL }} />
      </div>
      <div className="flex flex-wrap justify-between gap-3 text-[13px]" style={{ color: GRAPHITE }}>
        <span>
          <strong style={{ color: CORAL_DEEP }}>KES 20m</strong> live today · 2% of the target
        </span>
        <span>HEVA and NCBA</span>
      </div>
    </figure>
  )
}

/** 06 · Definition list. Term, then its job. The post's own term is coral. */
function Instruments() {
  const ROWS: [string, string, boolean?][] = [
    ['Grants', 'help an idea begin.'],
    ['Short-term debt', 'such as working capital or invoice finance, helps a business deliver a job it has already won.', true],
    ['Longer-term debt', 'helps a proven business grow.'],
    ['Guarantees', 'help a lender take a risk it would otherwise avoid.'],
    ['Equity', 'gives a business time to build value when repayment is the wrong model.'],
    ['Project finance', 'turns a film, venue or production into a commercial proposition.'],
    ['IP-backed finance', 'treats a catalogue or copyright as an asset.'],
  ]
  return (
    <div
      className="my-2"
      style={{ background: IVORY, color: INK, borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}` }}
    >
      {ROWS.map(([term, job, highlight], i) => (
        <div
          key={term}
          className="grid gap-4 px-3 py-3.5"
          style={{
            gridTemplateColumns: 'minmax(110px,180px) minmax(0,1fr)',
            borderBottom: i < ROWS.length - 1 ? `1px solid ${RULE}` : undefined,
          }}
        >
          <span
            className="text-[13px] font-black uppercase tracking-[0.06em]"
            style={highlight ? { color: CORAL_DEEP } : undefined}
          >
            {term}
          </span>
          <span className="text-[16px] leading-[1.5]">{job}</span>
        </div>
      ))}
    </div>
  )
}

/** The eye, for the "for creatives" header bar. */
function EyeSymbol({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} aria-hidden="true">
      <circle cx="50" cy="50" r="39" fill="none" stroke={IVORY} strokeWidth="22" />
      <circle cx="50" cy="50" r="28" fill={CORAL} />
    </svg>
  )
}

/** 07 · Audience boxes. Ivory for creatives, sage for funders. Used as a pair. */
function AudienceBoxes() {
  const CREATIVES = [
    'Keep contracts and invoices, even for small jobs.',
    'Track revenue.',
    'Separate business and personal money where possible.',
    'Know who owns your intellectual property.',
    'Keep royalty statements.',
    'Understand the terms before taking money.',
  ]
  const FUNDERS = [
    'Can a contract or receivable stand in for conventional collateral?',
    'Can repayment schedules follow creative project cycles?',
    'Can intellectual property be valued properly?',
    'Can small businesses borrow without transaction costs making the product uneconomic?',
    'Can financing reach businesses outside the largest creative markets?',
    'Are you financing the businesses that already look investable, or expanding the pool of businesses that can become investable?',
    'Can you show where the money went?',
  ]
  return (
    <div
      className="my-2 grid items-start gap-5"
      style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}
    >
      <div style={{ border: `1px solid ${INK}`, background: IVORY, color: INK }}>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ background: INK, color: IVORY }}
        >
          <span className="label">For creatives</span>
          <EyeSymbol />
        </div>
        <ol className="list-none px-5 pb-3 pt-1.5">
          {CREATIVES.map((t, i) => (
            <li
              key={t}
              className="flex gap-3 py-2.5 text-[15px]"
              style={{ borderBottom: i < CREATIVES.length - 1 ? `1px solid ${RULE}` : undefined }}
            >
              <span className="font-black" style={{ color: CORAL_DEEP }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </div>

      <div style={{ background: SAGE_DEEP, color: IVORY }}>
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${SAGE}` }}>
          <span className="label">For funders</span>
        </div>
        <ol className="list-none px-5 pb-3 pt-1.5">
          {FUNDERS.map((t, i) => {
            const last = i === FUNDERS.length - 1
            return (
              <li
                key={t}
                className={`flex gap-3 py-2.5 ${last ? 'text-[16px] font-bold' : 'text-[15px]'}`}
                style={{ borderBottom: last ? undefined : `1px solid ${SAGE}` }}
              >
                <span className="font-black" style={{ color: last ? CORAL : BLUSH }}>
                  {i + 1}
                </span>
                {t}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/** 08 · Next in series. Ink panel, digest call to action, Aperture on the right. */
function NextInSeries() {
  return (
    <aside
      className="my-4 grid"
      style={{ background: INK, color: IVORY, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}
    >
      <div className="flex flex-col gap-3.5 p-7 sm:p-10">
        <span className="label" style={{ color: SAGE }}>Next in the series · Part 2</span>
        <p className="font-[family-name:var(--font-display)] text-[30px] leading-[1.02] sm:text-[40px]">
          Who owns what gets built?
        </p>
        <p className="max-w-md text-[16px] leading-relaxed" style={{ color: SAGE_MIST }}>
          Fair returns for financiers, a meaningful stake for creators. Get it in your inbox when it
          is published.
        </p>
        <Link
          href="/#digest"
          className="self-start px-5 py-2.5 text-[14px] font-bold transition-colors"
          style={{ background: CORAL, color: INK }}
        >
          Get the digest
        </Link>
      </div>
      <div className="relative min-h-[180px] overflow-hidden" aria-hidden="true">
        <svg
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        >
          <circle cx="300" cy="230" r="186" fill="none" stroke={GRAPHITE} strokeWidth="52" />
          <circle cx="300" cy="230" r="160" fill={CORAL} />
        </svg>
      </div>
    </aside>
  )
}

/**
 * The registry. A key is a configured instance, so the same component serves
 * every future post with different props.
 */
const FIGURES: Record<string, () => ReactNode> = {
  'capital-stack': () => (
    <PostHeaderStack
      heights={[5, 8, 7, 4, 9, 6, 3]}
      highlight={2}
      labels={[
        'Grants',
        'Working capital',
        'Growth debt',
        'Guarantees',
        'Equity',
        'Project finance',
        'IP-backed',
      ]}
      caption="The capital stack. Seven instruments, each for a different job. The coral ring marks the one a Nairobi production company with a signed contract needs. Column heights are illustrative."
    />
  ),
  'afrexim-timeline': StatPair,
  'worked-example': WorkedExample,
  'heva-gap': GapBar,
  instruments: Instruments,
  'audience-boxes': AudienceBoxes,
  'series-next': NextInSeries,
}

export default function BlogFigure({ name }: { name: string }) {
  const Figure = FIGURES[name]
  return Figure ? <Figure /> : null
}
