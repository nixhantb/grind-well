import { describe, it, expect } from 'vitest'
import {
  deriveConsecutiveCleanReps,
  isGraduated,
  deriveCurrentRepNumber,
  computeNextDueDate,
  buildRepQueue,
  coldReproductionRate,
  weeklyColdReproductionRates,
  type ScheduledRep,
} from './scheduler'

function rep(repNumber: number, result: ScheduledRep['result'], date: string): ScheduledRep {
  return { repNumber, result, date }
}

describe('deriveConsecutiveCleanReps', () => {
  it('is 0 with no history', () => {
    expect(deriveConsecutiveCleanReps([])).toBe(0)
  })

  it('counts every rep when all are clean', () => {
    const reps = [rep(1, 'clean', '2026-01-01'), rep(2, 'clean', '2026-01-02'), rep(3, 'clean', '2026-01-05')]
    expect(deriveConsecutiveCleanReps(reps)).toBe(3)
  })

  it('only counts the trailing clean streak, stopping at the last failure', () => {
    const reps = [
      rep(1, 'clean', '2026-01-01'),
      rep(2, 'failed', '2026-01-02'), // streak breaks here
      rep(2, 'clean', '2026-01-03'),
      rep(3, 'clean', '2026-01-06'),
    ]
    expect(deriveConsecutiveCleanReps(reps)).toBe(2)
  })

  it('is 0 when the most recent rep was assisted', () => {
    const reps = [rep(1, 'clean', '2026-01-01'), rep(2, 'assisted', '2026-01-02')]
    expect(deriveConsecutiveCleanReps(reps)).toBe(0)
  })
})

describe('isGraduated', () => {
  it('is false below 3 consecutive clean reps', () => {
    expect(isGraduated([rep(1, 'clean', '2026-01-01'), rep(2, 'clean', '2026-01-02')])).toBe(false)
  })

  it('is true at exactly 3 consecutive clean reps', () => {
    expect(isGraduated([rep(1, 'clean', '2026-01-01'), rep(2, 'clean', '2026-01-02'), rep(3, 'clean', '2026-01-05')])).toBe(
      true,
    )
  })

  it('stays true beyond 3 (e.g. all 5 clean)', () => {
    const reps = [1, 2, 3, 4, 5].map((n) => rep(n, 'clean', `2026-01-0${n}`))
    expect(isGraduated(reps)).toBe(true)
  })
})

describe('deriveCurrentRepNumber', () => {
  it('is 1 with no history (the first rep after solving)', () => {
    expect(deriveCurrentRepNumber([])).toBe(1)
  })

  it('advances after a clean rep', () => {
    expect(deriveCurrentRepNumber([rep(1, 'clean', '2026-01-01')])).toBe(2)
  })

  it('does NOT advance after a failed rep — next attempt retries the same number', () => {
    expect(deriveCurrentRepNumber([rep(2, 'failed', '2026-01-01')])).toBe(2)
  })

  it('does not advance after an assisted rep either', () => {
    expect(deriveCurrentRepNumber([rep(3, 'assisted', '2026-01-01')])).toBe(3)
  })

  it('only looks at the LAST rep, not the whole history', () => {
    const reps = [rep(1, 'failed', '2026-01-01'), rep(1, 'clean', '2026-01-02')]
    expect(deriveCurrentRepNumber(reps)).toBe(2)
  })
})

describe('computeNextDueDate', () => {
  const today = '2026-06-15'

  it('is due today when there is no rep history yet (rep 1, same day as solving)', () => {
    expect(computeNextDueDate([], today)).toBe(today)
  })

  it('schedules rep 2 for +1 day after a clean rep 1', () => {
    expect(computeNextDueDate([rep(1, 'clean', '2026-01-01')], today)).toBe('2026-01-02')
  })

  it('schedules rep 3 for +3 days after a clean rep 2', () => {
    expect(computeNextDueDate([rep(1, 'clean', '2026-01-01'), rep(2, 'clean', '2026-01-02')], today)).toBe(
      '2026-01-05',
    )
  })

  it('graduates (returns null) the moment a 3rd consecutive clean rep lands, before rep 4/5 are ever scheduled', () => {
    const reps = [rep(1, 'clean', '2026-01-01'), rep(2, 'clean', '2026-01-02'), rep(3, 'clean', '2026-01-05')]
    expect(computeNextDueDate(reps, today)).toBeNull()
  })

  it('schedules rep 5 for +21 days after a clean rep 4, when the streak was interrupted too recently to graduate yet', () => {
    // Consecutive-clean is measured from the END of history, not from a
    // fixed rep number — so the streak must break within the trailing 3
    // to still be short of graduating by rep 4. Here: clean, clean,
    // FAILED (streak breaks), clean, clean — trailing streak is only 2.
    const reps = [
      rep(1, 'clean', '2026-01-01'),
      rep(2, 'clean', '2026-01-02'),
      rep(3, 'failed', '2026-01-05'), // breaks the streak
      rep(3, 'clean', '2026-01-06'), // retry — consecutive count restarts at 1
      rep(4, 'clean', '2026-01-13'), // consecutive count is now 2, not 3 — not graduated
    ]
    expect(isGraduated(reps)).toBe(false)
    expect(computeNextDueDate(reps, today)).toBe('2026-02-03') // 2026-01-13 + 21 (rep 5's interval)
  })

  it('a failed rep resets the interval to +1 day, regardless of which rep number it was', () => {
    expect(computeNextDueDate([rep(4, 'failed', '2026-01-01')], today)).toBe('2026-01-02')
  })

  it('an assisted rep also resets the interval to +1 day', () => {
    expect(computeNextDueDate([rep(2, 'assisted', '2026-01-01')], today)).toBe('2026-01-02')
  })

  it('holds at the rep-5 interval (21 days) for rep numbers beyond 5', () => {
    // A slip at rep 5 means the retry is still "rep 5"; a slip at rep 6
    // is off the tabulated end entirely — must not throw or return undefined.
    const reps = [
      rep(1, 'clean', '2026-01-01'),
      rep(2, 'clean', '2026-01-02'),
      rep(3, 'failed', '2026-01-05'),
      rep(3, 'clean', '2026-01-06'),
      rep(4, 'clean', '2026-01-13'),
      rep(5, 'failed', '2026-02-03'),
      rep(5, 'clean', '2026-02-04'), // this is rep "6" in practice, off the table
    ]
    expect(computeNextDueDate(reps, today)).toBe('2026-02-25') // 2026-02-04 + 21
  })
})

describe('buildRepQueue', () => {
  const today = '2026-06-15'

  it('excludes graduated problems (nextDueDate: null)', () => {
    const items = [{ id: 1, nextDueDate: null }]
    expect(buildRepQueue(items, today)).toEqual([])
  })

  it('excludes problems not yet due', () => {
    const items = [{ id: 1, nextDueDate: '2026-06-20' }]
    expect(buildRepQueue(items, today)).toEqual([])
  })

  it('tags overdue vs due-today correctly', () => {
    const items = [
      { id: 1, nextDueDate: '2026-06-10' }, // overdue
      { id: 2, nextDueDate: today }, // due today
    ]
    const queue = buildRepQueue(items, today)
    expect(queue).toEqual([
      { item: { id: 1, nextDueDate: '2026-06-10' }, dueStatus: 'overdue' },
      { item: { id: 2, nextDueDate: today }, dueStatus: 'due-today' },
    ])
  })

  it('sorts oldest-due first', () => {
    const items = [
      { id: 1, nextDueDate: '2026-06-14' },
      { id: 2, nextDueDate: '2026-06-01' },
      { id: 3, nextDueDate: '2026-06-10' },
    ]
    expect(buildRepQueue(items, today).map((q) => q.item.id)).toEqual([2, 3, 1])
  })
})

describe('coldReproductionRate', () => {
  it('is 0 for an empty list, not NaN', () => {
    expect(coldReproductionRate([])).toBe(0)
  })

  it('is 1 when every rep was clean', () => {
    expect(coldReproductionRate([{ result: 'clean' }, { result: 'clean' }])).toBe(1)
  })

  it('is the correct fraction for a mixed set', () => {
    const reps: { result: ScheduledRep['result'] }[] = [
      { result: 'clean' },
      { result: 'clean' },
      { result: 'assisted' },
      { result: 'failed' },
      { result: 'clean' },
    ]
    expect(coldReproductionRate(reps)).toBeCloseTo(3 / 5)
  })
})

describe('weeklyColdReproductionRates', () => {
  // Derive real week boundaries at test time instead of hardcoding a
  // calendar date's weekday — this is an independent, trivially-correct
  // oracle (a forward scan for Monday), not a re-implementation of the
  // module's own startOfWeek logic.
  function nextMonday(from: string): string {
    const d = new Date(`${from}T00:00:00.000Z`)
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
  }
  function plusDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const week1Monday = nextMonday('2026-01-01')
  const week1Tuesday = plusDays(week1Monday, 1)
  const week2Monday = plusDays(week1Monday, 7)

  it('buckets reps in the same week together, anchored to that week\'s Monday', () => {
    const reps: { date: string; result: ScheduledRep['result'] }[] = [
      { date: week1Monday, result: 'clean' },
      { date: week1Tuesday, result: 'failed' },
    ]
    const weeks = weeklyColdReproductionRates(reps)
    expect(weeks).toEqual([{ weekStart: week1Monday, rate: 0.5, attempted: 2 }])
  })

  it('separates reps exactly 7 days apart into two week buckets, oldest first', () => {
    const reps: { date: string; result: ScheduledRep['result'] }[] = [
      { date: week2Monday, result: 'clean' },
      { date: week1Monday, result: 'failed' },
    ]
    const weeks = weeklyColdReproductionRates(reps)
    expect(weeks).toEqual([
      { weekStart: week1Monday, rate: 0, attempted: 1 },
      { weekStart: week2Monday, rate: 1, attempted: 1 },
    ])
  })

  it('returns an empty series for no reps', () => {
    expect(weeklyColdReproductionRates([])).toEqual([])
  })
})
