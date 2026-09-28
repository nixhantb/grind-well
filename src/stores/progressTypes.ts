// Shapes for the user's PRACTICE data — distinct from src/content/types.ts,
// which is the static curriculum. These get mutated constantly and
// persisted to localStorage, so every one is a Zod schema rather than a
// TS interface + a hand-written type guard: a corrupted or hand-edited
// localStorage blob is exactly the kind of input only a real runtime
// check protects against, and Zod derives both that check AND the
// TypeScript type from the one schema, instead of the two staying in
// sync by hand.
import { z } from 'zod'

export const repResultSchema = z.enum(['clean', 'assisted', 'failed'])
export type RepResult = z.infer<typeof repResultSchema>

export const repLogSchema = z.object({
  problemId: z.number(),
  repNumber: z.number(),
  date: z.string(), // ISO
  result: repResultSchema,
  seconds: z.number(),
  stuckLine: z.string().nullable(),
  usedReference: z.boolean(),
  // Nullable AND optional: rep logs written before this field existed
  // have no `methodSignature` key at all, and they must keep loading
  // rather than get flagged corrupted.
  methodSignature: z.string().nullable().optional(),
})
export type RepLog = z.infer<typeof repLogSchema>

export const problemStatusSchema = z.enum(['not-started', 'in-progress', 'solved', 'graduated'])
export type ProblemStatus = z.infer<typeof problemStatusSchema>

export const problemStateSchema = z.object({
  problemId: z.number(),
  status: problemStatusSchema,
  reps: z.array(repLogSchema),
  nextDueDate: z.string().nullable(),
  solutionCode: z.string(),
  notes: z.string(),
})
export type ProblemState = z.infer<typeof problemStateSchema>

// Keyed by problem id — JSON object keys are always strings, so this
// validates that each one at least looks like a number rather than
// trusting a corrupted blob's garbage keys.
export const problemStatesMapSchema = z.record(
  z.string().refine((key) => !Number.isNaN(Number(key)), 'expected a numeric key'),
  problemStateSchema,
)
export type ProblemStatesMap = z.infer<typeof problemStatesMapSchema>

export function defaultProblemState(problemId: number): ProblemState {
  return {
    problemId,
    status: 'not-started',
    reps: [],
    nextDueDate: null,
    solutionCode: '',
    notes: '',
  }
}
