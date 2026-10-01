import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import Analytics from "./components/Analytics";
import BackToTop from "./components/BackToTop";
import NavMemory from "./components/NavMemory";
import NavLinks from "./components/NavLinks";
import MobileMenu from "./components/MobileMenu";
import { Logo, LogoSymbol } from "./components/Logo";
import SocialLinks from "./components/SocialLinks";
import ThemeToggle, { THEME_INIT_SCRIPT } from "./components/ThemeToggle";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, SITE_DEFINITION, SOCIAL } from "@/lib/site";
import "./globals.css";

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
    // The share card is a 1200x630 banner, so it needs the large format.
    // "summary" crops it into a small square and loses the headline.
    card: "summary_large_image",
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
                  // sameAs is how a search engine knows these profiles are
                  // the same organisation as the site, rather than someone
                  // else using the name.
                  sameAs: [SOCIAL.instagram, SOCIAL.linkedin].filter(Boolean),
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
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-x-6 px-5 sm:h-16">
            <Link href="/" aria-label="Ona Funds, home" className="blink-open shrink-0">
              <Logo tone="ivory" width={124} />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <NavLinks />
              <Link
                href="/#digest"
                className="hidden bg-[var(--accent)] px-4 py-2.5 text-[13px] font-bold text-[#121412] transition-colors hover:bg-[#f6f4ec] lg:inline-block"
              >
                Get the digest
              </Link>
              <ThemeToggle />
              <MobileMenu />
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
              <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-[0.12em] text-[#8fa487] sm:inline">
                Follow
              </span>
              <SocialLinks boxed tone="ivory" />
            </div>
          </div>
        </footer>

        <BackToTop />
        <NavMemory />
        <Analytics />
      </body>
    </html>
  );
}
