// The domain store: everything the user does — rep results, saved
// solutions, notes — lives here, keyed by problem id. Phase 5's scheduler
// (pure functions, no Vue) gets wired in here: this is the one place a
// rep result turns into "what's the next due date, did this graduate" —
// components never call the scheduler directly, they call store actions.
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { readFromStorage, writeToStorage, debounce, type StorageWarning } from '../lib/storage'
import { computeNextDueDate, isGraduated, buildRepQueue, coldReproductionRate } from '../lib/scheduler'
import { todayISO } from '../lib/date'
import { problems } from '../content'
import type { Problem } from '../content/types'
import {
  defaultProblemState,
  problemStatesMapSchema,
  type ProblemState,
  type ProblemStatus,
  type ProblemStatesMap,
  type RepLog,
} from './progressTypes'

const STORAGE_KEY = 'fluency:progress:v1'

export const useProgressStore = defineStore('progress', () => {
  const { value: initial, warning } = readFromStorage(STORAGE_KEY, problemStatesMapSchema, {})

  const problemStates = reactive<ProblemStatesMap>(initial)

  const storageWarning = ref<StorageWarning | null>(warning)

  const saveProgress = debounce(() => writeToStorage(STORAGE_KEY, { ...problemStates }), 500)
  // Watching a `reactive` object directly is implicitly deep — unlike a
  // `ref`, where you'd need `{ deep: true }` to notice a nested mutation.
  // This fires on every add/update/delete anywhere in the map.
  watch(problemStates, () => saveProgress())

  /** Read-only lookup. Never mutate the object this returns — it may be
   *  a throwaway default, not the stored entry; go through the actions
   *  below instead. */
  function getState(problemId: number): ProblemState {
    return problemStates[problemId] ?? defaultProblemState(problemId)
  }

  // ---------- derived state ----------
  // Every screen that needs "what's due right now" reads the SAME cached
  // computation — the Dashboard's due-count and the Queue's full list are
  // guaranteed to agree because they're literally the same array.

  interface QueueRow {
    problem: Problem
    nextDueDate: string | null
  }

  const dueQueue = computed(() => {
    const rows: QueueRow[] = problems.map((problem) => ({
      problem,
      nextDueDate: getState(problem.id).nextDueDate,
    }))
    return buildRepQueue(rows, todayISO())
  })

  const allReps = computed(() => Object.values(problemStates).flatMap((state) => state.reps))

  const overallColdReproductionRate = computed(() => coldReproductionRate(allReps.value))

  // ---------- actions ----------

  function updateNotes(problemId: number, notes: string) {
    problemStates[problemId] = { ...getState(problemId), notes }
  }

  /** The first time a problem's accepted solution is pasted in: saves the
   *  code, moves it to 'solved', and schedules rep 1 for today (the
   *  re-typing protocol's Rep 1 happens "immediately after, same
   *  sitting"). Re-saving a solution that's already past not-started
   *  (already has reps, or was solved before) only updates the code —
   *  it must never silently reset an in-progress schedule. */
  function saveSolution(problemId: number, solutionCode: string) {
    const existing = getState(problemId)
    if (existing.status !== 'not-started') {
      problemStates[problemId] = { ...existing, solutionCode }
      return
    }
    problemStates[problemId] = {
      ...existing,
      solutionCode,
      status: 'solved',
      nextDueDate: computeNextDueDate([], todayISO()),
    }
  }

  /** Logs one rep attempt and lets the scheduler decide what happens
   *  next — this is the only place `addRep` and the scheduler meet.
   *  Components (Phase 7's trainer) never compute a due date themselves. */
  function addRep(problemId: number, rep: RepLog) {
    const existing = getState(problemId)
    const reps = [...existing.reps, rep]
    const graduated = isGraduated(reps)
    problemStates[problemId] = {
      ...existing,
      reps,
      status: graduated ? 'graduated' : 'in-progress',
      nextDueDate: computeNextDueDate(reps, todayISO()),
    }
  }

  /** Low-level escape hatch for corrections (e.g. a future manual-edit UI)
   *  — everyday flows should go through saveSolution/addRep above, which
   *  keep status and nextDueDate consistent with the actual rep history. */
  function setStatus(problemId: number, status: ProblemStatus) {
    problemStates[problemId] = { ...getState(problemId), status }
  }

  /** Wipes every problem's progress. Callers are responsible for
   *  confirming with the user first — this has no undo but Export. */
  function resetAll() {
    for (const key of Object.keys(problemStates)) {
      delete problemStates[Number(key)]
    }
  }

  /** Used by Import: replaces the entire map atomically rather than
   *  merging, so a restored backup can't be polluted by whatever was
   *  already here. */
  function replaceAll(next: ProblemStatesMap) {
    resetAll()
    Object.assign(problemStates, next)
  }

  return {
    problemStates,
    storageWarning,
    dueQueue,
    allReps,
    overallColdReproductionRate,
    getState,
    updateNotes,
    saveSolution,
    addRep,
    setStatus,
    resetAll,
    replaceAll,
  }
})
