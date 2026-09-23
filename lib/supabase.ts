import { createClient } from '@supabase/supabase-js'

/**
 * The public (anon-key) client, used by the browser. Reads only: every write
 * goes through an API route with the service-role key.
 *
 * The environment variables are checked here rather than asserted with `!`.
 * A missing variable used to produce `createClient(undefined, undefined)` and
 * then a cryptic failure deep inside a fetch, on the deployed site, with no
 * hint as to the cause. This fails at startup and says what is missing.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        'Set it in .env.local for local work, and in the Vercel project settings for deployments.',
    )
  }
  return value
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = required(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
