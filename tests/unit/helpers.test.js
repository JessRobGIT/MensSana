/**
 * Unit tests for pure helper functions from app.js
 *
 * Because app.js is a browser script with DOM-dependent top-level code,
 * we re-declare the pure functions here. These tests act as a specification:
 * if you change the logic in app.js, update it here too.
 */

import { describe, it, expect } from 'vitest'

// ── isoDate ───────────────────────────────────────────────
// app.js:637 — converts a Date to YYYY-MM-DD using LOCAL time
function isoDate (d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

describe('isoDate', () => {
  it('formats a date to YYYY-MM-DD', () => {
    expect(isoDate(new Date(2025, 0, 5))).toBe('2025-01-05')
  })

  it('pads single-digit month and day', () => {
    expect(isoDate(new Date(2025, 8, 3))).toBe('2025-09-03')
  })

  it('handles end-of-year date', () => {
    expect(isoDate(new Date(2025, 11, 31))).toBe('2025-12-31')
  })

  it('handles leap day', () => {
    expect(isoDate(new Date(2024, 1, 29))).toBe('2024-02-29')
  })
})

// ── escapeHtml ────────────────────────────────────────────
// app.js:317
function escapeHtml (str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes all three characters in one string', () => {
    expect(escapeHtml('<b>a & b</b>')).toBe('&lt;b&gt;a &amp; b&lt;/b&gt;')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('escapes multiple occurrences', () => {
    expect(escapeHtml('1 < 2 & 3 > 0')).toBe('1 &lt; 2 &amp; 3 &gt; 0')
  })
})

// ── formatAuthError ───────────────────────────────────────
// app.js:189
function formatAuthError (error) {
  const map = {
    'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
    'Email not confirmed':        'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.',
    'User already registered':    'Diese E-Mail-Adresse ist bereits registriert.',
  }
  return map[error.message] ?? error.message
}

describe('formatAuthError', () => {
  it('maps invalid credentials to German', () => {
    expect(formatAuthError({ message: 'Invalid login credentials' }))
      .toBe('E-Mail oder Passwort ist falsch.')
  })

  it('maps unconfirmed email to German', () => {
    expect(formatAuthError({ message: 'Email not confirmed' }))
      .toBe('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.')
  })

  it('maps already-registered to German', () => {
    expect(formatAuthError({ message: 'User already registered' }))
      .toBe('Diese E-Mail-Adresse ist bereits registriert.')
  })

  it('falls back to the raw message for unknown errors', () => {
    expect(formatAuthError({ message: 'Rate limit exceeded' }))
      .toBe('Rate limit exceeded')
  })
})

// ── isNetworkError ────────────────────────────────────────
// app.js:79
function isNetworkError (err) {
  return err?.message?.toLowerCase().includes('fetch') ||
         err?.message?.toLowerCase().includes('network')
}

describe('isNetworkError', () => {
  it('detects "Failed to fetch"', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true)
  })

  it('detects "Network request failed"', () => {
    expect(isNetworkError({ message: 'Network request failed' })).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isNetworkError({ message: 'NETWORK ERROR' })).toBe(true)
    expect(isNetworkError({ message: 'TypeError: fetch failed' })).toBe(true)
  })

  it('returns false for auth errors', () => {
    expect(isNetworkError({ message: 'JWT expired' })).toBe(false)
  })

  it('handles null/undefined safely (returns falsy, not necessarily strict false)', () => {
    expect(isNetworkError(null)).toBeFalsy()
    expect(isNetworkError(undefined)).toBeFalsy()
    expect(isNetworkError({})).toBeFalsy()
  })
})

// ── isAuthError ───────────────────────────────────────────
// app.js:118
function isAuthError (err) {
  const msg = (err?.message ?? err?.code ?? '').toLowerCase()
  return msg.includes('jwt') || msg.includes('session') ||
         msg.includes('auth') || msg.includes('401')
}

describe('isAuthError', () => {
  it('detects JWT errors', () => {
    expect(isAuthError({ message: 'JWT expired' })).toBe(true)
  })

  it('detects session errors', () => {
    expect(isAuthError({ message: 'Session not found' })).toBe(true)
  })

  it('detects auth keyword', () => {
    expect(isAuthError({ message: 'Authentication failed' })).toBe(true)
  })

  it('detects 401 in message', () => {
    expect(isAuthError({ message: '401 Unauthorized' })).toBe(true)
  })

  it('detects 401 via code field', () => {
    expect(isAuthError({ code: '401' })).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isAuthError({ message: 'Failed to fetch' })).toBe(false)
  })

  it('handles null/undefined safely', () => {
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError({})).toBe(false)
  })
})

// ── mapMoodLabelToLevel ───────────────────────────────────
// app.js — single authoritative mapping from Edge Function labels to DB values
function mapMoodLabelToLevel (label) {
  switch (label) {
    case 'positive':  return '4'
    case 'neutral':   return '3'
    case 'subdued':   return '2'
    case 'concerned': return '1'
    default:          return '3'
  }
}

describe('mapMoodLabelToLevel', () => {
  it('positive → 4 (highest)', () => {
    expect(mapMoodLabelToLevel('positive')).toBe('4')
  })

  it('neutral → 3', () => {
    expect(mapMoodLabelToLevel('neutral')).toBe('3')
  })

  it('subdued → 2', () => {
    expect(mapMoodLabelToLevel('subdued')).toBe('2')
  })

  it('concerned → 1 (lowest)', () => {
    expect(mapMoodLabelToLevel('concerned')).toBe('1')
  })

  it('unknown labels fall back to neutral (3)', () => {
    expect(mapMoodLabelToLevel('happy')).toBe('3')
    expect(mapMoodLabelToLevel('')).toBe('3')
    expect(mapMoodLabelToLevel(undefined)).toBe('3')
  })
})

// ── saveCalendarEntryToDB — date construction ─────────────
// app.js:1018 — all-day events use noon UTC to prevent timezone drift
function buildStartsAt (entry) {
  return entry.allDay
    ? `${entry.date}T12:00:00Z`
    : `${entry.date}T${entry.time}:00`
}

describe('buildStartsAt (calendar event date construction)', () => {
  it('all-day events use noon UTC', () => {
    expect(buildStartsAt({ allDay: true, date: '2025-06-15', time: '00:00' }))
      .toBe('2025-06-15T12:00:00Z')
  })

  it('timed events use the given local time', () => {
    expect(buildStartsAt({ allDay: false, date: '2025-06-15', time: '14:30' }))
      .toBe('2025-06-15T14:30:00')
  })

  it('timed events at midnight are not confused with all-day', () => {
    expect(buildStartsAt({ allDay: false, date: '2025-06-15', time: '00:00' }))
      .toBe('2025-06-15T00:00:00')
  })
})
