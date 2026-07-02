export type Funder = {
  id: string
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
}
