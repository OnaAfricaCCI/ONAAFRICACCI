import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'The terms that govern your use of Ona Funds — what the service is, what it does and does not do, and the rules for using it.',
  alternates: { canonical: '/terms' },
}

const UPDATED = '6 October 2026'

/*
 * Two details below are placeholders until confirmed by David / legal, matching
 * the Privacy Policy:
 *   OPERATOR identity — the legal name/entity that runs Ona Funds (the Terms
 *     deliberately say only "operated from Nairobi, Kenya"; confirm before any
 *     dispute or contract relies on it).
 *   CONTACT addresses — hello@onafunds.com and privacy@onafunds.com must exist
 *     and be monitored.
 * Governing law is stated as Kenya; confirm with legal.
 */

type Block = { p: string } | { ul: string[] } | { ol: string[] }
type Section = { id: string; title: string; blocks: Block[] }

const INTRO: string[] = [
  'These Terms of Use (“Terms”) govern your access to and use of onafunds.com, including our funding database, funder directory, personalised funding tools, saved opportunities, email communications, opportunity-submission tools and any other features or services we make available through the website (together, the “Service”).',
  'Please read these Terms carefully. By accessing or using Ona Funds, creating an account, submitting an opportunity or otherwise using the Service, you agree to these Terms. If you do not agree to them, please do not use the Service.',
]

const SECTIONS: Section[] = [
  {
    id: 'about', title: '1. About Ona Funds', blocks: [
      { p: 'Ona Funds (“we”, “us” or “our”) is a funding-discovery platform focused on opportunities relevant to Africa’s cultural and creative industries, including African creatives and organisations on the continent and in the diaspora.' },
      { p: 'We collect, organise, summarise and make searchable information about grants, prizes, residencies, fellowships, investment opportunities and other forms of support. We also provide information about organisations that fund or support creative work.' },
      { p: 'Ona Funds is operated from Nairobi, Kenya. You can contact us at hello@onafunds.com.' },
    ],
  },
  {
    id: 'what', title: '2. What Ona Funds does, and what it does not', blocks: [
      { p: 'Ona Funds is an information and discovery service. Unless we expressly state otherwise in relation to a particular service, Ona Funds:' },
      { ul: [
        'is not a funder, grant-maker or investment provider;',
        'does not administer the funding opportunities listed on the Service;',
        'does not accept funding applications on behalf of the organisations listed;',
        'does not decide who is eligible for, shortlisted for or awarded funding;',
        'does not act as an agent, representative, partner or intermediary of a listed funder merely because that funder or its opportunity appears on Ona Funds;',
        'does not guarantee that any user will qualify for, obtain or receive funding; and',
        'does not provide legal, financial, tax, investment or professional advice.',
      ] },
      { p: 'Where Ona Funds identifies, recommends, ranks, filters or otherwise surfaces opportunities that may be relevant to you, this is intended to help you discover opportunities. It is not a determination that you are eligible and is not a recommendation by the funder.' },
      { p: 'Creating an Ona Funds profile, saving an opportunity or receiving a match or recommendation from Ona Funds does not constitute an application for funding. Applications must be made through the process specified by the relevant funder or opportunity provider.' },
    ],
  },
  {
    id: 'information', title: '3. Our funding information', blocks: [
      { p: 'We take the quality of the information on Ona Funds seriously. We review opportunities using sources we consider reasonably reliable, including funder websites, official programme pages and other publicly available sources. We may record when a source or link was last checked.' },
      { p: 'However, funding information changes. Funders may change, extend or withdraw deadlines, eligibility requirements, award amounts, programme rules, geographic restrictions, application procedures or entire opportunities without notifying us. Information on Ona Funds may therefore occasionally be incomplete, outdated, incorrectly interpreted or affected by an error despite our efforts to keep it accurate.' },
      { p: 'A “last checked”, “last verified”, “link checked” or similar date means that Ona Funds checked the relevant information or source around that date. It does not guarantee that the information remains unchanged after that date.' },
      { p: 'Before spending money, preparing an application, travelling, entering into commitments or relying on an opportunity, you should always check the original funder’s current rules and official application page. Where information on Ona Funds differs from information published by the funder, the funder’s current official information takes precedence.' },
      { p: 'If you notice information that appears incorrect or outdated, please tell us at hello@onafunds.com.' },
    ],
  },
  {
    id: 'deadlines', title: '4. Deadlines', blocks: [
      { p: 'Deadline information deserves particular care. Dates displayed on Ona Funds are provided for discovery and planning purposes. Unless expressly stated otherwise, a deadline displayed by Ona Funds should not be treated as a guarantee that applications will be accepted until that time.' },
      { p: 'Deadlines may be subject to time zones, submission-system cut-offs, early closure, extensions, quotas or other conditions determined by the funder. You are responsible for confirming the applicable deadline directly with the funder and submitting your application in sufficient time.' },
      { p: 'Ona Funds is not responsible for a missed application, lost opportunity or other loss arising from reliance on a deadline displayed on the Service where the underlying funder’s information or circumstances have changed.' },
    ],
  },
  {
    id: 'eligibility', title: '5. Eligibility information', blocks: [
      { p: 'Ona Funds may summarise who an opportunity appears to be open to, including by country, region, discipline, organisation type, career stage or other criteria. These summaries are intended to make opportunities easier to discover. They are not definitive eligibility assessments.' },
      { p: 'Funders may apply detailed conditions that cannot reasonably be captured in a short listing, including nationality, residence, registration status, project location, partnership, language, age, experience, financial, organisational or other requirements. You are responsible for reviewing the funder’s complete eligibility rules before applying.' },
    ],
  },
  {
    id: 'matches', title: '6. Personalised funding matches', blocks: [
      { p: 'Ona Funds may allow you to provide information about yourself, your organisation or your work so that we can surface opportunities that appear relevant to you. Our matching tools may use information such as your location, sector, discipline, career stage, organisation type, funding interests and other profile information.' },
      { p: 'A match means only that information available to Ona Funds suggests there may be some correspondence between your profile and an opportunity. A match does not mean:' },
      { ul: [
        'that you satisfy every eligibility criterion;',
        'that Ona Funds has assessed your application;',
        'that the funder has reviewed or approved your profile;',
        'that the funder knows you have been matched;',
        'that you are likely to receive funding; or',
        'that applying is necessarily appropriate for your circumstances.',
      ] },
      { p: 'Always review the funder’s complete criteria yourself. Unless we expressly tell you otherwise, your Ona Funds profile is not shared with funders merely because you have been matched with, viewed or saved their opportunity. Our handling of personal information is explained in our Privacy Policy.' },
    ],
  },
  {
    id: 'accounts', title: '7. Accounts', blocks: [
      { p: 'Some features may require an Ona Funds account. You must provide information that is accurate and reasonably current and must not impersonate another person or organisation.' },
      { p: 'You are responsible for maintaining the security of your account and for activity occurring through it. If you believe someone has accessed your account without permission, contact us promptly.' },
      { p: 'We may suspend or restrict an account where we reasonably believe it is being used fraudulently, unlawfully, abusively, in breach of these Terms or in a manner that threatens the Service or other users. You may request deletion of your account in accordance with the options provided through the Service or by contacting us.' },
    ],
  },
  {
    id: 'saved', title: '8. Saved opportunities, alerts and emails', blocks: [
      { p: 'Ona Funds may allow you to save opportunities and receive reminders, recommendations, deadline alerts, newsletters or other communications. These features are intended as conveniences, not as guaranteed notification services.' },
      { p: 'Email delivery and automated notifications can be delayed, blocked, misclassified, interrupted or otherwise fail for reasons outside our control. You remain responsible for monitoring opportunities and deadlines that matter to you. You should not rely exclusively on an Ona Funds email, alert or reminder to meet an application deadline.' },
      { p: 'Where a communication is optional, you may unsubscribe using the mechanism provided in that communication.' },
    ],
  },
  {
    id: 'submit', title: '9. Submitting an opportunity', blocks: [
      { p: 'Funders, organisations and other users may submit opportunities for possible inclusion on Ona Funds. By submitting an opportunity, you confirm that:' },
      { ol: [
        'the information you provide is accurate to the best of your knowledge;',
        'you have authority to provide it;',
        'the submission is not fraudulent, deceptive or misleading;',
        'any links, contact details and supporting information you provide may lawfully be supplied to us;',
        'the opportunity does not unlawfully discriminate, deceive, exploit or defraud applicants; and',
        'our publication of the information in accordance with these Terms will not knowingly violate another person’s rights.',
      ] },
      { p: 'Submission does not guarantee publication. Ona Funds may verify, edit, summarise, categorise, decline, remove or update a submitted opportunity at our discretion in order to maintain the quality and usefulness of the database. Where appropriate, we may contact the submitter or organisation to verify information.' },
      { p: 'If you submit information that is intended to be publicly displayed as part of an opportunity, you grant Ona Funds a worldwide, non-exclusive, royalty-free licence to host, reproduce, adapt, summarise, format and display that information for the purpose of operating and promoting the Service. You retain ownership of any rights you otherwise hold in your submission.' },
    ],
  },
  {
    id: 'funders', title: '10. Funders and organisation profiles', blocks: [
      { p: 'Ona Funds contains information about third-party funders, foundations, companies, public institutions, cultural organisations and other entities. Unless expressly stated otherwise, inclusion of an organisation on Ona Funds does not mean that the organisation:' },
      { ul: [
        'sponsors Ona Funds;',
        'endorses Ona Funds;',
        'is affiliated with Ona Funds;',
        'has approved its Ona Funds profile; or',
        'has authorised Ona Funds to act on its behalf.',
      ] },
      { p: 'Similarly, Ona Funds’ inclusion of an organisation or opportunity does not constitute an endorsement by Ona Funds of that organisation, its conduct or its programme.' },
      { p: 'Names, logos and trade marks belonging to third parties remain the property of their respective owners. Their use for identification or informational purposes does not imply affiliation or endorsement. If you represent an organisation listed on Ona Funds and believe information about it is inaccurate, please contact hello@onafunds.com.' },
    ],
  },
  {
    id: 'thirdparty', title: '11. Third-party websites and applications', blocks: [
      { p: 'Ona Funds links to funder websites, application portals and other third-party services. Those websites are not controlled by Ona Funds. When you leave Ona Funds, the third party’s terms, privacy practices, security arrangements and application rules apply.' },
      { p: 'We are not responsible for the availability, security, content, conduct or practices of third-party websites or for any transaction, communication, application or relationship between you and a third party. A link from Ona Funds does not itself constitute an endorsement.' },
      { p: 'You should take reasonable care before providing personal information, documents, payment details or other sensitive information to any external website.' },
    ],
  },
  {
    id: 'fraud', title: '12. Fraud and suspicious opportunities', blocks: [
      { p: 'We aim to list legitimate funding opportunities, but no database can eliminate every risk of fraud, impersonation or malicious third-party activity.' },
      { p: 'Be cautious if anyone claiming to represent a funder asks you to make an unusual payment, disclose passwords, provide unnecessary financial credentials, transfer money to a personal account or communicate through suspicious channels. Ona Funds will never guarantee that paying a fee will result in you receiving a grant.' },
      { p: 'If you encounter a suspicious opportunity or communication associated with something listed on Ona Funds, please report it to hello@onafunds.com. We may investigate, flag, suspend or remove a listing where we reasonably believe there is a risk to users.' },
    ],
  },
  {
    id: 'ip', title: '13. Intellectual property', blocks: [
      { p: 'The Ona Funds name, brand, design, interface, software, original written material, database structure, categorisation system, selection and arrangement of information, and other original elements of the Service are owned by or licensed to Ona Funds and are protected by applicable intellectual-property laws. Underlying factual information about third-party opportunities remains subject to any rights that may apply to its original source.' },
      { p: 'You may use Ona Funds for your own personal or internal organisational funding research. You may share links to individual Ona Funds pages and make reasonable quotations or references to Ona Funds in accordance with applicable law.' },
      { p: 'You may not, without our prior written permission:' },
      { ul: [
        'reproduce or republish substantial portions of the Ona Funds database;',
        'systematically copy, scrape, crawl, harvest or extract Ona Funds content;',
        'use automated means to build or populate a competing or substantially similar funding database from Ona Funds;',
        'sell, license, sublicense or commercially redistribute Ona Funds’ database or substantial parts of it;',
        'remove copyright, trade mark or other proprietary notices;',
        'falsely represent Ona Funds content as your own;',
        'circumvent technical measures designed to protect the Service; or',
        'use Ona Funds’ content to train, develop or populate a commercial dataset, model, search product or competing service through systematic extraction, except where applicable law gives you a right that cannot lawfully be restricted.',
      ] },
      { p: 'Nothing in these Terms prevents ordinary search-engine indexing or lawful uses that cannot be restricted under applicable law. If you would like to license, syndicate, research with or otherwise make substantial use of Ona Funds data, contact hello@onafunds.com.' },
    ],
  },
  {
    id: 'acceptable', title: '14. Acceptable use', blocks: [
      { p: 'You must not use Ona Funds:' },
      { ul: [
        'unlawfully or fraudulently;',
        'to impersonate another person or organisation;',
        'to submit false or fabricated opportunities;',
        'to distribute malware or malicious code;',
        'to probe, attack or interfere with the security or operation of the Service;',
        'to obtain unauthorised access to another user’s account or data;',
        'to overload or materially disrupt the Service;',
        'to circumvent access controls or rate limits;',
        'to harvest personal information about users;',
        'to send spam or unsolicited commercial communications;',
        'to mislead people into believing you represent Ona Funds or a listed funder; or',
        'in a manner that infringes the intellectual-property, privacy or other legal rights of another person.',
      ] },
      { p: 'We may take reasonable technical and legal measures to prevent misuse.' },
    ],
  },
  {
    id: 'privacy', title: '15. Privacy', blocks: [
      { p: 'Your privacy is important to us. Our Privacy Policy explains what personal information we collect, why we collect it, how it is used, the service providers involved and the rights available to you.' },
      { p: 'The Privacy Policy forms part of the framework governing your use of Ona Funds, but where privacy or data-protection law gives you rights that cannot be waived by contract, those rights remain unaffected by these Terms.' },
    ],
  },
  {
    id: 'availability', title: '16. Availability and changes to the Service', blocks: [
      { p: 'We want Ona Funds to be useful and available, but we do not promise uninterrupted or error-free operation. We may add, change, suspend or discontinue features where reasonably necessary to improve, maintain, secure or develop the Service.' },
      { p: 'We may also remove or archive listings where opportunities close, information becomes unreliable or maintaining the listing is no longer appropriate. Where a material change significantly affects registered users, we will take reasonable steps to communicate it where appropriate.' },
    ],
  },
  {
    id: 'nofunding', title: '17. No guarantee of funding', blocks: [
      { p: 'Finding an opportunity through Ona Funds does not guarantee funding. Funding decisions are made by third parties according to their own criteria, processes and discretion. Ona Funds has no control over whether a funder:' },
      { ul: [
        'accepts your application;',
        'considers you eligible;',
        'shortlists you;',
        'communicates with you;',
        'changes or cancels an opportunity; or',
        'awards or pays funding.',
      ] },
      { p: 'You remain responsible for deciding whether to apply and for the accuracy, quality and timely submission of your application.' },
    ],
  },
  {
    id: 'disclaimer', title: '18. Disclaimer', blocks: [
      { p: 'We provide Ona Funds with the aim of making funding information easier to discover and understand. To the extent permitted by applicable law, the Service and its content are provided on an “as available” basis.' },
      { p: 'We do not warrant that every listing will at all times be complete, current or error-free, or that every potentially relevant funding opportunity will appear on Ona Funds. Nothing in these Terms excludes any warranty, right or remedy that applicable law does not permit us to exclude.' },
    ],
  },
  {
    id: 'liability', title: '19. Limitation of liability', blocks: [
      { p: 'Nothing in these Terms excludes or limits liability where doing so would be unlawful, including liability that cannot lawfully be excluded under applicable consumer-protection law.' },
      { p: 'Subject to that qualification, Ona Funds will not be liable for indirect, incidental, special or consequential loss arising from your use of, or inability to use, the Service, including loss arising from:' },
      { ul: [
        'an unsuccessful funding application;',
        'a missed or changed deadline;',
        'changed eligibility criteria;',
        'withdrawal or cancellation of an opportunity;',
        'inaccurate information supplied by a third party;',
        'reliance on a funding match or recommendation;',
        'the conduct of a funder or other third party;',
        'interruption of the Service or an alert; or',
        'your dealings with an external website.',
      ] },
      { p: 'You remain responsible for independently checking information that is material to an application, financial decision, contractual commitment or other significant decision. Nothing in this section is intended to excuse Ona Funds from responsibility for its own fraud, wilful misconduct or any liability that applicable law says cannot be excluded or limited.' },
    ],
  },
  {
    id: 'indemnity', title: '20. Indemnity for misuse', blocks: [
      { p: 'If you use Ona Funds on behalf of a business, organisation or other legal entity, or submit opportunities in a professional capacity, you agree, to the extent permitted by law, to indemnify Ona Funds against third-party claims, losses and reasonable costs arising directly from:' },
      { ul: [
        'information you submitted that you knew was materially false or unlawful;',
        'your infringement of another person’s intellectual-property or other legal rights;',
        'your fraudulent or unlawful use of the Service; or',
        'a material breach of these Terms.',
      ] },
      { p: 'This provision does not apply to the extent a claim was caused by Ona Funds’ own unlawful conduct.' },
    ],
  },
  {
    id: 'termination', title: '21. Suspension and termination', blocks: [
      { p: 'We may suspend, restrict or terminate access to all or part of the Service where reasonably necessary because of:' },
      { ul: [
        'a material or repeated breach of these Terms;',
        'fraud or suspected fraud;',
        'security threats;',
        'unlawful activity;',
        'abuse of the Service;',
        'infringement of another person’s rights; or',
        'a legal or regulatory requirement.',
      ] },
      { p: 'Where reasonably practicable, we may provide notice or an opportunity to address the issue. You may stop using Ona Funds at any time.' },
      { p: 'Provisions which by their nature should continue after termination, including intellectual-property, liability and governing-law provisions, will survive.' },
    ],
  },
  {
    id: 'changes', title: '22. Changes to these Terms', blocks: [
      { p: 'Ona Funds will evolve, and these Terms may need to evolve with it. We may update these Terms to reflect new features, changes in law, security requirements or changes to how the Service operates.' },
      { p: 'The current version and its effective date will be published on this page. If a change materially affects registered users’ rights or obligations, we will take reasonable steps to provide notice before or when the change takes effect.' },
      { p: 'Continued use of the Service after an updated version becomes effective constitutes acceptance of the revised Terms to the extent permitted by applicable law.' },
    ],
  },
  {
    id: 'law', title: '23. Governing law and disputes', blocks: [
      { p: 'These Terms are governed by the laws of the Republic of Kenya, without prejudice to any mandatory rights you may have under the laws applicable to you.' },
      { p: 'If a dispute arises, we encourage you to contact us first at hello@onafunds.com so that we can try to resolve it informally. If a dispute cannot be resolved informally, the courts of Kenya will have jurisdiction, subject to any mandatory jurisdiction or consumer rights that applicable law gives you.' },
    ],
  },
  {
    id: 'general', title: '24. General provisions', blocks: [
      { p: 'If any provision of these Terms is found to be unlawful or unenforceable, the remaining provisions will continue to apply to the fullest extent permitted by law. Our failure to enforce a provision immediately does not waive our right to enforce it later.' },
      { p: 'You may not transfer your rights under these Terms to another person without our consent. We may transfer our rights and obligations in connection with a restructuring, incorporation, sale, merger or transfer of the Ona Funds service, provided this does not unlawfully reduce your rights.' },
      { p: 'These Terms, together with the Privacy Policy and any additional terms expressly applicable to a particular Ona Funds service, constitute the agreement governing your use of the Service.' },
    ],
  },
  {
    id: 'contact', title: '25. Contact', blocks: [
      { p: 'Questions about these Terms, corrections to listings, rights enquiries and other notices can be sent to Ona Funds, Nairobi, Kenya — hello@onafunds.com.' },
      { p: 'For privacy and personal-data enquiries: privacy@onafunds.com.' },
    ],
  },
]

function linkify(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(hello@onafunds\.com|privacy@onafunds\.com|Privacy Policy)/g)
  return parts.map((part, i) => {
    if (part === 'hello@onafunds.com' || part === 'privacy@onafunds.com') {
      return <a key={`${keyBase}-${i}`} href={`mailto:${part}`} className="underline underline-offset-4">{part}</a>
    }
    if (part === 'Privacy Policy') {
      return <Link key={`${keyBase}-${i}`} href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
    }
    return <span key={`${keyBase}-${i}`}>{part}</span>
  })
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">Terms of Use</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
        The rules of the road.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[var(--ink-2)]">
        Welcome to Ona Funds. These Terms set out what the Service is, what it does and does not do, and
        how you may use it. In short: Ona Funds helps you discover funding, but it is not the funder, and you
        should always confirm the details with the funder before you apply.
      </p>
      <p className="mt-3 text-sm text-[var(--ink-3)]">Last updated {UPDATED}</p>

      {/* Contents */}
      <nav aria-label="Contents" className="mt-10 border-2 border-[var(--border)] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">Contents</p>
        <ol className="mt-3 grid gap-1.5 text-[15px] sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline underline-offset-4">{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 text-[17px] leading-relaxed text-[var(--ink-2)]">
        {INTRO.map((p, i) => (
          <p key={`intro-${i}`} className={i === 0 ? '' : 'mt-4'}>{linkify(p, `intro-${i}`)}</p>
        ))}

        {SECTIONS.map((s) => (
          <section key={s.id}>
            <h2 id={s.id} className="mt-12 scroll-mt-28 font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
              {s.title}
            </h2>
            {s.blocks.map((b, i) => {
              if ('p' in b) return <p key={`${s.id}-${i}`} className="mt-4">{linkify(b.p, `${s.id}-${i}`)}</p>
              if ('ul' in b) return (
                <ul key={`${s.id}-${i}`} className="mt-3 list-disc space-y-1.5 pl-6">
                  {b.ul.map((li, j) => <li key={`${s.id}-${i}-${j}`}>{linkify(li, `${s.id}-${i}-${j}`)}</li>)}
                </ul>
              )
              return (
                <ol key={`${s.id}-${i}`} className="mt-3 list-decimal space-y-1.5 pl-6">
                  {b.ol.map((li, j) => <li key={`${s.id}-${i}-${j}`}>{linkify(li, `${s.id}-${i}-${j}`)}</li>)}
                </ol>
              )
            })}
          </section>
        ))}
      </div>
    </main>
  )
}
