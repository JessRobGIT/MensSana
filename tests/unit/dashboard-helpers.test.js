/**
 * Unit tests for pure helper functions from dashboard.js
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ── escHtml ───────────────────────────────────────────────
// dashboard.js:30
function escHtml (s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

describe('escHtml', () => {
  it('escapes HTML special characters including >', () => {
    expect(escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
  })

  it('handles null/undefined by returning empty string', () => {
    expect(escHtml(null)).toBe('')
    expect(escHtml(undefined)).toBe('')
  })

  it('converts numbers to string first', () => {
    expect(escHtml(42)).toBe('42')
  })
})

// ── initials ──────────────────────────────────────────────
// dashboard.js:66
function initials (name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

describe('initials', () => {
  it('returns first letter of a single name', () => {
    expect(initials('Anna')).toBe('A')
  })

  it('returns initials of first two words', () => {
    expect(initials('Hans Müller')).toBe('HM')
  })

  it('uses only first two initials even for three-word names', () => {
    expect(initials('Maria Anna Schulz')).toBe('MA')
  })

  it('is uppercase', () => {
    expect(initials('anna müller')).toBe('AM')
  })

  it('returns "?" for empty/null input', () => {
    expect(initials(null)).toBe('?')
    expect(initials('')).toBe('?')
    expect(initials(undefined)).toBe('?')
  })
})

// ── freqLabel ─────────────────────────────────────────────
// dashboard.js:71
function freqLabel (f) {
  return { daily:'Täglich', weekly:'Wöchentlich', as_needed:'Bei Bedarf' }[f] ?? f
}

describe('freqLabel', () => {
  it('maps daily to German', () => {
    expect(freqLabel('daily')).toBe('Täglich')
  })

  it('maps weekly to German', () => {
    expect(freqLabel('weekly')).toBe('Wöchentlich')
  })

  it('maps as_needed to German', () => {
    expect(freqLabel('as_needed')).toBe('Bei Bedarf')
  })

  it('returns the raw value for unknown frequencies', () => {
    expect(freqLabel('monthly')).toBe('monthly')
  })
})

// ── activityClass ─────────────────────────────────────────
// dashboard.js:58
function activityClass (iso) {
  if (!iso) return 'activity-none'
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000
  if (hours < 24) return 'activity-ok'
  if (hours < 72) return 'activity-warn'
  return 'activity-none'
}

describe('activityClass', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns activity-none for null', () => {
    expect(activityClass(null)).toBe('activity-none')
    expect(activityClass(undefined)).toBe('activity-none')
  })

  it('returns activity-ok for activity within 24 hours', () => {
    const oneHourAgo = new Date('2025-06-15T11:00:00Z').toISOString()
    expect(activityClass(oneHourAgo)).toBe('activity-ok')
  })

  it('returns activity-ok for activity just under 24 hours', () => {
    const almostADay = new Date('2025-06-14T12:30:00Z').toISOString()
    expect(activityClass(almostADay)).toBe('activity-ok')
  })

  it('returns activity-warn between 24 and 72 hours', () => {
    const twoDaysAgo = new Date('2025-06-13T12:00:00Z').toISOString()
    expect(activityClass(twoDaysAgo)).toBe('activity-warn')
  })

  it('returns activity-none for activity older than 72 hours', () => {
    const fourDaysAgo = new Date('2025-06-11T12:00:00Z').toISOString()
    expect(activityClass(fourDaysAgo)).toBe('activity-none')
  })
})

// ── relativeTime ──────────────────────────────────────────
// dashboard.js:44
function relativeTime (iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2)   return 'Gerade eben'
  if (m < 60)  return `Vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Vor ${h} Std.`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Gestern'
  if (d < 7)   return `Vor ${d} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day:'numeric', month:'short' })
}

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "—" for null/undefined', () => {
    expect(relativeTime(null)).toBe('—')
    expect(relativeTime(undefined)).toBe('—')
  })

  it('returns "Gerade eben" for less than 2 minutes ago', () => {
    const oneMinAgo = new Date('2025-06-15T11:59:10Z').toISOString()
    expect(relativeTime(oneMinAgo)).toBe('Gerade eben')
  })

  it('returns "Vor N Min." for 2-59 minutes ago', () => {
    const tenMinAgo = new Date('2025-06-15T11:50:00Z').toISOString()
    expect(relativeTime(tenMinAgo)).toBe('Vor 10 Min.')
  })

  it('returns "Vor N Std." for same-day hours', () => {
    const threeHoursAgo = new Date('2025-06-15T09:00:00Z').toISOString()
    expect(relativeTime(threeHoursAgo)).toBe('Vor 3 Std.')
  })

  it('returns "Gestern" for exactly one day ago', () => {
    const yesterday = new Date('2025-06-14T12:00:00Z').toISOString()
    expect(relativeTime(yesterday)).toBe('Gestern')
  })

  it('returns "Vor N Tagen" for 2-6 days ago', () => {
    const threeDaysAgo = new Date('2025-06-12T12:00:00Z').toISOString()
    expect(relativeTime(threeDaysAgo)).toBe('Vor 3 Tagen')
  })

  it('returns formatted date for 7+ days ago', () => {
    const tenDaysAgo = new Date('2025-06-05T12:00:00Z').toISOString()
    const result = relativeTime(tenDaysAgo)
    // Locale-formatted: "5. Juni" — just verify it contains the day number
    expect(result).toMatch(/5/)
  })
})

// ── MOOD_LABELS / MOOD_CLASS ──────────────────────────────
// dashboard.js:34-35
const MOOD_LABELS = { '4':'Positiv', '3':'Neutral', '2':'Zurückhaltend', '1':'Besorgt' }
const MOOD_CLASS  = { '4':'m4', '3':'m3', '2':'m2', '1':'m1' }

describe('MOOD_LABELS', () => {
  it('covers all four levels', () => {
    expect(Object.keys(MOOD_LABELS)).toHaveLength(4)
    expect(Object.keys(MOOD_LABELS)).toContain('4')
    expect(Object.keys(MOOD_LABELS)).toContain('1')
  })

  it('level 4 is Positiv', () => {
    expect(MOOD_LABELS['4']).toBe('Positiv')
  })

  it('level 1 is Besorgt', () => {
    expect(MOOD_LABELS['1']).toBe('Besorgt')
  })
})

describe('MOOD_CLASS', () => {
  it('maps level 4 to m4', () => {
    expect(MOOD_CLASS['4']).toBe('m4')
  })

  it('maps level 1 to m1', () => {
    expect(MOOD_CLASS['1']).toBe('m1')
  })
})
