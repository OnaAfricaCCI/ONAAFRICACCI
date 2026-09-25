import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Funders', template: '%s · Ona Funds' },
  description: "The organisations putting money into African creative work. Each profile shows what they fund, who can apply, and how to reach them.",
  alternates: { canonical: '/funders' },
  openGraph: { title: 'Funders · Ona Funds', description: "The organisations putting money into African creative work. Each profile shows what they fund, who can apply, and how to reach them.", url: '/funders' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
