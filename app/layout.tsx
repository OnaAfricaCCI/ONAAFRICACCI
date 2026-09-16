import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import Link from "next/link";
import BackToTop from "./components/BackToTop";
import "./globals.css";

// TODO: replace with the real Ona profile URLs
const SOCIAL = {
  instagram: "https://www.instagram.com/",
  linkedin: "https://www.linkedin.com/",
};

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ona — CCI Funding Platform",
  description:
    "Funding opportunities and funders for Africa's cultural and creative industries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} h-full antialiased`}
    >
      {/* Browser extensions (Grammarly et al.) inject attributes into <body>
          before hydration; ignore those rather than warn on every load. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[var(--paper)] text-[var(--ink)] font-[family-name:var(--font-body)]"
      >
        <header className="sticky top-0 z-30 border-b-2 border-[var(--ink)] bg-[var(--paper)]/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight"
            >
              Ona<span className="text-[var(--terracotta)]">.</span>
              <span className="ml-2 hidden text-xs font-normal uppercase tracking-[0.2em] text-[var(--ink-soft)] sm:inline">
                Africa CCI
              </span>
            </Link>
            <nav className="flex gap-6 text-sm font-medium uppercase tracking-[0.12em]">
              <Link href="/grants" className="hover:text-[var(--terracotta)] transition-colors">
                Grants
              </Link>
              <Link href="/funders" className="hover:text-[var(--terracotta)] transition-colors">
                Funders
              </Link>
              <Link href="/blog" className="hover:text-[var(--terracotta)] transition-colors">
                Blog
              </Link>
              <Link href="/contact" className="hover:text-[var(--terracotta)] transition-colors">
                Contact
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-16 border-t-2 border-[var(--ink)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6">
            <span className="text-xs uppercase tracking-[0.15em] text-[var(--ink-soft)]">
              Ona — Cultural &amp; Creative Industries
            </span>

            <div className="flex items-center gap-3">
              <span className="mr-1 hidden text-xs uppercase tracking-[0.15em] text-[var(--ink-soft)] sm:inline">
                Follow
              </span>
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ona on Instagram"
                className="flex h-9 w-9 items-center justify-center border-2 border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.3.84-.4.4-.64.8-.84 1.3-.16.4-.35 1-.4 2.1C2.6 8.5 2.6 8.9 2.6 12s0 3.5.07 4.7c.05 1.1.24 1.7.4 2.1.2.5.44.9.84 1.3.4.4.8.64 1.3.84.4.16 1 .35 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.44 1.3-.84.4-.4.64-.8.84-1.3.16-.4.35-1 .4-2.1.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.24-1.7-.4-2.1-.2-.5-.44-.9-.84-1.3-.4-.4-.8-.64-1.3-.84-.4-.16-1-.35-2.1-.4C15.5 4 15.1 4 12 4z" />
                  <path d="M12 7.1a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4z" />
                  <circle cx="17.1" cy="6.9" r="1.15" />
                </svg>
              </a>
              <a
                href={SOCIAL.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ona on LinkedIn"
                className="flex h-9 w-9 items-center justify-center border-2 border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM10 9h3.8v1.65h.05c.53-1 1.83-2.05 3.75-2.05C21.3 8.6 22 10.9 22 14.05V21h-4v-6.2c0-1.48-.03-3.38-2.05-3.38-2.06 0-2.37 1.6-2.37 3.27V21h-4z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>

        <BackToTop />
      </body>
    </html>
  );
}
