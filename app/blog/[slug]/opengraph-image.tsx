import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { supabase } from '@/lib/supabase'

/**
 * A post's own share card, and its thumbnail on the site.
 *
 * The root card carries the site's positioning line, which is right for the
 * homepage and wrong for an article: a link to an essay should show the essay's
 * headline. This reads the post and sets its title in Outfit on ink, with the
 * capital-stack columns behind it.
 *
 * It is also the post's cover image. `cover_url` points at this same route, so
 * the card on /blog and the card in a chat preview are one image with one place
 * to change it.
 */

export const alt = 'Ona Funds'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#121412'
const IVORY = '#F6F4EC'
const CORAL = '#FF6A4D'
const SAGE = '#8FA487'

/**
 * The capital-stack columns, as a backdrop.
 *
 * Solid bars rather than ring-filled ones: at thumbnail size a 28px ring
 * pattern turns to mud, and a motif that cannot be read is just noise.
 */
function columns() {
  const bars = [
    { x: 140, y: 252, h: 140 },
    { x: 280, y: 168, h: 224, coral: true },
    { x: 420, y: 196, h: 196 },
    { x: 560, y: 280, h: 112 },
    { x: 700, y: 140, h: 252 },
    { x: 840, y: 224, h: 168 },
    { x: 980, y: 308, h: 84 },
  ]
  const rects = bars
    .map(
      (b) =>
        `<rect x="${b.x}" y="${b.y}" width="84" height="${b.h}" fill="${b.coral ? '#2C2320' : '#1C211C'}"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1260 470">${rects}
    <circle cx="322" cy="182" r="14" fill="${CORAL}"/>
    <line x1="112" y1="400" x2="1092" y2="400" stroke="#2A302A" stroke-width="3"/></svg>`
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data } = await supabase
    .from('posts')
    .select('title')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  const title = (data as { title?: string } | null)?.title ?? 'Ona Funds'

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
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: INK,
          color: IVORY,
          padding: '60px 68px',
          fontFamily: 'Outfit',
          position: 'relative',
        }}
      >
        <img
          src={dataUri(columns())}
          width={1200}
          height={448}
          alt=""
          style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.85 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              width: 30,
              height: 30,
              borderRadius: 15,
              border: `7px solid ${IVORY}`,
            }}
          />
          <span style={{ fontSize: 22, fontWeight: 400, letterSpacing: 4, color: SAGE
          }}>
            ONA FUNDS · INSIGHTS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <span
            style={{
              fontSize: title.length > 70 ? 54 : 64,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {title}
          </span>
          <span style={{ marginTop: 22, fontSize: 24, fontWeight: 400, color: SAGE }}>
            Part 1 of a series on creative finance
          </span>
        </div>
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
