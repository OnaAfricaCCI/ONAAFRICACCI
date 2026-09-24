import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import Analytics from "./components/Analytics";
import BackToTop from "./components/BackToTop";
import NavLinks from "./components/NavLinks";
import { Logo, LogoSymbol } from "./components/Logo";
import ThemeToggle, { THEME_INIT_SCRIPT } from "./components/ThemeToggle";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, SITE_DEFINITION } from "@/lib/site";
import "./globals.css";

// Real Ona profile URLs. Leave a value empty ("") and that icon is hidden
// rather than sending people to a platform's homepage.
const SOCIAL = {
  instagram: "",
  linkedin: "",
};

const CONTACT_EMAIL = "hello@onafunds.com";

// Display: a geometric sans built on true circles and a single-storey a, the
// same logic as the wordmark. 800 for headlines, 500 for statements.
const display = Outfit({
  variable: "--font-display",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
});

// Body, UI, listings and figures. 900 caps carry the labels.
const body = Source_Sans_3({
  variable: "--font-body",
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: SITE_TITLE,
    template: "%s · Ona Funds",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DEFINITION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
  },
  robots: { index: true, follow: true },
  verification: { google: "3d_p8pZxx2dyrU9GRkbaKQdWqYhNK2gDdlpwac7TpJQ" },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DEFINITION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      {/* Browser extensions (Grammarly et al.) inject attributes into <body>
          before hydration; ignore those rather than warn on every load. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--ink)] font-[family-name:var(--font-body)]"
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#org`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  description: SITE_DEFINITION,
                  areaServed: "Africa",
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#site`,
                  url: SITE_URL,
                  name: SITE_TITLE,
                  description: SITE_DESCRIPTION,
                  publisher: { "@id": `${SITE_URL}/#org` },
                  inLanguage: "en",
                },
              ],
            }),
          }}
        />
        {/* The nav sits on ink whatever the theme: the lockup is designed to be
            reversed out of a dark surface, and it keeps the ivory page below it
            clean for the motif. */}
        <header className="sticky top-0 z-30 bg-[#121412] text-[#f6f4ec]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
            <Link href="/" aria-label="Ona Funds, home" className="blink-open shrink-0">
              <Logo tone="ivory" width={124} />
            </Link>
            <div className="flex w-full min-w-0 items-center justify-between gap-4 sm:w-auto">
              <NavLinks />
              <Link
                href="/#digest"
                className="hidden bg-[var(--accent)] px-4 py-2.5 text-[13px] font-bold text-[#121412] transition-colors hover:bg-[#f6f4ec] lg:inline-block"
              >
                Get the digest
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-24 bg-[#121412] text-[#f6f4ec]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5 py-10">
            <div className="flex flex-col gap-3">
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight sm:text-3xl">
                Funding the culture shouldn&rsquo;t depend on knowing the right people.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8fa487]">
                <LogoSymbol tone="ivory" size={18} title="Ona Funds" />
                <span>Ona Funds</span>
                <Link href="/about" className="transition-colors hover:text-[var(--accent)]">
                  About
                </Link>
                <Link href="/contact" className="transition-colors hover:text-[var(--accent)]">
                  Contact
                </Link>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition-colors hover:text-[var(--accent)]"
                >
                  {CONTACT_EMAIL}
                </a>
                <Link href="/privacy" className="transition-colors hover:text-[var(--accent)]">
                  Privacy
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(SOCIAL.instagram || SOCIAL.linkedin) && (
                <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)] sm:inline">
                  Follow
                </span>
              )}
              {SOCIAL.instagram && (
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ona on Instagram"
                className="flex h-10 w-10 items-center justify-center border-2 border-[#f6f4ec] text-[#f6f4ec] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.3.84-.4.4-.64.8-.84 1.3-.16.4-.35 1-.4 2.1C2.6 8.5 2.6 8.9 2.6 12s0 3.5.07 4.7c.05 1.1.24 1.7.4 2.1.2.5.44.9.84 1.3.4.4.8.64 1.3.84.4.16 1 .35 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.44 1.3-.84.4-.4.64-.8.84-1.3.16-.4.35-1 .4-2.1.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.24-1.7-.4-2.1-.2-.5-.44-.9-.84-1.3-.4-.4-.8-.64-1.3-.84-.4-.16-1-.35-2.1-.4C15.5 4 15.1 4 12 4z" />
                  <path d="M12 7.1a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4z" />
                  <circle cx="17.1" cy="6.9" r="1.15" />
                </svg>
              </a>
              )}
              {SOCIAL.linkedin && (
              <a
                href={SOCIAL.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ona on LinkedIn"
                className="flex h-10 w-10 items-center justify-center border-2 border-[#f6f4ec] text-[#f6f4ec] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM10 9h3.8v1.65h.05c.53-1 1.83-2.05 3.75-2.05C21.3 8.6 22 10.9 22 14.05V21h-4v-6.2c0-1.48-.03-3.38-2.05-3.38-2.06 0-2.37 1.6-2.37 3.27V21h-4z" />
                </svg>
              </a>
              )}
            </div>
          </div>
        </footer>

        <BackToTop />
        <Analytics />
      </body>
    </html>
  );
}
