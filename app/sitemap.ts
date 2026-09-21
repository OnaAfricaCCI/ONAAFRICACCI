import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600 // rebuild the sitemap at most hourly

/**
 * Tells search engines every page worth indexing, including all funder
 * profiles. Blank institutions are excluded by the same rule the site uses.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/grants`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/funders`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  const { data } = await supabase
    .from('funders')
    .select('slug, updated_at, created_at')
    .eq('is_active', true)
    .not('description', 'is', null)
    .not('slug', 'is', null)

  const profiles: MetadataRoute.Sitemap = (data ?? []).map((f) => ({
    url: `${SITE_URL}/funders/${f.slug}`,
    lastModified: new Date(f.updated_at ?? f.created_at ?? now),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...statics, ...profiles]
}
