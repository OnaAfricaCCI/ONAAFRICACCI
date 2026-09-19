import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Honeypot: a filled "company" field means a bot. Return success so the
    // bot sees no signal, but write nothing.
    if (String(body.company ?? '').trim() !== '') {
      return NextResponse.json({ ok: true })
    }

    const email = String(body.email ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const clean = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 10)
        : []

    const { error } = await supabaseAdmin.from('subscribers').upsert(
      {
        email,
        sectors: clean(body.sectors),
        countries: clean(body.countries),
        is_active: true,
      },
      { onConflict: 'email' },
    )

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('subscribe error:', err)
    return NextResponse.json(
      { error: 'Could not sign you up just now. Please try again.' },
      { status: 500 },
    )
  }
}
