// The one module the rest of the app imports from — never content.generated.ts
// directly. This is where we assert the data is intact before anything tries
// to render it: a corrupted localStorage write can't touch this file, but a
// bad regenerate or a hand-edit could, and a half-empty pattern list failing
// silently is worse than the app refusing to start.
import { PATTERNS, PROBLEMS, LADDER } from './content.generated'

export type { Difficulty, Pattern, Problem, LadderStep } from './types'

if (PATTERNS.length !== 24) {
  throw new Error(`content.generated.ts is stale: expected 24 patterns, found ${PATTERNS.length}`)
}
if (PROBLEMS.length !== 149) {
  throw new Error(`content.generated.ts is stale: expected 149 problems, found ${PROBLEMS.length}`)
}
if (LADDER.length !== 7) {
  throw new Error(`content.generated.ts is stale: expected 7 ladder steps, found ${LADDER.length}`)
}

export const patterns = PATTERNS
export const problems = PROBLEMS
export const ladder = LADDER
