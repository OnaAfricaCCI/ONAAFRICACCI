'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, videoThumb } from '@/lib/media'
import type { Post, PostType } from '@/lib/types'

const TYPE_LABEL: Record<PostType, string> = {
  article: 'Read',
  image: 'Gallery',
  video: 'Watch',
}

const TYPE_COLOR: Record<PostType, string> = {
  article: 'var(--forest)',
  image: 'var(--ochre)',
  video: 'var(--terracotta)',
}

/** Posts shown per "page" — four rows of the widest (4-column) grid. */
const ROWS = 4
const PER_PAGE = ROWS * 4

/**
 * Shown until real posts are published, so the page has shape to look at.
 * Delete nothing here — they disappear on their own once `posts` has rows.
 */
const PLACEHOLDERS: Post[] = [
  ['Nairobi’s studio boom, three years on', 'article', 'What happened after the first wave of purpose-built recording spaces opened across Eastlands.'],
  ['In pictures: Dakar Biennale 2026', 'image', 'Highlights from the continent’s longest-running contemporary art gathering.'],
  ['How to read a grant call', 'video', 'A short walkthrough of what funders actually mean by “eligibility”.'],
  ['The quiet rise of Lusophone animation', 'article', 'Studios in Luanda and Maputo are building pipelines that didn’t exist five years ago.'],
  ['Funding the in-between', 'article', 'Why mid-career artists fall through the gaps of most funding structures.'],
  ['Behind the scenes: Accra fashion week', 'image', 'Backstage with the designers reshaping West African ready-to-wear.'],
  ['Three founders on raising capital', 'video', 'Creative entrepreneurs talk candidly about what worked and what didn’t.'],
  ['A field guide to residencies', 'article', 'What to expect, what to ask, and what nobody tells you beforehand.'],
  ['Archives at risk', 'article', 'The race to digitise film collections before the reels degrade.'],
  ['Portraits of the Kampala music scene', 'image', 'Photographers document a year in Uganda’s live circuit.'],
  ['What funders look for', 'video', 'Programme officers explain how applications are actually assessed.'],
  ['Cultural policy in 2026', 'article', 'Where national creative-economy strategies stand across the continent.'],
].map(([title, post_type, excerpt], i) => ({
  id: `placeholder-${i}`,
  slug: '',
  title: title as string,
  excerpt: excerpt as string,
  body: null,
  post_type: post_type as PostType,
  cover_url: null,
  video_url: null,
  author: 'Ona',
  tags: [],
  published: true,
  published_at: null,
  created_at: new Date(Date.now() - i * 864e5).toISOString(),
}))

function PlayMark() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="flex h-12 w-12 items-center justify-center border-2 border-[var(--paper)] bg-[var(--ink)]/70 text-[var(--paper)] transition-transform group-hover:scale-110">
        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
  )
}

function Thumb({ post }: { post: Post }) {
  const [failed, setFailed] = useState(false)
  const src = post.cover_url ?? videoThumb(post.video_url)

  if (!src || failed) {
    return (
      <div
        className="relative flex aspect-[4/3] items-center justify-center border-b border-[var(--line)]"
        style={{ background: 'var(--paper-deep)' }}
      >
        <span
          className="font-[family-name:var(--font-display)] text-[38px] leading-[1.1] opacity-25"
          style={{ color: TYPE_COLOR[post.post_type] }}
        >
          {post.title.charAt(0)}
        </span>
        {post.post_type === 'video' && <PlayMark />}
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b border-[var(--line)] bg-[var(--paper-deep)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {post.post_type === 'video' && <PlayMark />}
    </div>
  )
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'all' | PostType>('all')
  const [visible, setVisible] = useState(PER_PAGE)

  useEffect(() => {
    supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        // A missing `posts` table is not an error worth showing — the
        // placeholders below cover it until real posts exist.
        if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
          setError(error.message)
        }
        setPosts((data as Post[]) ?? [])
        setLoading(false)
      })
  }, [])

  // Fall back to placeholders until the first real post is published.
  const usingPlaceholders = !loading && !error && posts.length === 0
  const source = usingPlaceholders ? PLACEHOLDERS : posts

  const filtered = useMemo(
    () => (type === 'all' ? source : source.filter((p) => p.post_type === type)),
    [source, type],
  )

  const shown = filtered.slice(0, visible)

  const tabClass = (active: boolean) =>
    `border-2 px-[14px] py-1 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
      active
        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]'
        : 'border-[var(--border-md)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
    }`

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="border-b border-[var(--line)] py-12 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          The blog
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
          News from the ecosystem.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          Stories, updates and conversations from across Africa&rsquo;s cultural and
          creative industries.
        </p>
      </section>

      {/* Type tabs */}
      <section className="sticky top-[92px] sm:top-[66px] z-10 -mx-5 border-b border-[var(--line)] bg-[var(--paper)]/95 px-5 py-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {(['all', 'article', 'image', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t)
                setVisible(PER_PAGE)
              }}
              className={tabClass(type === t)}
            >
              {t === 'all' ? 'Everything' : t === 'article' ? 'Writing' : t === 'image' ? 'Visual' : 'Video'}
            </button>
          ))}
          <span className="ml-auto font-[family-name:var(--font-display)] text-sm text-[var(--ink-soft)]">
            {loading ? '…' : `${filtered.length} ${filtered.length === 1 ? 'post' : 'posts'}`}
          </span>
        </div>
      </section>

      {error && (
        <p className="mt-8 border-2 border-[var(--error)] bg-[var(--error-soft)] p-5 text-sm">
          Failed to load posts: {error}
        </p>
      )}
      {loading && (
        <p className="py-16 text-center text-sm uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          Loading posts…
        </p>
      )}

      {usingPlaceholders && (
        <p className="mt-8 border-l-4 border-[var(--ochre)] bg-[var(--ochre-soft)] px-5 py-3 text-sm">
          <strong className="font-semibold">Placeholder posts.</strong>{' '}
          <span className="text-[var(--ink-soft)]">
            These are examples of how the blog will look. They disappear as soon as
            a real post is published.
          </span>
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="my-10 border-2 border-dashed border-[var(--line)] p-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            No posts here yet.
          </p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Check back soon.</p>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="my-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p, i) => {
            const Card = usingPlaceholders ? 'div' : Link
            const cardProps = usingPlaceholders
              ? { className: 'group flex h-full flex-col' }
              : { href: `/blog/${p.slug}`, className: 'group flex h-full flex-col' }
            return (
            <li
              key={p.id}
              className={`rise-in border border-[var(--line)] bg-[var(--paper)] transition-colors hover:border-[var(--accent)] ${
                usingPlaceholders ? 'opacity-70' : ''
              }`}
              style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}
            >
              <Card {...(cardProps as { href: string; className: string })}>
                <Thumb post={p} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    <span style={{ color: TYPE_COLOR[p.post_type] }}>
                      {TYPE_LABEL[p.post_type]}
                    </span>
                    {formatDate(p.published_at ?? p.created_at) && (
                      <>
                        <span className="text-[var(--line)]">/</span>
                        <span className="text-[var(--ink-soft)]">
                          {formatDate(p.published_at ?? p.created_at)}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug transition-colors group-hover:text-[var(--accent)]">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--ink-2)]">
                      {p.excerpt}
                    </p>
                  )}
                  {p.author && (
                    <p className="mt-auto pt-4 text-[10px] uppercase tracking-[0.15em] text-[var(--ink-soft)]">
                      {p.author}
                    </p>
                  )}
                </div>
              </Card>
            </li>
            )
          })}
        </ul>
      )}

      {filtered.length > visible && (
        <div className="mb-16 text-center">
          <button
            onClick={() => setVisible((v) => v + PER_PAGE)}
            className="border-2 border-[var(--ink)] px-8 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
          >
            Load more ({filtered.length - visible} remaining)
          </button>
        </div>
      )}
    </main>
  )
}
