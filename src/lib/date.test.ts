import { describe, it, expect } from 'vitest'
import { parseLocalDateISO } from './date'

describe('parseLocalDateISO', () => {
  it('reads year/month/day back as the same local calendar date', () => {
    const d = parseLocalDateISO('2026-06-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5) // June, zero-indexed
    expect(d.getDate()).toBe(15)
  })

  it('does not shift a day backward the way new Date(str) can in negative-offset timezones', () => {
    // new Date('2026-06-15') parses as UTC midnight, which reads back as
    // June 14 through local getters anywhere behind UTC — the exact bug
    // this helper exists to avoid.
    const viaStringParse = new Date('2026-06-15')
    const viaLocalParse = parseLocalDateISO('2026-06-15')
    expect(viaLocalParse.getDate()).toBe(15)
    // Only assert the two diverge when the environment's offset would
    // actually produce the bug, so this test stays meaningful (not
    // vacuous) without being flaky in a UTC or positive-offset CI runner.
    if (new Date().getTimezoneOffset() > 0) {
      expect(viaStringParse.getDate()).not.toBe(viaLocalParse.getDate())
    }
  })

  it('handles year boundaries', () => {
    const d = parseLocalDateISO('2025-12-31')
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth()).toBe(11)
    expect(d.getDate()).toBe(31)
  })
})
