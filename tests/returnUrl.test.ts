import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeNext } from '../lib/returnUrl'

test('keeps a plain same-site path', () => {
  assert.equal(safeNext('/grants'), '/grants')
  assert.equal(safeNext('/grants?q=film&sort=za'), '/grants?q=film&sort=za')
  assert.equal(safeNext('/grants/ako-caine-prize'), '/grants/ako-caine-prize')
  assert.equal(safeNext('/saved#top'), '/saved#top')
})

test('rejects open-redirect and scheme tricks, falling back to /', () => {
  const attacks = [
    'https://evil.com',
    'http://evil.com/path',
    '//evil.com',
    '/\\evil.com',
    '/%2f%2fevil.com',
    '/%5c%5cevil.com',
    'javascript:alert(1)',
    'data:text/html,hi',
    'evil.com',
    '  /grants',
    '/gr\nants',
    'mailto:x@y.com',
  ]
  for (const a of attacks) assert.equal(safeNext(a), '/', `should reject: ${JSON.stringify(a)}`)
})

test('honours a custom fallback and rejects non-strings / oversize', () => {
  assert.equal(safeNext(undefined, '/saved'), '/saved')
  assert.equal(safeNext(42 as unknown), '/')
  assert.equal(safeNext('/' + 'a'.repeat(600)), '/')
})
