import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanProfile, isCompletable } from '../lib/profileValidation'
import { scoreOpportunity, type RecProfile, type RecOpportunity } from '../lib/recommend'
import { disciplineMatchesSector, supportMatchesFundingType } from '../lib/profileTaxonomy'

// ---- new applicant type + taxonomy ---------------------------------------
test('the new "exploring for someone else" applicant type is accepted', () => {
  assert.equal(cleanProfile({ applicant_type: 'exploring' }).applicant_type, 'exploring')
})

test('"Another area" text is stored and flagged for review, never mapped', () => {
  const c = cleanProfile({ disciplines: ['visual-arts'], disciplines_other: 'Puppetry and masks' })
  assert.deepEqual(c.disciplines, ['visual-arts'])
  assert.equal(c.disciplines_other, 'Puppetry and masks')
  assert.equal(c.taxonomy_review, true)
  assert.equal(cleanProfile({ disciplines: ['visual-arts'] }).taxonomy_review, false)
})

test('arts-management matches real sectors; legacy media still matches', () => {
  assert.equal(disciplineMatchesSector('arts-management', 'arts management'), true)
  assert.equal(disciplineMatchesSector('arts-management', 'cultural programming'), true)
  assert.equal(disciplineMatchesSector('media', 'podcasting'), true) // legacy id preserved
  assert.equal(disciplineMatchesSector('arts-management', 'film'), false)
})

// ---- open-to-all broadens, never narrows ----------------------------------
test('"open to anything" clears specific support types and is stored as a flag', () => {
  const c = cleanProfile({ support_types: ['grant', 'prize'], open_to_all: true })
  assert.deepEqual(c.support_types, []) // mutually exclusive
  assert.equal(c.open_to_all, true)
})

test('open_to_all makes any funding type match, without excluding anything', () => {
  const profile: RecProfile = { country_code: 'KE', disciplines: ['film'], support_types: [], open_to_all: true }
  const opp: RecOpportunity = { id: '1', cci_sector: 'film', funding_type: 'loan', scopes: ['africa'] }
  const r = scoreOpportunity(profile, opp)
  assert.equal(r.relevant, true)
  assert.match(r.reasons[0], /open to/i)
})

test('mobility is a preference only and never hard-matches a funding type', () => {
  assert.equal(supportMatchesFundingType('mobility', 'grant'), false)
  assert.equal(supportMatchesFundingType('grant', 'grant'), true)
  // a seeker who only chose mobility (no open_to_all) gets no false "grant" match
  const profile: RecProfile = { country_code: 'KE', disciplines: ['film'], support_types: ['mobility'] }
  const opp: RecOpportunity = { id: '1', cci_sector: 'film', funding_type: 'grant', scopes: ['africa'] }
  assert.equal(scoreOpportunity(profile, opp).relevant, false)
})

// ---- exclusive answers + limits (Phase 2) ---------------------------------
test('exclusive answers collapse the list; limits are capped', () => {
  assert.deepEqual(cleanProfile({ goals: ['create', 'skills', 'travel', 'exploring'] }).goals, ['exploring'])
  assert.deepEqual(cleanProfile({ goals: ['create', 'skills', 'travel', 'publish'] }).goals.length, 3) // capped at 3
  assert.deepEqual(cleanProfile({ willing_locations: ['home', 'unsure'] }).willing_locations, ['unsure'])
  assert.deepEqual(cleanProfile({ prior_support: ['grant', 'never-applied'] }).prior_support, ['never-applied'])
  assert.deepEqual(cleanProfile({ barriers: ['late', 'time', 'cost', 'none'] }).barriers, ['none'])
  assert.deepEqual(cleanProfile({ actions_taken: ['saved', 'none'] }).actions_taken, ['none'])
})

test('citizenship, registration and members-based-in stay distinct; prefer-not clears citizenship', () => {
  const c = cleanProfile({ citizenship: ['KE', 'TZ'], registered_in: ['KE'], members_based_in: ['UG'] })
  assert.deepEqual(c.citizenship, ['KE', 'TZ'])
  assert.deepEqual(c.registered_in, ['KE'])
  assert.deepEqual(c.members_based_in, ['UG'])
  const pn = cleanProfile({ citizenship: ['KE'], citizenship_prefer_not: true })
  assert.deepEqual(pn.citizenship, [])
  assert.equal(pn.citizenship_prefer_not, true)
})

test('completable with open_to_all or with a specified Another area, no hard exclusions', () => {
  assert.equal(isCompletable(cleanProfile({ country_code: 'KE', applicant_type: 'individual', disciplines: ['film'], open_to_all: true })), true)
  assert.equal(isCompletable(cleanProfile({ country_code: 'KE', applicant_type: 'individual', disciplines_other: 'Kite making', support_types: ['grant'] })), true)
})
