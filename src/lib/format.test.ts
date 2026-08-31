import { describe, it, expect } from 'vitest'
import { formatSeconds } from './format'

describe('formatSeconds', () => {
  it('pads single-digit seconds', () => {
    expect(formatSeconds(65)).toBe('1:05')
  })

  it('handles 0', () => {
    expect(formatSeconds(0)).toBe('0:00')
  })

  it('handles exact minutes', () => {
    expect(formatSeconds(120)).toBe('2:00')
  })

  it('does not pad the minutes part', () => {
    expect(formatSeconds(3661)).toBe('61:01')
  })

  it('floors fractional seconds', () => {
    expect(formatSeconds(59.9)).toBe('0:59')
  })

  it('clamps negative input to 0:00 rather than showing a negative time', () => {
    expect(formatSeconds(-5)).toBe('0:00')
  })
})
