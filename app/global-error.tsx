'use client'

/**
 * The last line of defence: an error in the root layout itself.
 *
 * At this point the layout — fonts, theme, header — has failed, so this file
 * has to render its own <html> and <body> and cannot rely on any site styles.
 * Deliberately plain, and deliberately self-contained.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAFAFA',
          color: '#0A0A0A',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Ona
          </p>
          <h1 style={{ margin: '12px 0 0', fontSize: 32, lineHeight: 1.1 }}>
            The site hit a problem.
          </h1>
          <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.6, color: '#525252' }}>
            Something failed before the page could load. Reloading usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '14px 28px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#FAFAFA',
              background: '#0A0A0A',
              border: '2px solid #0A0A0A',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: 32, fontSize: 13, color: '#737373' }}>
              Reference {error.digest} — quote it if you email hello@onafunds.com.
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
