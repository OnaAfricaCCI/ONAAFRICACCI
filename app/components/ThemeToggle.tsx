'use client'

import { useEffect, useState } from 'react'
import { track } from '@/lib/analytics'

type Theme = 'light' | 'dark'
const KEY = 'ona-theme'

/**
 * Runs before the page paints so a dark-mode visitor never sees a white
 * flash. Applies the saved choice, or the device preference if there is none.
 * Rendered inline by the layout; kept here so the logic lives with the toggle.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('${KEY}');
    var root = document.documentElement;
    if (saved === 'dark' || saved === 'light') {
      root.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('system-dark');
    }
  } catch (e) {}
})();
`

function current(): Theme {
  const root = document.documentElement
  const explicit = root.getAttribute('data-theme')
  if (explicit === 'dark' || explicit === 'light') return explicit
  return root.classList.contains('system-dark') ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    // Deliberate: the stored choice lives in localStorage, which the server
    // cannot read, so it is applied after mount rather than during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current())
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.remove('system-dark')
    root.setAttribute('data-theme', next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* private mode etc. — the choice just won't persist */
    }
    setTheme(next)
    track({ name: 'theme_toggle', to: next })
  }

  // Until mounted we don't know the theme; render a neutral placeholder so the
  // header layout doesn't shift.
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
      // Sits on the ink header, so its colours are fixed rather than themed.
      className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#f6f4ec] text-[#f6f4ec] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412]"
    >
      {theme === null ? (
        <span className="block h-4 w-4" />
      ) : isDark ? (
        /* sun */
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      ) : (
        /* moon */
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
