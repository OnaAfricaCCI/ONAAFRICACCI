import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/site'

export const metadata: Metadata = {
  title: { default: 'Contact', template: '%s · Ona Funds' },
  description: "Looking for funding, or offering it? Get in touch with Ona, or list an opportunity for African creatives.",
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Contact · Ona Funds', description: "Looking for funding, or offering it? Get in touch with Ona, or list an opportunity for African creatives.", url: '/contact', images: [OG_IMAGE] },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
