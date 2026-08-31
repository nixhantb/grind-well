import { describe, it, expect } from 'vitest'
import { suggestNextProblem } from './suggestNextProblem'

const problems = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe('suggestNextProblem', () => {
  it('returns the first problem when nothing has been touched', () => {
    expect(suggestNextProblem(problems, new Set())).toEqual({ id: 1 })
  })

  it('returns the first UNTOUCHED problem, not just the first in the list', () => {
    expect(suggestNextProblem(problems, new Set([1]))).toEqual({ id: 2 })
  })

  it('skips over multiple touched problems', () => {
    expect(suggestNextProblem(problems, new Set([1, 2]))).toEqual({ id: 3 })
  })

  it('returns null once every problem has been touched', () => {
    expect(suggestNextProblem(problems, new Set([1, 2, 3]))).toBeNull()
  })

  it('returns null for an empty problem list', () => {
    expect(suggestNextProblem([], new Set())).toBeNull()
  })
})
