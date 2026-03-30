/**
 * Unit tests for offline queue helper logic (app.js)
 */

import { describe, it, expect } from 'vitest'

// ── updateOfflineBanner text ──────────────────────────────
// app.js — the banner text depends on queue length
function offlineBannerText (queueLength) {
  const n = queueLength
  if (!n) return ''
  const noun = n === 1 ? 'Nachricht wird' : `${n} Nachrichten werden`
  return `Offline — ${noun} gesendet sobald Sie wieder online sind.`
}

describe('offline banner text', () => {
  it('returns empty string when queue is empty', () => {
    expect(offlineBannerText(0)).toBe('')
  })

  it('uses singular form for 1 message', () => {
    expect(offlineBannerText(1))
      .toBe('Offline — Nachricht wird gesendet sobald Sie wieder online sind.')
  })

  it('uses plural form for 2 messages', () => {
    expect(offlineBannerText(2))
      .toBe('Offline — 2 Nachrichten werden gesendet sobald Sie wieder online sind.')
  })

  it('uses plural form for larger counts', () => {
    expect(offlineBannerText(5))
      .toBe('Offline — 5 Nachrichten werden gesendet sobald Sie wieder online sind.')
  })
})
