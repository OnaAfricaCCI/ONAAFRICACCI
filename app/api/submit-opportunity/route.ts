import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isBot, rateLimited, readJson, tooLarge, tooMany } from '@/lib/guard'
import { notify } from '@/lib/email'

export async function POST(req: Request) {
  if (rateLimited(req, 5)) return tooMany()
  try {
    const body = await readJson(req)
    if (body === null) return tooLarge()
    if (isBot(body)) return NextResponse.json({ ok: true })
    const name = String(body.name ?? '').trim()
    const organization = String(body.organization ?? '').trim()
    const amount = String(body.amount ?? '').trim()
    const forWho = String(body.for_who ?? '').trim()
    const deadline = String(body.deadline ?? '').trim()
    const rolling = Boolean(body.rolling)
    const link = String(body.link ?? '').trim()
    const contactEmail = String(body.contact_email ?? '').trim()
    const notes = String(body.notes ?? '').trim()

    if (!name || !amount || !forWho || !contactEmail || (!deadline && !rolling)) {
      return NextResponse.json(
        { error: 'Please fill in the required fields.' },
        { status: 400 },
      )
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('opportunity_submissions').insert({
      name: name.slice(0, 300),
      organization: organization.slice(0, 300) || null,
      amount: amount.slice(0, 300),
      for_who: forWho.slice(0, 1000),
      deadline: rolling ? null : deadline.slice(0, 100),
      rolling,
      link: link.slice(0, 500) || null,
      contact_email: contactEmail.slice(0, 200),
      notes: notes.slice(0, 3000) || null,
      status: 'pending',
    })
    if (error) throw new Error(error.message)

    await notify({
      subject: `Opportunity submitted: ${name}`,
      lines: [
        ['Opportunity', name],
        ['Organisation', organization],
        ['Amount', amount],
        ['Who it\'s for', forWho],
        ['Deadline', rolling ? 'Rolling / no fixed deadline' : deadline],
        ['Link', link],
        ['Notes', notes],
        ['Submitted by', contactEmail],
      ],
      replyTo: contactEmail,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('submit-opportunity error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
