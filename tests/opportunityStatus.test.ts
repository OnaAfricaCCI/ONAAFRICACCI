import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveStatus,
  frequencyText,
  verificationLines,
  isOpenNow,
} from '../lib/opportunityStatus'

const TODAY = '2026-10-07'

test('open with a future deadline stays open', () => {
  const v = deriveStatus({ application_status: 'open', deadline: '2026-10-30', deadline_type: 'fixed' }, TODAY)
  assert.equal(v.slug, 'open')
  assert.equal(v.label, 'Open for applications')
  assert.equal(v.tone, 'open')
  assert.ok(isOpenNow(v))
})

test('open with a PAST fixed deadline decays to unconfirmed (never lies)', () => {
  const v = deriveStatus({ application_status: 'open', deadline: '2026-07-01', deadline_type: 'fixed' }, TODAY)
  assert.equal(v.slug, 'unconfirmed')
  assert.equal(isOpenNow(v), false)
})

test('a past recurring deadline does not force an open row shut', () => {
  const v = deriveStatus({ application_status: 'open', deadline: '2026-01-01', deadline_type: 'recurring' }, TODAY)
  assert.equal(v.slug, 'open')
})

test('opens_on with a future date shows the date', () => {
  const v = deriveStatus({ application_status: 'opens_on', next_open_date: '2027-01-05' }, TODAY)
  assert.equal(v.slug, 'opens_on')
  assert.match(v.label, /^Opens on /)
  assert.equal(v.tone, 'soon')
})

test('opens_on whose date has arrived decays to unconfirmed (recheck, not auto-open)', () => {
  const v = deriveStatus({ application_status: 'opens_on', next_open_date: '2026-09-01' }, TODAY)
  assert.equal(v.slug, 'unconfirmed')
})

test('invitation_only has its own label and supporting text', () => {
  const v = deriveStatus({ application_status: 'invitation_only' }, TODAY)
  assert.equal(v.label, 'By invitation / nomination only')
  assert.match(v.supporting ?? '', /invitation or nomination/)
})

test('awaiting_next_call carries the "previous round closed" supporting text', () => {
  const v = deriveStatus({ application_status: 'awaiting_next_call' }, TODAY)
  assert.equal(v.label, 'Awaiting next call')
  assert.match(v.supporting ?? '', /previous application round has closed/)
})

test('unconfirmed points visitors to the funder, not at the programme', () => {
  const v = deriveStatus({ application_status: 'unconfirmed' }, TODAY)
  assert.equal(v.label, 'Current window not confirmed')
  assert.match(v.supporting ?? '', /research and planning/)
})

test('unmigrated row with a future deadline still reads open', () => {
  const v = deriveStatus({ application_status: null, deadline: '2026-12-01', deadline_type: 'fixed' }, TODAY)
  assert.equal(v.slug, 'open')
})

test('frequencyText combines cadence and detail', () => {
  assert.equal(frequencyText('annual', ''), 'Annual')
  assert.equal(frequencyText('periodic', '4 sessions a year'), 'Periodic · 4 sessions a year')
  assert.equal(frequencyText('unknown', ''), '')
})

test('verification lines keep status and link check separate', () => {
  const lines = verificationLines({ statusLabel: 'Awaiting next call', statusVerifiedAt: '2026-10-07', linkCheckedAt: '2026-10-07' })
  assert.equal(lines[0], 'Application status: Awaiting next call')
  assert.ok(lines.some((l) => /Status confirmed on the funder's page/.test(l)))
  assert.ok(lines.some((l) => /Source link checked/.test(l)))
})

test('a working link alone never asserts an open status', () => {
  const lines = verificationLines({ statusLabel: 'Current window not confirmed', statusVerifiedAt: null, linkCheckedAt: '2026-10-07' })
  assert.equal(lines[0], 'Application status: Current window not confirmed')
  assert.ok(!lines.some((l) => /confirmed on the funder/.test(l)))
  assert.ok(lines.some((l) => /Source link checked/.test(l)))
})
