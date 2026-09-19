/**
 * Pull the largest number out of a free-text funding amount.
 *
 * `amount` is stored as text because real calls describe money in wildly
 * different ways ("$15,000 - $40,000 USD", "US$50,000", "EUR 5k-10k",
 * "Showcase slots"). For ranges we take the upper bound, which is what people
 * mean by "how big is this grant".
 *
 * Caveat: this is currency-blind. "N500m" (Naira) outranks "$50,000" even
 * though it is worth less. See parseAmount's caller for how that is handled.
 */
export function parseAmount(amount: string | null | undefined): number | null {
  if (!amount) return null

  const matches = amount.replace(/,/g, '').match(/\d+(?:\.\d+)?\s*[kKmM]?/g)
  if (!matches) return null

  const values = matches
    .map((raw) => {
      const token = raw.trim()
      const suffix = token.slice(-1).toLowerCase()
      const n = parseFloat(token)
      if (Number.isNaN(n)) return null
      if (suffix === 'k') return n * 1_000
      if (suffix === 'm') return n * 1_000_000
      return n
    })
    .filter((n): n is number => n !== null)

  return values.length ? Math.max(...values) : null
}

/** Whole days from today until `deadline`. Negative once it has passed. */
export function daysUntil(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - startOfToday.getTime()) / 86_400_000)
}

/** "Closes in 9 days" / "Closes today" / "Rolling" */
export function deadlineLabel(
  deadline: string | null | undefined,
  deadlineType?: string | null,
): string {
  const days = daysUntil(deadline)
  if (days === null) return deadlineType === 'rolling' ? 'Rolling' : 'No fixed deadline'
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  return `Closes in ${days} days`
}
