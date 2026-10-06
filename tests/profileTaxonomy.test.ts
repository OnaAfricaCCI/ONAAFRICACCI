import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  disciplineMatchesSector,
  supportMatchesFundingType,
  DISCIPLINE_IDS,
  SUPPORT_TYPE_IDS,
} from '../lib/profileTaxonomy'
import { isAfricanCode, scopeForResidence, isValidCountryCode } from '../lib/countries'

test('disciplines map onto the messy cci_sector free text', () => {
  assert.equal(disciplineMatchesSector('film', 'documentary film'), true)
  assert.equal(disciplineMatchesSector('film', 'feature fiction and creative documentary'), true)
  assert.equal(disciplineMatchesSector('writing', 'unpublished fiction manuscripts'), true)
  assert.equal(disciplineMatchesSector('writing', 'kiswahili fiction'), true)
  assert.equal(disciplineMatchesSector('heritage', 'archaeological and built heritage'), true)
  assert.equal(disciplineMatchesSector('fashion', 'music'), false)
})

test('broad / multi-sector opportunities match any discipline', () => {
  for (const sector of ['multi-sector', 'arts', 'cross-sector incl. creative enterprises']) {
    assert.equal(disciplineMatchesSector('games', sector), true, sector)
  }
})

test('empty / null sector never matches', () => {
  assert.equal(disciplineMatchesSector('film', null), false)
  assert.equal(disciplineMatchesSector('film', ''), false)
})

test('support types map straight onto funding_type values', () => {
  assert.equal(supportMatchesFundingType('grant', 'grant'), true)
  assert.equal(supportMatchesFundingType('residency', 'residency'), true)
  assert.equal(supportMatchesFundingType('grant', 'prize'), false)
  assert.ok(SUPPORT_TYPE_IDS.has('grant') && SUPPORT_TYPE_IDS.has('investment'))
})

test('country codes resolve to African scope slugs (residence, not nationality)', () => {
  assert.equal(scopeForResidence('KE'), 'kenya')
  assert.equal(scopeForResidence('ZA'), 'south-africa')
  assert.equal(scopeForResidence('CD'), 'drc')
  assert.equal(scopeForResidence('US'), null) // diaspora → no African scope
  assert.equal(isAfricanCode('NG'), true)
  assert.equal(isAfricanCode('FR'), false)
  assert.equal(isValidCountryCode('KE'), true)
  assert.equal(isValidCountryCode('ZZ'), false)
})

test('taxonomy id sets are populated', () => {
  assert.ok(DISCIPLINE_IDS.size >= 8)
})
