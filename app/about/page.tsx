import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Ona is a public record of the funding open to Africa’s cultural and creative industries.',
  openGraph: {
    title: 'About Ona',
    description:
      'Ona is a public record of the funding open to Africa’s cultural and creative industries.',
    type: 'website',
  },
}

/** Drop a square photo at public/founder.jpg; a monogram shows until then. */
const FOUNDER = {
  name: 'David Amira',
  role: 'Founder',
  photo: '/founder.jpg',
  bio: [
    'David Amira is a communications strategist based in Nairobi. His background is in pan-African communications and advocacy, spanning media, campaigns and stakeholder work for organisations across the continent.',
    'Over more than a decade working across the continent, he kept noticing the same thing. Opportunity travels through networks, and the people outside those networks tend to hear about it too late, if they hear at all. Ona is his attempt to change who gets to see what.',
  ],
}

const STEPS = [
  {
    title: 'We watch the sources.',
    body: 'Funder websites, open-call pages and grant directories across the continent get checked on a schedule, so new opportunities surface without anyone hunting for them.',
  },
  {
    title: 'We pull out the facts that matter.',
    body: 'Every page is read and reduced to what you actually need: who is funding, how much, who can apply, which sectors, and when it closes.',
  },
  {
    title: 'We throw out what isn’t an opportunity.',
    body: 'Directory pages, news articles and “about us” pages get rejected rather than filed as grants, so the database stays a list of things you can genuinely apply for.',
  },
  {
    title: 'We check the dates.',
    body: 'Closed calls drop out of the default view on their own. Anything closing within a month is flagged, so you see the urgency before the detail.',
  },
  {
    title: 'We show our working.',
    body: 'Every profile carries a “last verified” date and a link to the source, so you can see how current an entry is and check it yourself.',
  },
]

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-5">
      {/* Mission */}
      <section className="border-b border-[var(--line)] py-12 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          About Ona
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
          We put the funding where everyone can see it.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-[var(--ink-2)]">
          Ona is a public record of the funding open to Africa&rsquo;s cultural and
          creative industries. We gather the grants, prizes, residencies and fellowships
          scattered across hundreds of websites, put them in one place, and keep them
          current. Whether you&rsquo;re in Kisumu or Dakar, you see what someone with a
          well-connected inbox sees.
        </p>
        <p className="pull-quote mt-8 text-[var(--ink)]">
          <em>Ona</em>{' '}means &ldquo;see&rdquo; in Swahili. That&rsquo;s the point. Making
          funding visible to the people who should have it.
        </p>
      </section>

      {/* The problem */}
      <section className="border-b border-[var(--line)] py-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
          The problem we&rsquo;re solving
        </h2>
        <div className="mt-5 space-y-4 text-[17px] leading-relaxed text-[var(--ink-2)]">
          <p>
            The money exists. Funders across the continent and beyond put real sums into
            African creative work every year. What doesn&rsquo;t exist is an easy way to
            find it.
          </p>
          <p>
            Opportunities go up on individual funder sites, sit inside newsletters, or
            pass between people who already know each other. Deadlines slip by quietly.
            Calls close before the people they were meant for ever hear about them. Access
            ends up turning on the reach of someone&rsquo;s network rather than the
            strength of their work.
          </p>
          <p>
            That&rsquo;s a solvable problem. We do the looking, so the same information
            reaches everyone at once, in one place, for free.
          </p>
        </div>
      </section>

      {/* How we verify */}
      <section className="border-b border-[var(--line)] py-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
          How we verify
        </h2>
        <p className="mt-3 text-[15px] text-[var(--ink-soft)]">
          A database is only worth using if you can trust it. Here&rsquo;s what happens
          before an entry appears on the site.
        </p>

        <ol className="mt-8 space-y-7">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--ink)] font-[family-name:var(--font-display)] text-base font-semibold"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink-2)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Who's behind Ona */}
      <section className="py-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
          Who&rsquo;s behind Ona
        </h2>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Photo, with a monogram fallback so a missing file never looks broken */}
          <div className="relative h-32 w-32 shrink-0 overflow-hidden border-2 border-[var(--ink)] bg-[var(--paper-deep)]">
            <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-[38px] leading-[1.1] text-[var(--ink)]/25">
              {FOUNDER.name.charAt(0)}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FOUNDER.photo}
              alt={FOUNDER.name}
              className="relative h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {FOUNDER.name}
            </h3>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--terracotta)]">
              {FOUNDER.role}
            </p>

            <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-[var(--ink-2)]">
              {FOUNDER.bio.map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>

            <Link
              href="/contact"
              className="mt-6 inline-block border-2 border-[var(--ink)] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
