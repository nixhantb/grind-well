// Character-level diff (a small hand-rolled LCS implementation) plus the
// "which line did you stall on" prefill helper the trainer's log form
// needs. Pure functions, no Vue import — same reasoning as scheduler.ts:
// this is exactly the kind of logic that's easy to get subtly wrong, so
// it belongs somewhere it can be unit-tested in isolation.

export type DiffSegmentType = 'equal' | 'insert' | 'delete'

export interface DiffSegment {
  type: DiffSegmentType
  text: string
}

/**
 * Longest Common Subsequence diff, at the character level. `delete` means
 * "in `reference` but not in `typed`" (you're missing this); `insert`
 * means "in `typed` but not in `reference`" (you added something extra).
 *
 * Classic two-step LCS diff: build an (n+1)×(m+1) table of LCS lengths
 * computed BACKWARDS (lcsLen[i][j] = LCS length of the two SUFFIXES
 * starting at i and j), then walk FORWARDS from the start, at each step
 * following whichever neighbour cell matches the running LCS length —
 * that greedy-looking walk is guaranteed correct because the table
 * already encodes the optimal answer for every suffix pair.
 */
export function diffChars(reference: string, typed: string): DiffSegment[] {
  const n = reference.length
  const m = typed.length

  const lcsLen: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcsLen[i][j] =
        reference[i] === typed[j] ? lcsLen[i + 1][j + 1] + 1 : Math.max(lcsLen[i + 1][j], lcsLen[i][j + 1])
    }
  }

  const segments: DiffSegment[] = []
  function append(type: DiffSegmentType, ch: string) {
    const last = segments[segments.length - 1]
    if (last && last.type === type) last.text += ch
    else segments.push({ type, text: ch })
  }

  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (reference[i] === typed[j]) {
      append('equal', reference[i])
      i++
      j++
    } else if (lcsLen[i + 1][j] >= lcsLen[i][j + 1]) {
      append('delete', reference[i])
      i++
    } else {
      append('insert', typed[j])
      j++
    }
  }
  while (i < n) {
    append('delete', reference[i])
    i++
  }
  while (j < m) {
    append('insert', typed[j])
    j++
  }
  return segments
}

/**
 * Collapses runs of horizontal whitespace and trims each line, but keeps
 * line breaks. "I care about the mechanics, not my brace style" means
 * indentation depth and trailing spaces shouldn't count as differences —
 * but which line something landed on still should.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
}

export interface DiffResult {
  segments: DiffSegment[]
  /** Fraction (0–1) of the reference reproduced correctly — equal chars
   *  divided by the reference's length. Deliberately NOT a symmetric
   *  similarity measure: the reference is the thing being reproduced
   *  from memory, so "100 extra characters typed" shouldn't dilute the
   *  score the same way "100 characters missing" should. */
  similarity: number
}

export function computeDiff(reference: string, typed: string, options: { ignoreWhitespace: boolean }): DiffResult {
  const a = options.ignoreWhitespace ? normalizeWhitespace(reference) : reference
  const b = options.ignoreWhitespace ? normalizeWhitespace(typed) : typed
  const segments = diffChars(a, b)

  if (a.length === 0) return { segments, similarity: b.length === 0 ? 1 : 0 }
  const equalChars = segments.filter((s) => s.type === 'equal').reduce((sum, s) => sum + s.text.length, 0)
  return { segments, similarity: equalChars / a.length }
}

/**
 * The first reference line that doesn't match the typed line in the same
 * position — prefills "which line did you stall on?" for free, per spec.
 * Comparison is whitespace-insensitive by default (matching the diff's
 * own default), but the returned text is always the ORIGINAL reference
 * line, not a normalized one — you want to see the real line, just
 * without indentation false-flagging it as the divergence point.
 */
export function firstDivergentLine(reference: string, typed: string, ignoreWhitespace = true): string | null {
  const compareRef = (ignoreWhitespace ? normalizeWhitespace(reference) : reference).split('\n')
  const compareTyped = (ignoreWhitespace ? normalizeWhitespace(typed) : typed).split('\n')
  const rawRefLines = reference.split('\n')

  for (let i = 0; i < compareRef.length; i++) {
    if (compareRef[i] !== compareTyped[i]) return rawRefLines[i]
  }
  return null
}
