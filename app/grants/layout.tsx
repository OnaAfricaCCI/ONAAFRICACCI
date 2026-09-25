import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/site'

export const metadata: Metadata = {
  title: { default: 'Grants', template: '%s · Ona Funds' },
  description: "Grants, prizes, residencies and fellowships for Africa's creative and cultural industries. Checked, filterable by sector, country, type and amount, and kept current.",
  alternates: { canonical: '/grants' },
  openGraph: { title: 'Grants · Ona Funds', description: "Grants, prizes, residencies and fellowships for Africa's creative and cultural industries. Checked, filterable by sector, country, type and amount, and kept current.", url: '/grants', images: [OG_IMAGE] },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
