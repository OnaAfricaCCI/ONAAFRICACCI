/**
 * Canonical site address. Change this once when the custom domain is live;
 * sitemap, robots, canonical tags and social cards all read from it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ona-africa-cci.vercel.app'
).replace(/\/$/, '')

export const SITE_NAME = 'Ona Funds'
export const SITE_TITLE = "Ona Funds · Funding for Africa's creative industries"
export const SITE_DESCRIPTION =
  'Find grants, prizes, residencies and fellowships for African creatives. Checked, filterable and current, for the continent and the diaspora.'
export const SITE_DEFINITION =
  "Ona Funds is a public record of the funding open to Africa's cultural and creative industries. " +
  'It gathers grants, prizes, residencies and fellowships for creatives on the continent and in ' +
  'the diaspora, checks they are real and makes them searchable.'
