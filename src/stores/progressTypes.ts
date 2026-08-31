// Shapes for the user's PRACTICE data — distinct from src/content/types.ts,
// which is the static curriculum. These get mutated constantly and
// persisted to localStorage, so every one of them needs a runtime type
// guard alongside it: TypeScript's types vanish at build time, but a
// corrupted or hand-edited localStorage blob is exactly the kind of input
// TypeScript can't protect against — only a real runtime check can.

export type RepResult = 'clean' | 'assisted' | 'failed'

export interface RepLog {
  problemId: number
  repNumber: number
  date: string // ISO
  result: RepResult
  seconds: number
  stuckLine: string | null
  usedReference: boolean
}

export type ProblemStatus = 'not-started' | 'in-progress' | 'solved' | 'graduated'

export interface ProblemState {
  problemId: number
  status: ProblemStatus
  reps: RepLog[]
  nextDueDate: string | null
  solutionCode: string
  notes: string
}

export type ProblemStatesMap = Record<number, ProblemState>

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isRepResult(v: unknown): v is RepResult {
  return v === 'clean' || v === 'assisted' || v === 'failed'
}

export function isRepLog(v: unknown): v is RepLog {
  if (!isRecord(v)) return false
  return (
    typeof v.problemId === 'number' &&
    typeof v.repNumber === 'number' &&
    typeof v.date === 'string' &&
    isRepResult(v.result) &&
    typeof v.seconds === 'number' &&
    (v.stuckLine === null || typeof v.stuckLine === 'string') &&
    typeof v.usedReference === 'boolean'
  )
}

export function isProblemStatus(v: unknown): v is ProblemStatus {
  return v === 'not-started' || v === 'in-progress' || v === 'solved' || v === 'graduated'
}

export function isProblemState(v: unknown): v is ProblemState {
  if (!isRecord(v)) return false
  return (
    typeof v.problemId === 'number' &&
    isProblemStatus(v.status) &&
    Array.isArray(v.reps) &&
    v.reps.every(isRepLog) &&
    (v.nextDueDate === null || typeof v.nextDueDate === 'string') &&
    typeof v.solutionCode === 'string' &&
    typeof v.notes === 'string'
  )
}

export function isProblemStatesMap(v: unknown): v is ProblemStatesMap {
  if (!isRecord(v)) return false
  return Object.entries(v).every(([key, value]) => !Number.isNaN(Number(key)) && isProblemState(value))
}
