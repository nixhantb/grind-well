// The domain store: everything the user does — rep results, saved
// solutions, notes — lives here, keyed by problem id. Phase 5's scheduler
// (pure functions, no Vue) gets wired in here: this is the one place a
// rep result turns into "what's the next due date, did this graduate" —
// components never call the scheduler directly, they call store actions.
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import { readFromStorage, readFromIndexedDB, writeToIndexedDB, debounce, type StorageWarning } from '../lib/storage'
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

// Rep history is the one thing in this app with real room to grow — years
// of history across 149 problems — so it lives in IndexedDB (much larger
// quota than localStorage, and fully async: never blocks the UI thread on
// read/write) rather than alongside the small single-value stores
// (theme, username), which have no reason to move off localStorage.
const STORAGE_KEY = 'fluency:progress:v1'
const MIGRATED_FLAG_KEY = 'fluency:progress:migratedFromLocalStorage:v1'

export const useProgressStore = defineStore('progress', () => {
  const problemStates = reactive<ProblemStatesMap>({})
  const storageWarning = ref<StorageWarning | null>(null)
  const isLoaded = ref(false)

  const saveProgress = debounce(() => writeToIndexedDB(STORAGE_KEY, { ...problemStates }), 500)

  // One-time migration so upgrading from the old localStorage-backed
  // version doesn't wipe anyone's history: if IndexedDB has never been
  // touched before, copy over whatever's in the old localStorage key
  // first. The flag (not just "IndexedDB is empty") is what makes this
  // run exactly once — otherwise a legitimate Reset later would look
  // identical to "never migrated" and silently resurrect the old backup.
  const ready = (async () => {
    const idbResult = await readFromIndexedDB(STORAGE_KEY, problemStatesMapSchema, {})
    let { value, warning } = idbResult

    const alreadyMigrated = (await readFromIndexedDB(MIGRATED_FLAG_KEY, z.boolean(), false)).value
    if (!alreadyMigrated) {
      const legacy = readFromStorage(STORAGE_KEY, problemStatesMapSchema, {})
      if (Object.keys(legacy.value).length > 0 && Object.keys(value).length === 0 && warning === null) {
        value = legacy.value
        warning = legacy.warning
        await writeToIndexedDB(STORAGE_KEY, value)
      }
      await writeToIndexedDB(MIGRATED_FLAG_KEY, true)
    }

    Object.assign(problemStates, value)
    storageWarning.value = warning
    isLoaded.value = true

    // Watching a `reactive` object directly is implicitly deep — unlike a
    // `ref`, where you'd need `{ deep: true }` to notice a nested mutation.
    // Only starts once loaded, so the initial Object.assign above never
    // triggers a write of data right back at itself.
    watch(problemStates, () => saveProgress())
  })()

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
    ready,
    isLoaded,
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
