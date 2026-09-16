import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { embedUrl, formatDate } from '@/lib/media'
import type { Post } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) notFound()

  const post = data as Post
  const embed = embedUrl(post.video_url)
  const date = formatDate(post.published_at ?? post.created_at)

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link
        href="/blog"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline-offset-4 hover:underline"
      >
        ← All posts
      </Link>

      <header className="mt-6 border-b-2 border-[var(--ink)] pb-8">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          <span>{post.post_type === 'video' ? 'Video' : post.post_type === 'image' ? 'Visual' : 'Writing'}</span>
          {date && (
            <>
              <span className="text-[var(--line)]">/</span>
              <span>{date}</span>
            </>
          )}
          {post.author && (
            <>
              <span className="text-[var(--line)]">/</span>
              <span>{post.author}</span>
            </>
          )}
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-4 text-lg leading-relaxed text-[var(--ink-soft)]">{post.excerpt}</p>
        )}
      </header>

      {/* Media */}
      {embed ? (
        <div className="mt-10 aspect-video w-full border-2 border-[var(--ink)] bg-black">
          <iframe
            src={embed}
            title={post.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_url}
          alt=""
          className="mt-10 w-full border-2 border-[var(--ink)] object-cover"
        />
      ) : null}

      {/* Body — blank-line separated paragraphs */}
      {post.body && (
        <div className="mt-10 space-y-5 text-[17px] leading-relaxed text-[var(--ink)]/90">
          {post.body
            .split(/\n{2,}/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      )}

      {(post.tags ?? []).length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--line)] pt-6">
          {post.tags.map((t) => (
            <span
              key={t}
              className="bg-[var(--ochre-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </main>
  )
}
