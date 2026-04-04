/**
 * B7 — Caregiver write tests (Unit, Option A)
 *
 * Tests pure logic functions related to caregiver write operations.
 * Functions are re-declared here from app.js / dashboard.js.
 * These tests act as a specification: if you change the logic, update here too.
 */

import { describe, it, expect } from 'vitest'

// ── occursOn ──────────────────────────────────────────────
// app.js — determines whether a recurring calendar entry occurs on a given date
function occursOn (entry, dateStr) {
  if (entry.date > dateStr) return false
  if (entry.endDate && dateStr > entry.endDate) return false
  if (entry.date === dateStr) return true
  if (!entry.frequency || entry.frequency === 'once') return false
  const start    = new Date(entry.date + 'T12:00:00')
  const check    = new Date(dateStr   + 'T12:00:00')
  const diffDays = Math.round((check - start) / 86400000)
  switch (entry.frequency) {
    case 'daily':   return true
    case 'weekly':  return diffDays % 7 === 0
    case 'monthly': return start.getDate() === check.getDate()
    case 'yearly':  return start.getMonth() === check.getMonth() && start.getDate() === check.getDate()
    default:        return false
  }
}

describe('occursOn — general', () => {
  it('returns false for events that start in the future', () => {
    const entry = { date: '2025-06-20', frequency: 'daily' }
    expect(occursOn(entry, '2025-06-15')).toBe(false)
  })

  it('returns true on the start date regardless of frequency', () => {
    expect(occursOn({ date: '2025-06-15', frequency: 'once'    }, '2025-06-15')).toBe(true)
    expect(occursOn({ date: '2025-06-15', frequency: 'daily'   }, '2025-06-15')).toBe(true)
    expect(occursOn({ date: '2025-06-15', frequency: 'weekly'  }, '2025-06-15')).toBe(true)
    expect(occursOn({ date: '2025-06-15', frequency: 'monthly' }, '2025-06-15')).toBe(true)
    expect(occursOn({ date: '2025-06-15', frequency: 'yearly'  }, '2025-06-15')).toBe(true)
  })

  it('returns false for a once event on any day after the start', () => {
    const entry = { date: '2025-06-15', frequency: 'once' }
    expect(occursOn(entry, '2025-06-16')).toBe(false)
    expect(occursOn(entry, '2025-12-31')).toBe(false)
  })

  it('returns false for unknown frequency', () => {
    const entry = { date: '2025-06-15', frequency: 'hourly' }
    expect(occursOn(entry, '2025-06-16')).toBe(false)
  })

  it('returns false when frequency is missing', () => {
    const entry = { date: '2025-06-15' }
    expect(occursOn(entry, '2025-06-20')).toBe(false)
  })
})

describe('occursOn — daily', () => {
  const entry = { date: '2025-06-15', frequency: 'daily' }

  it('occurs the next day', () => {
    expect(occursOn(entry, '2025-06-16')).toBe(true)
  })

  it('occurs many days later', () => {
    expect(occursOn(entry, '2025-12-31')).toBe(true)
  })

  it('occurs the next year', () => {
    expect(occursOn(entry, '2026-06-15')).toBe(true)
  })
})

describe('occursOn — weekly', () => {
  const entry = { date: '2025-06-15', frequency: 'weekly' } // Sunday

  it('occurs exactly 7 days later', () => {
    expect(occursOn(entry, '2025-06-22')).toBe(true)
  })

  it('occurs exactly 14 days later', () => {
    expect(occursOn(entry, '2025-06-29')).toBe(true)
  })

  it('does not occur 6 days later', () => {
    expect(occursOn(entry, '2025-06-21')).toBe(false)
  })

  it('does not occur 8 days later', () => {
    expect(occursOn(entry, '2025-06-23')).toBe(false)
  })
})

describe('occursOn — monthly', () => {
  const entry = { date: '2025-03-31', frequency: 'monthly' }

  it('occurs on the same day next month (if the day exists)', () => {
    expect(occursOn(entry, '2025-05-31')).toBe(true)
  })

  it('does not occur on the wrong day of the month', () => {
    expect(occursOn(entry, '2025-04-30')).toBe(false)
  })

  it('occurs same day 12 months later', () => {
    const e = { date: '2025-06-15', frequency: 'monthly' }
    expect(occursOn(e, '2026-06-15')).toBe(true)
  })
})

describe('occursOn — yearly', () => {
  const entry = { date: '2025-06-15', frequency: 'yearly' }

  it('occurs on the same month and day next year', () => {
    expect(occursOn(entry, '2026-06-15')).toBe(true)
  })

  it('occurs two years later', () => {
    expect(occursOn(entry, '2027-06-15')).toBe(true)
  })

  it('does not occur on a different day in the same month', () => {
    expect(occursOn(entry, '2026-06-14')).toBe(false)
  })

  it('does not occur on the same day in a different month', () => {
    expect(occursOn(entry, '2026-07-15')).toBe(false)
  })
})

describe('occursOn — endDate', () => {
  it('does not occur after endDate', () => {
    const entry = { date: '2025-06-01', frequency: 'daily', endDate: '2025-06-10' }
    expect(occursOn(entry, '2025-06-10')).toBe(true)
    expect(occursOn(entry, '2025-06-11')).toBe(false)
  })

  it('still occurs on endDate itself', () => {
    const entry = { date: '2025-06-01', frequency: 'weekly', endDate: '2025-06-15' }
    expect(occursOn(entry, '2025-06-15')).toBe(true)
  })

  it('null endDate means no expiry (runs forever)', () => {
    const entry = { date: '2025-01-01', frequency: 'daily', endDate: null }
    expect(occursOn(entry, '2030-12-31')).toBe(true)
  })
})

// ── Audit payload logic ────────────────────────────────────
// app.js / dashboard.js — created_by and updated_by in DB payloads

function buildInsertPayload (base, actorId) {
  return { ...base, created_by: actorId }
}

function buildUpdatePayload (base, actorId) {
  return { ...base, updated_by: actorId }
}

describe('buildInsertPayload (audit: created_by)', () => {
  const USER_ID      = 'user-uuid-111'
  const CAREGIVER_ID = 'caregiver-uuid-999'
  const base = { user_id: USER_ID, name: 'Aspirin', dosage: '100mg' }

  it('sets created_by to the actor id', () => {
    expect(buildInsertPayload(base, CAREGIVER_ID).created_by).toBe(CAREGIVER_ID)
  })

  it('does not set updated_by on insert', () => {
    expect(buildInsertPayload(base, CAREGIVER_ID).updated_by).toBeUndefined()
  })

  it('preserves all base fields', () => {
    const result = buildInsertPayload(base, CAREGIVER_ID)
    expect(result.user_id).toBe(USER_ID)
    expect(result.name).toBe('Aspirin')
    expect(result.dosage).toBe('100mg')
  })

  it('works when actor is the user themselves', () => {
    expect(buildInsertPayload(base, USER_ID).created_by).toBe(USER_ID)
  })
})

describe('buildUpdatePayload (audit: updated_by)', () => {
  const USER_ID      = 'user-uuid-111'
  const CAREGIVER_ID = 'caregiver-uuid-999'
  const base = { user_id: USER_ID, name: 'Aspirin', dosage: '200mg' }

  it('sets updated_by to the actor id', () => {
    expect(buildUpdatePayload(base, CAREGIVER_ID).updated_by).toBe(CAREGIVER_ID)
  })

  it('does not set created_by on update', () => {
    expect(buildUpdatePayload(base, CAREGIVER_ID).created_by).toBeUndefined()
  })

  it('preserves all base fields', () => {
    const result = buildUpdatePayload(base, CAREGIVER_ID)
    expect(result.user_id).toBe(USER_ID)
    expect(result.dosage).toBe('200mg')
  })
})

// ── Audit badge logic ──────────────────────────────────────
// dashboard.js — determines which badge to show next to an entry

function auditBadgeFor (entry, userId) {
  if (entry.created_by && entry.created_by !== userId) return 'created'
  if (entry.updated_by && entry.updated_by !== userId) return 'updated'
  return null
}

describe('auditBadgeFor', () => {
  const USER_ID      = 'user-uuid-111'
  const CAREGIVER_ID = 'caregiver-uuid-999'

  it('returns "created" when a caregiver created the entry', () => {
    const entry = { created_by: CAREGIVER_ID, updated_by: null }
    expect(auditBadgeFor(entry, USER_ID)).toBe('created')
  })

  it('returns "updated" when a caregiver last edited the entry', () => {
    const entry = { created_by: USER_ID, updated_by: CAREGIVER_ID }
    expect(auditBadgeFor(entry, USER_ID)).toBe('updated')
  })

  it('returns null when the user created and last edited the entry themselves', () => {
    const entry = { created_by: USER_ID, updated_by: USER_ID }
    expect(auditBadgeFor(entry, USER_ID)).toBe(null)
  })

  it('returns null when created_by is the user and updated_by is not set', () => {
    const entry = { created_by: USER_ID, updated_by: null }
    expect(auditBadgeFor(entry, USER_ID)).toBe(null)
  })

  it('returns null when both audit fields are null (legacy entry)', () => {
    const entry = { created_by: null, updated_by: null }
    expect(auditBadgeFor(entry, USER_ID)).toBe(null)
  })

  it('"created" takes priority over "updated" when both point to caregiver', () => {
    const entry = { created_by: CAREGIVER_ID, updated_by: CAREGIVER_ID }
    expect(auditBadgeFor(entry, USER_ID)).toBe('created')
  })
})

// ── toLocalISOString ───────────────────────────────────────
// app.js / dashboard.js — appends local timezone offset to prevent UTC drift

function toLocalISOString (dateStr, timeStr) {
  const d    = new Date(`${dateStr}T${timeStr}`)
  const off  = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const hh   = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const mm   = String(Math.abs(off) % 60).padStart(2, '0')
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`
}

describe('toLocalISOString', () => {
  it('returns a string starting with the given date and time', () => {
    const result = toLocalISOString('2025-06-15', '09:00')
    expect(result).toMatch(/^2025-06-15T09:00:00/)
  })

  it('appends a timezone offset in ±HH:MM format', () => {
    const result = toLocalISOString('2025-06-15', '09:00')
    expect(result).toMatch(/[+-]\d{2}:\d{2}$/)
  })

  it('produces a string parseable by Date without UTC drift', () => {
    const result = toLocalISOString('2025-06-15', '09:00')
    const parsed = new Date(result)
    // local hours must equal the input time (no 2h drift)
    expect(parsed.getHours()).toBe(9)
  })

  it('works for midnight', () => {
    const result = toLocalISOString('2025-06-15', '00:00')
    expect(result).toMatch(/^2025-06-15T00:00:00/)
    expect(new Date(result).getHours()).toBe(0)
  })
})
