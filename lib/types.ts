export type PostType = 'article' | 'image' | 'video'

export type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string | null
  post_type: PostType
  cover_url: string | null
  video_url: string | null
  author: string | null
  tags: string[]
  published: boolean
  published_at: string | null
  created_at: string
}

export type Funder = {
  id: string
  slug: string | null
  name: string
  acronym: string | null
  funder_type: string | null
  website: string | null
  logo_url: string | null
  description: string | null
  headquarters_country: string | null
  regions_of_focus: string[]
  cci_sectors: string[]
  typical_amount_range: string | null
  funding_types: string[]
  application_cycle: string | null
  contact_email: string | null
  contact_person: string | null
  notes: string | null
  is_active: boolean
  created_at: string

  // Profile detail
  what_they_fund: string | null
  how_to_apply: string | null
  deadline_notes: string | null
  notable_grantees: string[] | null
  grants_page_url: string | null
  last_verified: string | null
  source_url: string | null
}
