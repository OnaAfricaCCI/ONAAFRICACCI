import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Ona collects, uses, stores and protects personal information, and the rights you have over it.',
  alternates: { canonical: '/privacy' },
}

/*
 * Two details below are placeholders until confirmed by David:
 *   OPERATOR  — the legal name that runs Ona (a person or a registered entity)
 *   CONTACT   — the email address for privacy requests
 * Everything else describes what the site actually does.
 */
const OPERATOR = 'Ona'
const CONTACT = 'privacy@onafunds.com'
const UPDATED = '22 September 2026'

const SECTIONS = [
  ['who', 'Who we are'],
  ['scope', 'What this policy covers'],
  ['collect', 'What we collect, and why'],
  ['basis', 'Our lawful basis'],
  ['keep', 'How long we keep it'],
  ['share', 'Who we share it with'],
  ['transfer', 'Where it is stored'],
  ['cookies', 'Cookies and tracking'],
  ['secure', 'How we protect it'],
  ['rights', 'Your rights'],
  ['children', 'Children'],
  ['links', 'Links to other sites'],
  ['changes', 'Changes to this policy'],
  ['contact', 'How to contact us'],
] as const

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-28 font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
      {children}
    </h2>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-[var(--border)] py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">{label}</dt>
      <dd className="text-[15px] leading-relaxed">{children}</dd>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">Privacy Policy</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
        Your information, plainly.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[var(--ink-2)]">
        Ona is a public information site. You can read everything on it without telling
        us who you are. This policy explains the small amount of personal information we
        collect when you choose to give it, what we do with it, and the control you have.
      </p>
      <p className="mt-3 text-sm text-[var(--ink-3)]">Last updated {UPDATED}</p>

      {/* Contents */}
      <nav aria-label="Contents" className="mt-10 border-2 border-[var(--border)] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">Contents</p>
        <ol className="mt-3 grid gap-1.5 text-[15px] sm:grid-cols-2">
          {SECTIONS.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="underline underline-offset-4">
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="text-[17px] leading-relaxed text-[var(--ink-2)]">
        <H2 id="who">1. Who we are</H2>
        <p className="mt-4">
          Ona is a public record of funding open to Africa&rsquo;s cultural and creative
          industries, at onafunds.com. It is operated by {OPERATOR}, who is responsible
          for the personal information described here (the &ldquo;data controller&rdquo;).
          Ona is run from Nairobi, Kenya.
        </p>

        <H2 id="scope">2. What this policy covers</H2>
        <p className="mt-4">
          This policy covers the Ona website and the emails we send. It does not cover the
          websites of funders and other organisations we link to, which have their own
          policies.
        </p>

        <H2 id="collect">3. What we collect, and why</H2>
        <p className="mt-4">
          We collect information in three situations, all of them your choice. We don&rsquo;t
          collect anything else about you, and we never buy data about you from anyone.
        </p>
        <dl className="mt-6">
          <Row label="Weekly digest">
            If you subscribe, we store your <strong>email address</strong> and any{' '}
            <strong>sector or country preferences</strong> you set. We use them to send you
            the digest and to tailor it to your preferences. Nothing else.
          </Row>
          <Row label="Contact form">
            If you write to us, we store your <strong>name, email address and message</strong>{' '}
            so we can read it and reply.
          </Row>
          <Row label="Listing an opportunity">
            If you submit a funding opportunity, we store the{' '}
            <strong>details you provide and your contact email</strong> so we can review the
            listing and reach you with any questions before publishing it.
          </Row>
          <Row label="Visiting the site">
            We use an analytics service (see section 8) to understand how the site is used:
            which pages are visited, what people search for, and which grants they click
            through to. This is set up <strong>without cookies</strong> and without building a
            profile of you. We see aggregate patterns, not individuals.
          </Row>
        </dl>

        <H2 id="basis">4. Our lawful basis</H2>
        <p className="mt-4">
          For the digest, contact form and opportunity submissions, we process your
          information because you asked us to — your <strong>consent</strong>, which you can
          withdraw at any time. For analytics, we rely on our{' '}
          <strong>legitimate interest</strong> in understanding and improving a free public
          service, which we&rsquo;ve balanced against your privacy by keeping it cookieless
          and non-identifying.
        </p>

        <H2 id="keep">5. How long we keep it</H2>
        <dl className="mt-6">
          <Row label="Digest subscribers">
            Until you unsubscribe. When you do, we stop sending immediately and mark your
            address inactive; you can ask us to delete it entirely (section 10).
          </Row>
          <Row label="Messages and submissions">
            For as long as needed to deal with them, and no longer than{' '}
            <strong>24 months</strong>, after which they are deleted.
          </Row>
          <Row label="Analytics">
            Retained in aggregate. No individual profiles are created, so there is nothing
            about you specifically to retain.
          </Row>
        </dl>

        <H2 id="share">6. Who we share it with</H2>
        <p className="mt-4">
          We don&rsquo;t sell, rent or trade personal information, and we don&rsquo;t share it
          with funders or anyone else for their own use. To run the site we rely on a small
          number of service providers who process data on our behalf and under our
          instructions:
        </p>
        <dl className="mt-6">
          <Row label="Supabase">Stores our database, including subscriber and message data. EU hosting.</Row>
          <Row label="Vercel">Hosts and serves the website.</Row>
          <Row label="Resend">Delivers the emails we send you.</Row>
          <Row label="PostHog">Provides analytics. EU hosting, configured without cookies.</Row>
        </dl>
        <p className="mt-4">
          We would disclose information if a law required us to, or to protect the safety
          of a person or the integrity of the site — and in either case only what was
          necessary.
        </p>

        <H2 id="transfer">7. Where it is stored</H2>
        <p className="mt-4">
          Our database and analytics are hosted in the European Union. Our website host and
          email provider operate globally, including in the United States, and are bound by
          contractual commitments to protect personal data to a standard consistent with
          the laws that apply to you, including Kenya&rsquo;s Data Protection Act 2019 and, for
          visitors in Europe, the GDPR.
        </p>

        <H2 id="cookies">8. Cookies and tracking</H2>
        <p className="mt-4">
          <strong>We don&rsquo;t use cookies for tracking or advertising.</strong> That is
          why you don&rsquo;t see a cookie banner. The only things stored on your device are:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>Your light-or-dark mode choice, if you set one — kept in your browser, never sent to us.</li>
          <li>Nothing else. Analytics runs in memory only and is discarded when you leave.</li>
        </ul>
        <p className="mt-4">
          Our analytics provider may, where we enable it, record how pages are used (scrolling,
          clicking) to help us improve the design. Anything typed into a form is masked and
          never recorded.
        </p>

        <H2 id="secure">9. How we protect it</H2>
        <p className="mt-4">
          All traffic to the site is encrypted. Personal information is held in a database
          that is not readable from the public internet; it is accessible only to the site&rsquo;s
          own server and to us. Forms are protected against automated abuse. Access to our
          provider accounts is protected by two-factor authentication. No system is perfectly
          secure, but we treat your information with the care we&rsquo;d want for our own.
        </p>

        <H2 id="rights">10. Your rights</H2>
        <p className="mt-4">Whatever law applies to you, we offer everyone the same rights:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li><strong>Access</strong> — ask what we hold about you, and receive a copy.</li>
          <li><strong>Correction</strong> — ask us to fix anything inaccurate.</li>
          <li><strong>Deletion</strong> — ask us to erase your information.</li>
          <li><strong>Withdrawal</strong> — unsubscribe from the digest at any time via the link in every email.</li>
          <li><strong>Objection and restriction</strong> — ask us to stop or limit how we use your information.</li>
          <li><strong>Complaint</strong> — raise a concern with your data protection authority. In Kenya that is the Office of the Data Protection Commissioner.</li>
        </ul>
        <p className="mt-4">
          To exercise any of these, email us (section 14). We&rsquo;ll respond within 30 days
          and won&rsquo;t charge you.
        </p>

        <H2 id="children">11. Children</H2>
        <p className="mt-4">
          Ona is intended for adults. We don&rsquo;t knowingly collect information from anyone
          under 18. If you believe a child has given us information, contact us and we&rsquo;ll
          delete it.
        </p>

        <H2 id="links">12. Links to other sites</H2>
        <p className="mt-4">
          Grant listings and funder profiles link to organisations&rsquo; own websites. We check
          those links work, but we don&rsquo;t control those sites and this policy doesn&rsquo;t
          cover them.
        </p>

        <H2 id="changes">13. Changes to this policy</H2>
        <p className="mt-4">
          If we change how we handle personal information, we&rsquo;ll update this page and the
          date at the top. For significant changes affecting digest subscribers, we&rsquo;ll say
          so in the digest itself.
        </p>

        <H2 id="contact">14. How to contact us</H2>
        <p className="mt-4">
          For anything about your information, email{' '}
          <a href={`mailto:${CONTACT}`} className="underline underline-offset-4">
            {CONTACT}
          </a>{' '}
          or use the{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact form
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
