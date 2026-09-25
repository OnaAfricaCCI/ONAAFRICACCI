import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Contact', template: '%s · Ona Funds' },
  description: "Looking for funding, or offering it? Get in touch with Ona, or list an opportunity for African creatives.",
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Contact · Ona Funds', description: "Looking for funding, or offering it? Get in touch with Ona, or list an opportunity for African creatives.", url: '/contact' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
