/**
 * A URL slug from a title.
 *
 * "AKO Caine Prize for African Writing" -> "ako-caine-prize-for-african-writing"
 *
 * Kept in one place because a grant's slug becomes the address search engines
 * rank and other sites link to. Once a grant has one it must never change, so
 * this function's output has to stay stable: change the rules here only for
 * slugs not yet issued.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')                 // accents -> base letter + mark
    .replace(/[̀-ͯ]/g, '')   // drop the marks (é -> e)
    .toLowerCase()
    .replace(/[’'"]/g, '')             // drop apostrophes so "l'atelier" -> "latelier"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')       // everything else becomes a hyphen
    .replace(/^-+|-+$/g, '')           // trim hyphens
    .slice(0, 80)
}
