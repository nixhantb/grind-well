import { describe, it, expect } from 'vitest'
import { stuckLineFrequency } from './stuckLines'

describe('stuckLineFrequency', () => {
  it('counts repeated lines and sorts most-frequent first', () => {
    const reps = [
      { stuckLine: 'while (fast != null && fast.next != null)' },
      { stuckLine: 'int need = target - x;' },
      { stuckLine: 'while (fast != null && fast.next != null)' },
      { stuckLine: 'while (fast != null && fast.next != null)' },
    ]
    expect(stuckLineFrequency(reps)).toEqual([
      { line: 'while (fast != null && fast.next != null)', count: 3 },
      { line: 'int need = target - x;', count: 1 },
    ])
  })

  it('ignores null and empty/whitespace-only stuck lines', () => {
    const reps = [{ stuckLine: null }, { stuckLine: '' }, { stuckLine: '   ' }, { stuckLine: 'real line' }]
    expect(stuckLineFrequency(reps)).toEqual([{ line: 'real line', count: 1 }])
  })

  it('groups whitespace-only variants together, displaying the first occurrence', () => {
    const reps = [{ stuckLine: 'int  x = 0;' }, { stuckLine: 'int x = 0;' }, { stuckLine: 'int   x = 0;' }]
    expect(stuckLineFrequency(reps)).toEqual([{ line: 'int  x = 0;', count: 3 }])
  })

  it('returns an empty array for no reps', () => {
    expect(stuckLineFrequency([])).toEqual([])
  })

  it('breaks a count tie alphabetically for stable ordering', () => {
    const reps = [{ stuckLine: 'zebra' }, { stuckLine: 'apple' }]
    expect(stuckLineFrequency(reps)).toEqual([
      { line: 'apple', count: 1 },
      { line: 'zebra', count: 1 },
    ])
  })
})
