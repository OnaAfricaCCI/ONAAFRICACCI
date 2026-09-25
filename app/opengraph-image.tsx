import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The card people see when the site is shared.
 *
 * Without this file, social platforms fall back to whatever the host provides,
 * which is how the Vercel logo ended up representing Ona in chat previews.
 *
 * Built at build time rather than shipped as a flat PNG, so the lockup stays in
 * step with the brand: change a colour here and the share card follows.
 *
 * The mark is drawn as shapes, exactly as in the Logo component: three
 * 100-unit circles, 20-unit gaps, 22-unit stroke, and only the "o" carries
 * colour. "funds" is set in Outfit Regular beside it on the same baseline,
 * which needs the real font file, since the renderer has no system fonts to
 * fall back on.
 */

export const alt = 'Ona Funds. The funding is out there. We help you find it.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#121412'
const IVORY = '#F6F4EC'
const CORAL = '#FF6A4D'
const SAGE = '#8FA487'

/** The wordmark, as geometry. No text, so it needs no font. */
const WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 100">
  <circle cx="50" cy="50" r="39" fill="none" stroke="${IVORY}" stroke-width="22"/>
  <circle cx="50" cy="50" r="28" fill="${CORAL}"/>
  <path d="M131,100 V50 A39,39 0 0 1 209,50 V100" fill="none" stroke="${IVORY}" stroke-width="22"/>
  <rect x="120" y="0" width="22" height="100" fill="${IVORY}"/>
  <circle cx="290" cy="50" r="39" fill="none" stroke="${IVORY}" stroke-width="22"/>
  <rect x="318" y="0" width="22" height="100" fill="${IVORY}"/>
</svg>`

/**
 * The Find, as a column of rings with one filled. One motif, beside the words
 * rather than behind them, as the guidelines require.
 */
function theFind() {
  const pitch = 28
  const cols = 3
  const rows = 8
  const rings: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * pitch + pitch / 2
      const cy = r * pitch + pitch / 2
      const isCoral = c === 1 && r === 4
      rings.push(
        isCoral
          ? `<circle cx="${cx}" cy="${cy}" r="7.8" fill="${CORAL}"/>`
          : `<circle cx="${cx}" cy="${cy}" r="8.9" fill="none" stroke="${IVORY}" stroke-width="2.2"/>`,
      )
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * pitch} ${rows * pitch}">${rings.join('')}</svg>`
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

export default async function Image() {
  const [extraBold, regular] = await Promise.all([
    readFile(join(process.cwd(), 'assets/Outfit-ExtraBold.ttf')),
    readFile(join(process.cwd(), 'assets/Outfit-Regular.ttf')),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: INK,
          color: IVORY,
          padding: '64px 72px',
          fontFamily: 'Outfit',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          {/* Lockup: the drawn wordmark, then "funds" on the same baseline. */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <img src={dataUri(WORDMARK)} width={204} height={60} alt="" />
            <span style={{ fontSize: 72, fontWeight: 400, lineHeight: 0.82, letterSpacing: -2 }}>
              funds
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 800,
                letterSpacing: -2.4,
                lineHeight: 1.05,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span>The funding is out there.</span>
              <span style={{ color: CORAL }}>We help you find it.</span>
            </div>
            <span style={{ marginTop: 26, fontSize: 27, fontWeight: 400, color: SAGE, lineHeight: 1.4 }}>
              Grants, prizes, residencies, fellowships, investment for African creatives,
              on the continent and in the diaspora.
            </span>
          </div>
        </div>

        {/* One motif, in its own column. */}
        <img src={dataUri(theFind())} width={120} height={320} alt="" style={{ alignSelf: 'center' }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Outfit', data: extraBold, style: 'normal', weight: 800 },
        { name: 'Outfit', data: regular, style: 'normal', weight: 400 },
      ],
    },
  )
}
