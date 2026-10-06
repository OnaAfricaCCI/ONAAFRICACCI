import Link from 'next/link'

/**
 * The brief privacy explanation shown where personal information is collected
 * (sign-in and profile setup), with a prominent link to the full policy. It
 * explains purpose, that fields are optional, that profiles are private and not
 * shared with funders, that this is not a funding application, and how to edit
 * or delete. Acknowledging it is not marketing consent.
 */
export default function PrivacyNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`border-l-2 border-[var(--sage)] bg-[var(--sage-mist)]/40 p-4 text-sm leading-relaxed text-[var(--ink-2)] ${className}`}>
      <p>
        Tell Ona about your location, creative work and funding preferences to see more relevant
        opportunities. Your profile is private. Creating it does not submit a funding application.
      </p>
      <p className="mt-2 text-[13px] text-[var(--ink-3)]">
        Most questions are optional. We use your answers only to recommend opportunities, never shared
        with funders. You can edit or delete your profile at any time. Read our{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </div>
  )
}
