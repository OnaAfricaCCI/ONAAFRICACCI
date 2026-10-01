/**
 * The header navigation, in one place so the desktop bar and the mobile menu
 * never drift apart.
 */
export type NavLink = { href: string; label: string }

export const NAV_LINKS: NavLink[] = [
  { href: '/grants', label: 'Grants' },
  { href: '/funders', label: 'Funders' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  // 'For funders' (/for-funders) is built but unpublished — David is tidying it
  // before it goes live. The page still exists and is reachable by direct URL;
  // re-add this line to put the tab back.
  { href: '/contact', label: 'Contact' },
]
