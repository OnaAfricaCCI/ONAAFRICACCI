/**
 * Site-wide quality gate.
 *
 * A record with nothing to say must never appear on the site. These are the
 * minimums for each layer; every list, profile, carousel and digest applies
 * them, so the rule holds even if a thin row reaches the database.
 */

type Named = { name?: string | null; title?: string | null }

const present = (v: unknown) => typeof v === 'string' && v.trim().length > 0

/** A grant needs a name and a description. */
export function isPublishableGrant(g: Named & { description?: string | null }): boolean {
  return present(g.name) && present(g.description)
}

/** An institution needs a name and a description. */
export function isPublishableInstitution(i: Named & { description?: string | null }): boolean {
  return present(i.name) && present(i.description)
}

/** A builder mechanism needs a name and must say what it provides. */
export function isPublishableMechanism(
  m: Named & { what_it_provides?: string | null },
): boolean {
  return present(m.name) && present(m.what_it_provides)
}

/**
 * The same rule expressed as PostgREST filters, so lists don't even fetch
 * blank rows. Chain onto a supabase query: `.not('description', 'is', null)`.
 */
export const GRANT_FILTER = { column: 'description' } as const
export const INSTITUTION_FILTER = { column: 'description' } as const
export const MECHANISM_FILTER = { column: 'what_it_provides' } as const
