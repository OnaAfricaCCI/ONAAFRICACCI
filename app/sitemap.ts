import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'
import { isPublishableGrant } from '@/lib/quality'
import { slugify } from '@/lib/slug'

export const revalidate = 3600 // rebuild the sitemap at most hourly

/**
 * Tells search engines every page worth indexing: the static pages, every
 * grant that is open and working, every funder profile, and every published
 * blog post.
 *
 * Only grants a searcher could actually act on are listed. A closed call or a
 * dead link is left out, the same rule the grant page uses to mark itself
 * noindex, so the sitemap never points Google at a page it should not rank.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/grants`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/funders`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Grants: open, working, publishable. This is the bulk of the site's search
  // surface, and the reason phase one exists.
  const { data: grantRows } = await supabase
    .from('opportunities')
    .select('name, slug, description, deadline, link_state, link_checked_at, created_at')
    .not('description', 'is', null)
    .or(`deadline.is.null,deadline.gte.${today}`) // still open
    .neq('link_state', 'dead') // link works, or is unverified — never a known 404

  const grants: MetadataRoute.Sitemap = (grantRows ?? [])
    .filter((g) => isPublishableGrant(g as { name: string; description?: string | null }))
    .map((g) => ({
      url: `${SITE_URL}/grants/${g.slug || slugify(g.name)}`,
      lastModified: new Date(g.link_checked_at ?? g.created_at ?? now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  const { data: funderRows } = await supabase
    .from('funders')
    .select('slug, updated_at, created_at')
    .eq('is_active', true)
    .not('description', 'is', null)
    .not('slug', 'is', null)

  const profiles: MetadataRoute.Sitemap = (funderRows ?? []).map((f) => ({
    url: `${SITE_URL}/funders/${f.slug}`,
    lastModified: new Date(f.updated_at ?? f.created_at ?? now),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const { data: postRows } = await supabase
    .from('posts')
    .select('slug, published_at, created_at')
    .eq('published', true)

  const posts: MetadataRoute.Sitemap = (postRows ?? []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.published_at ?? p.created_at ?? now),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...statics, ...grants, ...profiles, ...posts]
}
