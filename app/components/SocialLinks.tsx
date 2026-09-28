import { SOCIAL } from '@/lib/site'

/**
 * Links to Ona's own profiles.
 *
 * One component for the footer, the contact page and every blog post, so the
 * addresses cannot drift apart. An empty entry in SOCIAL hides that link
 * rather than sending someone to a platform's homepage.
 *
 * `boxed` draws bordered squares, for the footer. Otherwise it renders a row
 * of named links, which reads better inside a page.
 */

const PATHS = {
  instagram: [
    'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.3.84-.4.4-.64.8-.84 1.3-.16.4-.35 1-.4 2.1C2.6 8.5 2.6 8.9 2.6 12s0 3.5.07 4.7c.05 1.1.24 1.7.4 2.1.2.5.44.9.84 1.3.4.4.8.64 1.3.84.4.16 1 .35 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.44 1.3-.84.4-.4.64-.8.84-1.3.16-.4.35-1 .4-2.1.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.24-1.7-.4-2.1-.2-.5-.44-.9-.84-1.3-.4-.4-.8-.64-1.3-.84-.4-.16-1-.35-2.1-.4C15.5 4 15.1 4 12 4z',
    'M12 7.1a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4z',
  ],
  linkedin: [
    'M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM10 9h3.8v1.65h.05c.53-1 1.83-2.05 3.75-2.05C21.3 8.6 22 10.9 22 14.05V21h-4v-6.2c0-1.48-.03-3.38-2.05-3.38-2.06 0-2.37 1.6-2.37 3.27V21h-4z',
  ],
} as const

function Icon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {name === 'instagram' && <circle cx="17.1" cy="6.9" r="1.15" />}
    </svg>
  )
}

const ENTRIES = [
  { key: 'instagram', label: 'Instagram', href: SOCIAL.instagram },
  { key: 'linkedin', label: 'LinkedIn', href: SOCIAL.linkedin },
] as const

export default function SocialLinks({
  boxed = false,
  className = '',
  tone = 'ink',
}: {
  boxed?: boolean
  className?: string
  /** 'ivory' for links sitting on an ink surface. */
  tone?: 'ink' | 'ivory'
}) {
  const live = ENTRIES.filter((e) => e.href)
  if (live.length === 0) return null

  if (boxed) {
    const box =
      tone === 'ivory'
        ? 'border-[#f6f4ec] text-[#f6f4ec] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]'
        : 'border-[var(--ink)] text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]'
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {live.map((e) => (
          <a
            key={e.key}
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ona Funds on ${e.label}`}
            className={`flex h-10 w-10 items-center justify-center border-2 transition-colors ${box}`}
          >
            <Icon name={e.key} className="h-4 w-4" />
          </a>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {live.map((e) => (
        <a
          key={e.key}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-bold transition-colors hover:text-[var(--accent-deep)]"
        >
          <Icon name={e.key} className="h-4 w-4" />
          {e.label}
        </a>
      ))}
    </div>
  )
}
