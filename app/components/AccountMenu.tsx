'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from './AccountProvider'

/**
 * The header's "My Funding" tab — styled like the main nav links (sage at rest,
 * ivory + coral underline when active), fixed colours because the header is ink
 * in both themes. Rendered on the client from the shared session state, so SSR
 * stays cacheable. Signed in, it leads to the account area (For you); signed
 * out, to the "Find funding for me" landing.
 */
const ACCOUNT_PATHS = ['/find-funding', '/recommendations', '/saved', '/profile']

export default function AccountMenu() {
  const { user, ready } = useAccount()
  const pathname = usePathname()
  const href = ready && user ? '/recommendations' : '/find-funding'
  const active = ACCOUNT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="whitespace-nowrap border-b-[3px] pb-0.5 text-[13px] font-bold uppercase tracking-[0.08em] transition-colors hover:text-[var(--accent)]"
      style={{
        color: active ? '#F6F4EC' : '#DCE3D5',
        borderColor: active ? '#FF6A4D' : 'transparent',
      }}
    >
      My Funding
    </Link>
  )
}
