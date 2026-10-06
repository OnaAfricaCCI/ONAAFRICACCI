import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreOpportunity, rankRecommendations, CHECK_REQUIREMENTS, type RecProfile } from '../lib/recommend'

const kenyanFashionGrantSeeker: RecProfile = {
  country_code: 'KE',
  disciplines: ['fashion'],
  support_types: ['grant'],
}

const opp = (over: Partial<Parameters<typeof scoreOpportunity>[1]>) => ({
  id: 'x',
  cci_sector: 'fashion',
  funding_type: 'grant',
  scopes: ['africa'],
  eligible_countries: null,
  ...over,
})

test('positive match explains discipline + support, never says "eligible"', () => {
  const r = scoreOpportunity(kenyanFashionGrantSeeker, opp({ scopes: ['kenya', 'africa'] }))
  assert.equal(r.relevant, true)
  assert.match(r.reasons[0], /Matches your interest in fashion and grant funding\./)
  // Specific-country match is named.
  assert.ok(r.reasons.some((x) => /Open to applicants in Kenya/.test(x)))
  // Never claims eligibility.
  for (const reason of r.reasons) assert.doesNotMatch(reason.toLowerCase(), /eligible/)
})

test('requires BOTH a discipline and a support match', () => {
  // support mismatch (opportunity is a residency, user wants grants)
  assert.equal(scoreOpportunity(kenyanFashionGrantSeeker, opp({ funding_type: 'residency' })).relevant, false)
  // discipline mismatch (music opportunity, user does fashion)
  assert.equal(scoreOpportunity(kenyanFashionGrantSeeker, opp({ cci_sector: 'music' })).relevant, false)
})

test('a known location contradiction excludes the opportunity', () => {
  // Kenyan resident; opportunity scoped only to Nigeria → contradiction.
  const r = scoreOpportunity(kenyanFashionGrantSeeker, opp({ scopes: ['nigeria'] }))
  assert.equal(r.relevant, false)
  assert.equal(r.locationContradiction, true)
})

test('nationality is not inferred from residence (diaspora + Africa-only = unknown, not a contradiction)', () => {
  const diaspora: RecProfile = { country_code: 'GB', disciplines: ['fashion'], support_types: ['grant'] }
  // Africa-wide opportunity, resident abroad: not a contradiction (could be an African national).
  const r = scoreOpportunity(diaspora, opp({ scopes: ['africa'] }))
  assert.equal(r.locationContradiction, false)
  // It can still be relevant on preferences, but location is NOT claimed as a match.
  assert.equal(r.relevant, true)
  assert.ok(!r.reasons.some((x) => /Open (worldwide|to applicants)/.test(x)))
})

test('multi-sector opportunities match any discipline', () => {
  const r = scoreOpportunity(kenyanFashionGrantSeeker, opp({ cci_sector: 'multi-sector' }))
  assert.equal(r.relevant, true)
})

test('empty recommendation set when nothing matches', () => {
  const ranked = rankRecommendations(kenyanFashionGrantSeeker, [
    opp({ cci_sector: 'music', funding_type: 'prize' }),
    opp({ scopes: ['nigeria'] }),
  ])
  assert.equal(ranked.length, 0)
})

test('ranking puts stronger matches first and preserves explanations', () => {
  const profile: RecProfile = { country_code: 'KE', disciplines: ['film', 'music'], support_types: ['grant'] }
  const ranked = rankRecommendations(profile, [
    opp({ id: 'one-disc', cci_sector: 'film', funding_type: 'grant', scopes: ['africa'] }),
    opp({ id: 'two-disc', cci_sector: 'film and music', funding_type: 'grant', scopes: ['kenya'] }),
  ])
  assert.equal(ranked[0].opportunity.id, 'two-disc')
  assert.ok(ranked[0].reasons.length >= 1)
})

test('the check-requirements caveat exists and is preference-framed', () => {
  assert.match(CHECK_REQUIREMENTS, /Check the funder/)
})
