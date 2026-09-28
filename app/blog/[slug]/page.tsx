import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { embedUrl, formatDate } from '@/lib/media'
import type { Post } from '@/lib/types'
import Prose from '@/app/components/Prose'

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
    <main className="mx-auto max-w-[960px] px-5 py-12">
      <Link
        href="/blog"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
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
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[34px] leading-[1.1] sm:text-[48px]">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-4 max-w-[700px] text-lg leading-relaxed text-[var(--ink-soft)]">{post.excerpt}</p>
        )}
      </header>

      {/*
        Media. Video only.

        cover_url deliberately is not rendered here. It holds the post's
        link-preview image, which belongs in the meta tags and nowhere else:
        showing it in the body repeated the title underneath itself and put a
        faint chart behind the opening paragraphs. The post header figure does
        this job instead.
      */}
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
      ) : null}

      {post.body && <Prose body={post.body} />}

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
