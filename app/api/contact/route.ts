import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isBot, rateLimited, readJson, tooLarge, tooMany } from '@/lib/guard'

export async function POST(req: Request) {
  if (rateLimited(req, 5)) return tooMany()
  try {
    const body = await readJson(req)
    if (body === null) return tooLarge()
    if (isBot(body)) return NextResponse.json({ ok: true })
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const message = String(body.message ?? '').trim()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('contact_messages').insert({
      name: name.slice(0, 200),
      email: email.slice(0, 200),
      message: message.slice(0, 5000),
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
