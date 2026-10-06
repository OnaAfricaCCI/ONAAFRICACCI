/**
 * Database + RLS integration tests for grant-seeker profiles and saved
 * opportunities. These exercise the real policies from the migration, so they
 * need a Supabase instance (local `supabase start`, or a disposable test
 * project — NEVER production).
 *
 * They are SKIPPED unless you opt in with env vars, so `npm test` stays fast
 * and offline. To run them:
 *
 *   SUPABASE_URL=...  (e.g. http://127.0.0.1:54321 from `supabase start`)
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   SUPABASE_ANON_KEY=...
 *   RUN_DB_TESTS=1 npm run test:db
 *
 * Covered: owner-only isolation between two users, unauthenticated denial,
 * duplicate-save prevention, draft persistence/resume, and that deleting a
 * profile keeps the account and its saved opportunities.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const ENABLED = process.env.RUN_DB_TESTS === '1' && URL && SERVICE && ANON

// node:test honours this skip at the file level.
test('database integration (needs a Supabase instance)', { skip: !ENABLED }, async (t) => {
  const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })

  const pw = 'Test-' + Math.random().toString(36).slice(2) + 'Aa1!'
  const mk = async (email: string) => {
    const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true })
    assert.ok(!error, error?.message)
    return data.user!.id
  }
  const signIn = async (email: string): Promise<SupabaseClient> => {
    const c = createClient(URL!, ANON!, { auth: { persistSession: false } })
    const { error } = await c.auth.signInWithPassword({ email, password: pw })
    assert.ok(!error, error?.message)
    return c
  }

  const emailA = `a_${Date.now()}@onafunds.test`
  const emailB = `b_${Date.now()}@onafunds.test`
  const idA = await mk(emailA)
  const idB = await mk(emailB)
  const A = await signIn(emailA)
  const B = await signIn(emailB)

  // A real opportunity to save.
  const { data: opp } = await admin.from('opportunities').select('id').not('description', 'is', null).limit(1).single()
  const oppId = (opp as { id: string }).id

  await t.test('A creates a draft profile; B cannot see it (owner isolation)', async () => {
    const { error } = await A.from('grant_seeker_profiles').upsert({ user_id: idA, status: 'draft', country_code: 'KE' })
    assert.ok(!error, error?.message)
    const { data: seenByB } = await B.from('grant_seeker_profiles').select('*').eq('user_id', idA)
    assert.equal((seenByB ?? []).length, 0) // RLS hides A's row from B
    const { data: seenByA } = await A.from('grant_seeker_profiles').select('*')
    assert.equal((seenByA ?? []).length, 1)
  })

  await t.test('unauthenticated access is denied', async () => {
    const anon = createClient(URL!, ANON!, { auth: { persistSession: false } })
    const { data } = await anon.from('grant_seeker_profiles').select('*')
    assert.equal((data ?? []).length, 0)
    const { error } = await anon.from('saved_opportunities').insert({ user_id: idA, opportunity_id: oppId })
    assert.ok(error, 'anon insert must be rejected by RLS')
  })

  await t.test('draft edits persist and resume', async () => {
    await A.from('grant_seeker_profiles').upsert({ user_id: idA, status: 'draft', country_code: 'KE', disciplines: ['film'] })
    const { data } = await A.from('grant_seeker_profiles').select('disciplines,country_code').eq('user_id', idA).single()
    assert.deepEqual(data!.disciplines, ['film'])
    assert.equal(data!.country_code, 'KE')
  })

  await t.test('duplicate saves are prevented by the unique constraint', async () => {
    const first = await A.from('saved_opportunities').insert({ user_id: idA, opportunity_id: oppId })
    assert.ok(!first.error, first.error?.message)
    const second = await A.from('saved_opportunities').insert({ user_id: idA, opportunity_id: oppId })
    assert.ok(second.error, 'second identical save must violate the unique constraint')
    const { count } = await A.from('saved_opportunities').select('*', { count: 'exact', head: true }).eq('user_id', idA)
    assert.equal(count, 1)
  })

  await t.test('deleting the profile keeps the account and saved opportunities', async () => {
    const del = await A.from('grant_seeker_profiles').delete().eq('user_id', idA)
    assert.ok(!del.error, del.error?.message)
    const { data: prof } = await A.from('grant_seeker_profiles').select('*').eq('user_id', idA)
    assert.equal((prof ?? []).length, 0) // profile gone
    const { data: saved } = await A.from('saved_opportunities').select('*').eq('user_id', idA)
    assert.equal((saved ?? []).length, 1) // saved kept
    // Account still exists.
    const { data: stillThere } = await admin.auth.admin.getUserById(idA)
    assert.ok(stillThere.user)
  })

  // Cleanup: deleting the users cascades to their rows.
  after(async () => {
    await admin.auth.admin.deleteUser(idA).catch(() => {})
    await admin.auth.admin.deleteUser(idB).catch(() => {})
  })
})
