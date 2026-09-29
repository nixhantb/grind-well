import { describe, it, expect } from 'vitest'
import { pickColdAuditSample } from './coldAudit'

const problems = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]

describe('pickColdAuditSample', () => {
  it('only ever picks from the graduated pool', () => {
    const sample = pickColdAuditSample(problems, new Set([2, 4]), 3)
    expect(sample.map((p) => p.id).sort()).toEqual([2, 4])
  })

  it('returns exactly `count` items when enough graduated problems exist', () => {
    const sample = pickColdAuditSample(problems, new Set([1, 2, 3, 4, 5]), 3)
    expect(sample).toHaveLength(3)
  })

  it('never returns duplicates', () => {
    const sample = pickColdAuditSample(problems, new Set([1, 2, 3, 4, 5]), 5)
    const ids = sample.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns an empty array when nothing has graduated', () => {
    expect(pickColdAuditSample(problems, new Set(), 3)).toEqual([])
  })

  it('is deterministic given an injected random function', () => {
    // random() always returns 0 -> always picks the first remaining item
    const sample = pickColdAuditSample(problems, new Set([1, 2, 3, 4, 5]), 3, () => 0)
    expect(sample.map((p) => p.id)).toEqual([1, 2, 3])
  })
})
