import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanProfile, isCompletable } from '../lib/profileValidation'

test('unknown or malformed values are dropped, not stored as guesses', () => {
  const clean = cleanProfile({
    country_code: 'ZZ', // not a real code
    applicant_type: 'wizard', // not in vocabulary
    disciplines: ['film', 'telepathy', 'film'], // unknown + duplicate removed
    support_types: ['grant', 'bribe'],
    stage: 'nonsense',
    languages: ['en', 'klingon'],
    organisation_name: '  ',
  })
  assert.equal(clean.country_code, null)
  assert.equal(clean.applicant_type, null)
  assert.deepEqual(clean.disciplines, ['film'])
  assert.deepEqual(clean.support_types, ['grant'])
  assert.equal(clean.stage, null)
  assert.deepEqual(clean.languages, ['en'])
  assert.equal(clean.organisation_name, null) // blank → null, not ""
})

test('valid values pass through', () => {
  const clean = cleanProfile({
    country_code: 'KE',
    applicant_type: 'individual',
    disciplines: ['film', 'music'],
    support_types: ['grant', 'residency'],
  })
  assert.equal(clean.country_code, 'KE')
  assert.equal(clean.applicant_type, 'individual')
  assert.deepEqual(clean.disciplines, ['film', 'music'])
})

test('isCompletable enforces the minimum basic profile', () => {
  const base = { country_code: 'KE', applicant_type: 'individual', disciplines: ['film'], support_types: ['grant'] }
  assert.equal(isCompletable(cleanProfile(base)), true)
  assert.equal(isCompletable(cleanProfile({ ...base, country_code: undefined })), false)
  assert.equal(isCompletable(cleanProfile({ ...base, disciplines: [] })), false)
  assert.equal(isCompletable(cleanProfile({ ...base, support_types: [] })), false)
})
