import { describe, it, expect } from 'vitest'
import { buildExportBundle, exportBundleSchema, isExportBundle, exportFileName, DEFAULT_USERNAME } from './exportImport'
import type { ProblemStatesMap } from '../stores/progressTypes'

const sampleProblemStates: ProblemStatesMap = {
  7: {
    problemId: 7,
    status: 'graduated',
    reps: [
      {
        problemId: 7,
        repNumber: 3,
        date: '2026-08-20T10:00:00.000Z',
        result: 'clean',
        seconds: 612,
        stuckLine: null,
        usedReference: false,
        methodSignature: 'MoveZeroes(nums)',
      },
      {
        problemId: 7,
        repNumber: 2,
        date: '2026-08-13T10:00:00.000Z',
        result: 'assisted',
        seconds: 900,
        stuckLine: 'while (fast != null && fast.next != null)',
        usedReference: true,
        methodSignature: null,
      },
    ],
    nextDueDate: null,
    solutionCode: 'public void MoveZeroes(int[] nums) { /* ... */ }',
    notes: 'Kept writing to nums[i] instead of nums[write].',
  },
  13: {
    problemId: 13,
    status: 'in-progress',
    reps: [],
    nextDueDate: '2026-09-01',
    solutionCode: '',
    notes: '',
  },
}

describe('buildExportBundle / isExportBundle round trip', () => {
  it('produces a bundle that passes its own validator', () => {
    const bundle = buildExportBundle('dark', 'Ada Lovelace', sampleProblemStates)
    expect(isExportBundle(bundle)).toBe(true)
  })

  it('is lossless through a real JSON.stringify/parse cycle (the actual export/import path)', () => {
    const bundle = buildExportBundle('light', 'Ada Lovelace', sampleProblemStates)
    const roundTripped = JSON.parse(JSON.stringify(bundle))

    expect(isExportBundle(roundTripped)).toBe(true)
    expect(roundTripped).toEqual(bundle)
    expect(roundTripped.problemStates).toEqual(sampleProblemStates)
  })

  it('is lossless even with an empty problem-states map', () => {
    const bundle = buildExportBundle('dark', 'Ada Lovelace', {})
    const roundTripped = JSON.parse(JSON.stringify(bundle))
    expect(isExportBundle(roundTripped)).toBe(true)
    expect(roundTripped.problemStates).toEqual({})
  })

  it('rejects a bundle with the wrong version', () => {
    const bundle = buildExportBundle('dark', 'Ada Lovelace', sampleProblemStates)
    expect(isExportBundle({ ...bundle, version: 2 })).toBe(false)
  })

  it('rejects a bundle with a corrupted problemStates entry', () => {
    const bundle = buildExportBundle('dark', 'Ada Lovelace', sampleProblemStates)
    const corrupted = { ...bundle, problemStates: { 7: { ...sampleProblemStates[7], status: 'nonsense' } } }
    expect(isExportBundle(corrupted)).toBe(false)
  })

  it('rejects something that is not an object at all', () => {
    expect(isExportBundle(null)).toBe(false)
    expect(isExportBundle('not a bundle')).toBe(false)
    expect(isExportBundle(42)).toBe(false)
  })

  it('defaults username to a placeholder when importing a backup made before that field existed', () => {
    const bundle = buildExportBundle('dark', 'Ada Lovelace', sampleProblemStates)
    const { username, ...olderBundle } = bundle
    void username

    const result = exportBundleSchema.safeParse(olderBundle)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.username).toBe(DEFAULT_USERNAME)
  })
})

describe('exportFileName', () => {
  it('formats as grindwell-backup-YYYY-MM-DD.json', () => {
    expect(exportFileName(new Date('2026-08-30T12:00:00.000Z'))).toBe('grindwell-backup-2026-08-30.json')
  })
})
