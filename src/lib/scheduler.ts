// The core spaced-repetition algorithm. Pure functions only — no Vue
// import, no Pinia, no `new Date()` anywhere in here. Every function that
// needs "today" takes it as a parameter instead of reading the clock
// itself, which is what makes a sequence of reps spanning weeks testable
// in milliseconds with plain string dates, no fake-timer machinery needed.
//
// Deliberately standalone: no imports from src/stores or src/content.
// `ScheduledRep` below declares only the three fields this module actually
// needs from a rep log entry — a real `RepLog` (with `seconds`,
// `stuckLine`, etc.) satisfies it automatically by having a superset of
// fields (structural typing), so the store can hand this module its real
// data without either side importing the other.
//
// Dates are plain `YYYY-MM-DD` strings throughout (never full timestamps)
// specifically so "oldest due first" is just `Array.sort()` on strings,
// and "is this overdue" is just `<`.

export type RepResult = 'clean' | 'assisted' | 'failed'

export interface ScheduledRep {
  repNumber: number
  result: RepResult
  date: string // YYYY-MM-DD
}

const CLEAN_REPS_TO_GRADUATE = 3

// Days from completing rep N to when rep N+1 is due. REP_INTERVAL_DAYS[1]
// is "how long after solving is rep 1 due" (same day = 0). There's no
// entry past 5 because by the time a *clean* rep 5 happens, three
// consecutive clean reps have necessarily already occurred and the
// problem has graduated — see computeNextDueDate. A rep number can still
// exceed 5 after enough failures (failing doesn't advance the number, but
// it does reset the clean streak, so recovering from a slip at rep 5 can
// mean attempting rep 6+); untabulated rep numbers hold at the rep-5
// interval rather than throwing.
const REP_INTERVAL_DAYS: Record<number, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 7,
  5: 21,
}
const MAX_TABULATED_REP = 5
const FAILED_OR_ASSISTED_INTERVAL_DAYS = 1

function intervalForRepNumber(repNumber: number): number {
  return REP_INTERVAL_DAYS[repNumber] ?? REP_INTERVAL_DAYS[MAX_TABULATED_REP]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * How many clean reps have happened in a row, most recent first, stopping
 * at the first non-clean result (or the start of history). This is
 * derived from the log every time rather than stored as its own counter —
 * one source of truth, and a failed rep resetting it is then just "the
 * count stops at the failure" instead of a separate reset to keep in sync.
 */
export function deriveConsecutiveCleanReps(reps: readonly ScheduledRep[]): number {
  let count = 0
  for (let i = reps.length - 1; i >= 0; i--) {
    if (reps[i].result !== 'clean') break
    count++
  }
  return count
}

/** True once three consecutive clean reps have been logged — the problem
 *  leaves the queue permanently at this point. */
export function isGraduated(reps: readonly ScheduledRep[]): boolean {
  return deriveConsecutiveCleanReps(reps) >= CLEAN_REPS_TO_GRADUATE
}

/**
 * Which rep number the NEXT attempt should be logged as. A clean result
 * advances to repNumber + 1; a failed or assisted result does not — the
 * next attempt is a retry of the same numbered rep, per spec ("does not
 * advance the rep number").
 */
export function deriveCurrentRepNumber(reps: readonly ScheduledRep[]): number {
  if (reps.length === 0) return 1 // the very first rep after solving
  const last = reps[reps.length - 1]
  return last.result === 'clean' ? last.repNumber + 1 : last.repNumber
}

/**
 * The next due date, or `null` once graduated (leaves the queue for good).
 * `today` is only consulted when there's no rep history yet — rep 1 is
 * due the same day the problem was solved, and by the time any rep has
 * been logged, every future date is computed from that rep's own date,
 * never from "today".
 */
export function computeNextDueDate(reps: readonly ScheduledRep[], today: string): string | null {
  if (isGraduated(reps)) return null
  if (reps.length === 0) return today

  const last = reps[reps.length - 1]
  if (last.result === 'clean') {
    return addDays(last.date, intervalForRepNumber(last.repNumber + 1))
  }
  // Failed or assisted: reset the interval to +1 day, regardless of which
  // rep number this was.
  return addDays(last.date, FAILED_OR_ASSISTED_INTERVAL_DAYS)
}

// ---------- the rep queue ----------

export type DueStatus = 'overdue' | 'due-today'

export interface QueueEntry<T> {
  item: T
  dueStatus: DueStatus
}

/**
 * Filters to only what's actually due (nextDueDate <= today; graduated
 * items have nextDueDate === null and never appear), sorted oldest-due
 * first, each tagged overdue vs due-today.
 */
export function buildRepQueue<T extends { nextDueDate: string | null }>(items: readonly T[], today: string): QueueEntry<T>[] {
  return items
    .filter((item): item is T & { nextDueDate: string } => item.nextDueDate !== null && item.nextDueDate <= today)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .map((item) => ({ item, dueStatus: item.nextDueDate < today ? 'overdue' : 'due-today' }))
}

// ---------- cold reproduction rate — the headline metric ----------

/** clean reps ÷ reps attempted. 0 for an empty list (not NaN — an empty
 *  week has no rate to report, not a divide-by-zero to propagate). */
export function coldReproductionRate(reps: readonly { result: RepResult }[]): number {
  if (reps.length === 0) return 0
  const clean = reps.filter((r) => r.result === 'clean').length
  return clean / reps.length
}

export interface WeeklyRate {
  /** Monday of that week, YYYY-MM-DD. */
  weekStart: string
  rate: number
  attempted: number
}

function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  const day = d.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - daysSinceMonday)
  return d.toISOString().slice(0, 10)
}

/** Buckets every rep by the Monday of its week (matching the curriculum's
 *  own Monday-Saturday/Sunday weekly schedule) and computes the cold
 *  reproduction rate per bucket, oldest week first — this is the series
 *  the dashboard charts over time. */
export function weeklyColdReproductionRates(reps: readonly { date: string; result: RepResult }[]): WeeklyRate[] {
  const buckets = new Map<string, { result: RepResult }[]>()
  for (const rep of reps) {
    const weekStart = startOfWeek(rep.date)
    const bucket = buckets.get(weekStart)
    if (bucket) bucket.push(rep)
    else buckets.set(weekStart, [rep])
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weekReps]) => ({
      weekStart,
      rate: coldReproductionRate(weekReps),
      attempted: weekReps.length,
    }))
}
