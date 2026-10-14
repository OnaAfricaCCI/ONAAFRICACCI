import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  registerVisit, eligibleBatch, hasOpenBatch, shouldShowThankYou,
  BATCH_EARLIEST, VISIT_GAP_MS, type Phase2State,
} from '../lib/phase2'

const base: Phase2State = {
  visit_count: 0,
  batch1_completed: false, batch2_completed: false, batch3_completed: false,
  batch1_dismissals: 0, batch2_dismissals: 0, batch3_dismissals: 0,
  batch1_dismissed_visit: null, batch2_dismissed_visit: null, batch3_dismissed_visit: null,
  last_invited_visit: null,
}

// ---- visit counting -------------------------------------------------------
test('a visit counts only after 30+ minutes of inactivity', () => {
  const t0 = Date.parse('2026-10-10T10:00:00Z')
  const first = registerVisit({ visit_count: 0, last_visit_at: new Date(t0).toISOString() }, t0 + 10 * 60 * 1000)
  assert.equal(first.isNewVisit, false) // 10 min later — same session
  assert.equal(first.visit_count, 0)

  const later = registerVisit({ visit_count: 0, last_visit_at: new Date(t0).toISOString() }, t0 + VISIT_GAP_MS + 1000)
  assert.equal(later.isNewVisit, true)
  assert.equal(later.visit_count, 1)
})

test('reloads in the same session never increment the count', () => {
  const t0 = Date.parse('2026-10-10T10:00:00Z')
  let state = { visit_count: 3, last_visit_at: new Date(t0).toISOString() }
  for (let i = 1; i <= 5; i++) {
    const r = registerVisit(state, t0 + i * 60 * 1000) // every minute
    assert.equal(r.isNewVisit, false)
    state = { visit_count: r.visit_count, last_visit_at: r.last_visit_at }
  }
  assert.equal(state.visit_count, 3)
})

// ---- batch eligibility ----------------------------------------------------
test('Batch 1 is offered only from visit 5, once Phase 1 is complete', () => {
  assert.equal(eligibleBatch({ ...base, visit_count: 4 }), null)
  assert.equal(eligibleBatch({ ...base, visit_count: 5 }), 1)
  assert.equal(eligibleBatch({ ...base, visit_count: 9 }), 1) // late is fine — earliest, not deadline
})

test('Batch 2 waits for Batch 1 completion and visit 8', () => {
  assert.equal(eligibleBatch({ ...base, visit_count: 8, batch1_completed: false }), 1) // b1 still pending → offer b1, never skip to b2
  assert.equal(eligibleBatch({ ...base, visit_count: 7, batch1_completed: true }), null) // too early for b2
  assert.equal(eligibleBatch({ ...base, visit_count: 8, batch1_completed: true }), 2)
})

test('Batch 3 waits for Batch 2 completion and visit 10', () => {
  assert.equal(eligibleBatch({ ...base, visit_count: 10, batch1_completed: true, batch2_completed: true }), 3)
  assert.equal(eligibleBatch({ ...base, visit_count: 10, batch1_completed: true, batch2_completed: false }), 2) // b2 still pending → offer b2, never skip to b3
})

test('only one invitation per visit', () => {
  assert.equal(eligibleBatch({ ...base, visit_count: 5, last_invited_visit: 5 }), null)
  assert.equal(eligibleBatch({ ...base, visit_count: 6, last_invited_visit: 5 }), 1)
})

test('after a dismissal, hold at least three more visits', () => {
  const dismissed = { ...base, visit_count: 6, batch1_dismissals: 1, batch1_dismissed_visit: 6 }
  assert.equal(eligibleBatch({ ...dismissed, visit_count: 7 }), null) // only +1
  assert.equal(eligibleBatch({ ...dismissed, visit_count: 8 }), null) // +2
  assert.equal(eligibleBatch({ ...dismissed, visit_count: 9 }), 1) // +3 → offer again
})

test('after two dismissals a batch stops being offered automatically', () => {
  const twice = { ...base, visit_count: 20, batch1_dismissals: 2, batch1_dismissed_visit: 10 }
  assert.equal(eligibleBatch(twice), null)
  // and later batches cannot appear because Batch 1 is not completed
  assert.equal(eligibleBatch({ ...twice, visit_count: 30 }), null)
})

test('completing a batch is distinct from dismissing it; completed batches never reappear', () => {
  assert.equal(eligibleBatch({ ...base, visit_count: 12, batch1_completed: true, batch2_completed: true, batch3_completed: true }), null)
  assert.equal(hasOpenBatch({ ...base, batch1_completed: true, batch2_completed: true, batch3_completed: true }), false)
  assert.equal(hasOpenBatch({ ...base, batch1_completed: true }), true)
})

// ---- thank-you vs neutral -------------------------------------------------
test('full thank-you only after final batch completes with real answers, shown once', () => {
  assert.equal(shouldShowThankYou({ batch3_completed: true, thankyou_shown: false, anyPhase2Answer: true }), 'full')
  assert.equal(shouldShowThankYou({ batch3_completed: true, thankyou_shown: false, anyPhase2Answer: false }), 'neutral')
  assert.equal(shouldShowThankYou({ batch3_completed: true, thankyou_shown: true, anyPhase2Answer: true }), null) // already shown
  assert.equal(shouldShowThankYou({ batch3_completed: false, thankyou_shown: false, anyPhase2Answer: true }), null)
})

test('earliest thresholds are the agreed 5 / 8 / 10', () => {
  assert.equal(BATCH_EARLIEST[1], 5)
  assert.equal(BATCH_EARLIEST[2], 8)
  assert.equal(BATCH_EARLIEST[3], 10)
})
