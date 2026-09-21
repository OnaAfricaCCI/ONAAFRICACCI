import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Blog', template: '%s — Ona' },
  description: "News, updates and conversations from across Africa's cultural and creative industries.",
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog — Ona', description: "News, updates and conversations from across Africa's cultural and creative industries.", url: '/blog' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
