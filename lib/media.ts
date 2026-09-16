/** Turn a YouTube or Vimeo URL into an embeddable player URL. */
export function embedUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    }
    if (host.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return u.toString()
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (host.endsWith('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch {
    return null
  }
}

/** Best-effort still image for a video URL, used when no cover is set. */
export function videoThumb(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : host.endsWith('youtube.com')
          ? u.searchParams.get('v')
          : null
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  } catch {
    return null
  }
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
