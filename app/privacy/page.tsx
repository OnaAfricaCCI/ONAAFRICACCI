import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Ona Funds collects, uses, stores and protects personal information, and the rights you have over it.',
  alternates: { canonical: '/privacy' },
}

/*
 * Two details below are placeholders until confirmed by David:
 *   OPERATOR  — the legal name that runs Ona Funds (a person or a registered entity)
 *   CONTACT   — the email address for privacy requests
 * Everything else describes what the site actually does.
 */
const OPERATOR = 'Ona Funds'
const CONTACT = 'privacy@onafunds.com'
const UPDATED = '10 October 2026'

const SECTIONS = [
  ['who', 'Who we are'],
  ['scope', 'What this policy covers'],
  ['collect', 'What we collect, and why'],
  ['account', 'Account and funding profile'],
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
        Ona Funds is a public information site. You can read everything on it without telling
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
          Ona Funds is a public record of funding open to Africa&rsquo;s cultural and creative
          industries, at onafunds.com. It is operated by {OPERATOR}, who is responsible
          for the personal information described here (the &ldquo;data controller&rdquo;).
          Ona Funds is run from Nairobi, Kenya.
        </p>

        <H2 id="scope">2. What this policy covers</H2>
        <p className="mt-4">
          This policy covers the Ona Funds website and the emails we send. It does not cover the
          websites of funders and other organisations we link to, which have their own
          policies.
        </p>

        <H2 id="collect">3. What we collect, and why</H2>
        <p className="mt-4">
          We only collect information when you choose to give it, and we never buy data about
          you from anyone. The situations are:
        </p>
        <dl className="mt-6">
          <Row label="Your account and profile">
            If you create an account and build a grant-seeker profile, we store your{' '}
            <strong>email address</strong> and the <strong>preferences you enter</strong> so we
            can recommend relevant funding and keep your shortlist. Your individual profile is{' '}
            <strong>private to you and never shown to funders</strong>; we may share only grouped,
            anonymous findings that do not identify you. Because it is the most detailed thing
            we hold, <a href="#account" className="underline underline-offset-4">section 4</a>{' '}
            sets out exactly what we store, how matching works, what we share, and what happens
            when you delete.
          </Row>
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
            We use an analytics service (see section 9) to understand how the site is used:
            which pages are visited, what people search for, and which grants they click
            through to. This is set up <strong>without cookies</strong> and without building a
            profile of you. We see aggregate patterns, not individuals.
          </Row>
        </dl>

        <H2 id="account">4. Account and funding profile</H2>
        <p className="mt-4">
          When you create an account and build a grant-seeker profile, you give us a small
          amount of information about yourself and your work so we can suggest funding that
          fits. Because this is the most detailed information we hold about anyone, this
          section sets out exactly what we store, why, and what we do and do not do with it.
        </p>

        <p className="mt-6 font-bold text-[var(--ink)]">What we store</p>
        <dl className="mt-3">
          <Row label="To sign you in">
            Your <strong>email address</strong>, and a <strong>securely scrambled (hashed)
            form of your password</strong>. We never see or store the password itself.
          </Row>
          <Row label="About you">
            Where you are <strong>currently based</strong> (a preference, kept separate from your
            citizenship and from any registration country); whether you apply as an{' '}
            <strong>individual, informal group or collective, registered organisation or
            non-profit, registered business</strong>, or are <strong>exploring on someone
            else&rsquo;s behalf</strong>; and, if you apply as an organisation, business or
            collective, a <strong>name</strong> you choose to enter.
          </Row>
          <Row label="Your creative work">
            The <strong>creative areas</strong> you work in. If none of the listed areas fit, the
            short <strong>&ldquo;another area&rdquo; text</strong> you type is stored as you wrote
            it and flagged for a person to review &mdash; never silently sorted into a category.
            If you apply as an individual, you may also give your <strong>career stage</strong>
            (optional; &ldquo;not sure&rdquo; is a valid answer).
          </Row>
          <Row label="What you&rsquo;re looking for">
            The <strong>kinds of opportunity</strong> you&rsquo;re interested in (grants, prizes,
            residencies, fellowships, and so on) and your <strong>preferred application
            languages</strong> if you set them.
          </Row>
          <Row label="A little more about you (optional)">
            Over time we may invite you to answer a few optional questions: your{' '}
            <strong>goals and timeframe</strong>, where you&rsquo;d be <strong>willing to take
            part</strong>, your <strong>funding-application experience</strong> and any{' '}
            <strong>barriers</strong> you face, your <strong>citizenship, registration or
            members&rsquo; countries</strong> (stored separately from where you are based), the{' '}
            <strong>typical amount</strong> useful to you, how well our opportunities{' '}
            <strong>fit</strong> what you want (with an optional note), and <strong>actions you
            took</strong> after finding an opportunity. Every one of these is optional, and
            &ldquo;none&rdquo;, &ldquo;not sure&rdquo; and &ldquo;prefer not to say&rdquo; are
            real, stored answers &mdash; distinct from leaving a question blank.
          </Row>
          <Row label="Your shortlist">
            The <strong>opportunities you save</strong>, and the date you saved each one.
          </Row>
          <Row label="Housekeeping">
            Whether your profile is a <strong>draft or completed</strong>, the{' '}
            <strong>dates</strong> it was created and last updated, and a small amount of state so
            we know when to offer those optional questions and not to repeat them &mdash; a{' '}
            <strong>count of return visits</strong> and which optional sets you have{' '}
            <strong>answered or dismissed</strong>.
          </Row>
        </dl>
        <p className="mt-4">
          Everything except your email and password is a preference you type in yourself, and
          you can change or clear any of it. Questions you skip are left blank, never guessed.
        </p>

        <p className="mt-8 font-bold text-[var(--ink)]">Why we collect it</p>
        <p className="mt-3">
          To <strong>recommend funding</strong> that matches the preferences you entered; to keep
          your <strong>shortlist</strong> so it follows you across devices; and to{' '}
          <strong>understand the needs of the people who use Ona Funds</strong> &mdash; the goals,
          barriers and gaps the community tells us about &mdash; so we can improve the service and
          make the case for better support. Building a profile is <strong>not a funding
          application</strong>, and it does not submit you to any funder.
        </p>

        <p className="mt-8 font-bold text-[var(--ink)]">How matching works</p>
        <p className="mt-3">
          Matching is plain and rule-based, not artificial intelligence. We compare the
          preferences you entered, your disciplines, the funding types you want and your
          country of residence, against the facts we already hold about each opportunity: its
          sector, its funding type, and who it is open to. Where they line up, we show the
          opportunity with a short, plain-English note of <em>why</em> it is relevant. We never
          tell you that you are &ldquo;eligible&rdquo;; every suggestion asks you to check the
          funder&rsquo;s own requirements before applying.
        </p>

        <p className="mt-8 font-bold text-[var(--ink)]">Is this automated profiling?</p>
        <p className="mt-3">
          We do rank suggestions automatically from your profile, but this is not the kind of
          automated decision-making that produces a legal or similarly significant effect on
          you. It <strong>makes no decision about you</strong>; it only produces a list of
          suggestions you are free to ignore; it uses only inputs you can see and change; and
          it is fully explainable, since every match shows its reason. There is no hidden
          scoring model and no artificial-intelligence judgement about you.
        </p>

        <p className="mt-8 font-bold text-[var(--ink)]">Do your saved grants or clicks change what we suggest?</p>
        <p className="mt-3">
          No. Recommendations are based <strong>only on the preferences you explicitly enter</strong>
          {' '}in your profile. What you save, click or view does <strong>not</strong> feed into
          them. Your shortlist is simply a private list you curate; we do not analyse it to
          change what we recommend. Some fields we store, such as your preferred language, are
          kept for future use and do not affect recommendations today.
        </p>

        <p className="mt-8 font-bold text-[var(--ink)]">Do funders ever receive it?</p>
        <p className="mt-3">
          <strong>Your individual profile, never.</strong> Your account, your profile and your
          shortlist are private to you: they are stored so that only you, when signed in, can see
          them, and no funder, partner, other user or anyone else is given your individual
          profile for their own use. A funder learns about you as a person only if you choose to
          apply to them directly on their own website, which happens entirely outside Ona Funds.
        </p>
        <p className="mt-3">
          Separately, we may share <strong>grouped findings</strong> with partners and funders
          &mdash; for example, &ldquo;many applicants work in film and face application fees as a
          barrier&rdquo;. These are combined, anonymous summaries across many people that{' '}
          <strong>do not identify you</strong> and never include your name, email or free-text
          answers. We use them to reflect the community&rsquo;s needs in our conversations with
          funders, not to describe any individual.
        </p>

        <p className="mt-8 font-bold text-[var(--ink)]">Deleting your profile or account</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            You can <strong>delete your grant-seeker profile</strong> at any time: the profile
            details are erased, while your account and your saved shortlist remain.
          </li>
          <li>
            You can <strong>delete your whole account</strong> at any time: this erases your
            profile, your saved shortlist and your sign-in details together.
          </li>
          <li>
            Deletion is <strong>real erasure</strong> from our live database, not just hiding;
            once it is done we cannot recover it. We keep your account and its data only for as
            long as you keep the account.
          </li>
        </ul>
        <p className="mt-4">
          You can do all of this yourself when signed in, or ask us to (section 11).
        </p>

        <H2 id="basis">5. Our lawful basis</H2>
        <p className="mt-4">
          For your account and profile, the digest, the contact form and opportunity
          submissions, we process your information because you asked us to. That is your{' '}
          <strong>consent</strong>, which you can withdraw at any time. For analytics, we rely on our{' '}
          <strong>legitimate interest</strong> in understanding and improving a free public
          service, which we&rsquo;ve balanced against your privacy by keeping it cookieless
          and non-identifying.
        </p>

        <H2 id="keep">6. How long we keep it</H2>
        <dl className="mt-6">
          <Row label="Accounts and profiles">
            For as long as you keep your account. You can delete your grant-seeker profile at
            any time (which keeps your account and your saved opportunities), or delete your
            account entirely, which erases everything together (section 4).
          </Row>
          <Row label="Digest subscribers">
            Until you unsubscribe. When you do, we stop sending immediately and mark your
            address inactive; you can ask us to delete it entirely (section 11).
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

        <H2 id="share">7. Who we share it with</H2>
        <p className="mt-4">
          We don&rsquo;t sell, rent or trade personal information, and we don&rsquo;t share it
          with funders or anyone else for their own use. To run the site we rely on a small
          number of service providers who process data on our behalf and under our
          instructions:
        </p>
        <dl className="mt-6">
          <Row label="Supabase">Stores our database, including account, profile, subscriber and message data, and manages sign-in (authentication). EU hosting.</Row>
          <Row label="Vercel">Hosts and serves the website.</Row>
          <Row label="Resend">Delivers the emails we send you.</Row>
          <Row label="PostHog">Provides analytics. EU hosting, configured without cookies.</Row>
        </dl>
        <p className="mt-4">
          The one thing we may share more widely is <strong>grouped, anonymous findings</strong>
          &mdash; combined summaries drawn from many grant-seeker profiles, shared with partners
          and funders to reflect the community&rsquo;s needs. These never identify you and never
          include your name, email or free-text answers. Your individual profile itself is never
          shared. See <a href="#account" className="underline underline-offset-4">section 4</a>.
        </p>
        <p className="mt-4">
          We would disclose information if a law required us to, or to protect the safety
          of a person or the integrity of the site, and in either case only what was
          necessary.
        </p>

        <H2 id="transfer">8. Where it is stored</H2>
        <p className="mt-4">
          Our database and analytics are hosted in the European Union. Our website host and
          email provider operate globally, including in the United States, and are bound by
          contractual commitments to protect personal data to a standard consistent with
          the laws that apply to you, including Kenya&rsquo;s Data Protection Act 2019 and, for
          visitors in Europe, the GDPR.
        </p>

        <H2 id="cookies">9. Cookies and tracking</H2>
        <p className="mt-4">
          <strong>We don&rsquo;t use cookies for tracking or advertising.</strong> That is
          why you don&rsquo;t see a cookie banner. The only things stored on your device are:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>Your light-or-dark mode choice, if you set one. Kept in your browser, never sent to us.</li>
          <li>If you sign in, a secure session so you stay signed in on this device. It is needed to keep you logged in, not for tracking, and signing out removes it.</li>
          <li>Nothing else. Analytics runs in memory only and is discarded when you leave.</li>
        </ul>
        <p className="mt-4">
          Our analytics provider may, where we enable it, record how pages are used (scrolling,
          clicking) to help us improve the design. Anything typed into a form is masked and
          never recorded.
        </p>

        <H2 id="secure">10. How we protect it</H2>
        <p className="mt-4">
          All traffic to the site is encrypted. Personal information is held in a database
          that is not readable from the public internet; it is accessible only to the site&rsquo;s
          own server and to us. Forms are protected against automated abuse. Access to our
          provider accounts is protected by two-factor authentication. No system is perfectly
          secure, but we treat your information with the care we&rsquo;d want for our own.
        </p>

        <H2 id="rights">11. Your rights</H2>
        <p className="mt-4">Whatever law applies to you, we offer everyone the same rights:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li><strong>Access</strong>. Ask what we hold about you, and receive a copy.</li>
          <li><strong>Correction</strong>. Ask us to fix anything inaccurate.</li>
          <li><strong>Deletion</strong>. Ask us to erase your information.</li>
          <li><strong>Withdrawal</strong>. Unsubscribe from the digest at any time via the link in every email.</li>
          <li><strong>Objection and restriction</strong>. Ask us to stop or limit how we use your information.</li>
          <li><strong>Complaint</strong>. Raise a concern with your data protection authority. In Kenya that is the Office of the Data Protection Commissioner.</li>
        </ul>
        <p className="mt-4">
          To exercise any of these, email us (section 15). We&rsquo;ll respond within 30 days
          and won&rsquo;t charge you.
        </p>

        <H2 id="children">12. Children</H2>
        <p className="mt-4">
          Ona Funds is intended for adults. We don&rsquo;t knowingly collect information from anyone
          under 18. If you believe a child has given us information, contact us and we&rsquo;ll
          delete it.
        </p>

        <H2 id="links">13. Links to other sites</H2>
        <p className="mt-4">
          Grant listings and funder profiles link to organisations&rsquo; own websites. We check
          those links work, but we don&rsquo;t control those sites and this policy doesn&rsquo;t
          cover them.
        </p>

        <H2 id="changes">14. Changes to this policy</H2>
        <p className="mt-4">
          If we change how we handle personal information, we&rsquo;ll update this page and the
          date at the top. For significant changes affecting digest subscribers, we&rsquo;ll say
          so in the digest itself.
        </p>

        <H2 id="contact">15. How to contact us</H2>
        <p className="mt-4">
          For anything about your information, whether a request to see, correct or delete
          it or a question about this policy, email{' '}
          <a href={`mailto:${CONTACT}`} className="underline underline-offset-4">
            {CONTACT}
          </a>
          . For anything else, write to{' '}
          <a href="mailto:hello@onafunds.com" className="underline underline-offset-4">
            hello@onafunds.com
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
