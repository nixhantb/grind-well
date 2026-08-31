// "You have stalled on `while (...)` six times" — per spec, the single
// most useful thing this app can tell you. Groups rep logs' stuckLine
// text and counts repeats, most-frequent first.
import { normalizeWhitespace } from './diff'

export interface StuckLineFrequency {
  /** The original (non-normalized) text of the first occurrence seen —
   *  what gets displayed. */
  line: string
  count: number
}

/**
 * Groups by whitespace-normalized text (so "int x = 0;" and "int  x = 0;"
 * count as the same stall, matching the diff's own whitespace-insensitive
 * default) but displays the first occurrence's exact original text.
 */
export function stuckLineFrequency(reps: readonly { stuckLine: string | null }[]): StuckLineFrequency[] {
  const buckets = new Map<string, StuckLineFrequency>()

  for (const rep of reps) {
    if (rep.stuckLine === null) continue
    const trimmed = rep.stuckLine.trim()
    if (trimmed === '') continue

    const key = normalizeWhitespace(trimmed)
    const existing = buckets.get(key)
    if (existing) existing.count++
    else buckets.set(key, { line: trimmed, count: 1 })
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count || a.line.localeCompare(b.line))
}
