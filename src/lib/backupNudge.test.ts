import { describe, it, expect } from 'vitest'
import { backupNudgeKind, daysSinceExport } from './backupNudge'

describe('backupNudgeKind', () => {
  it('is null with zero tracked problems, regardless of export history', () => {
    expect(backupNudgeKind(0, null, '2026-01-15T00:00:00.000Z')).toBeNull()
  })

  it('is "never" once there is progress and no export has happened', () => {
    expect(backupNudgeKind(3, null, '2026-01-15T00:00:00.000Z')).toBe('never')
  })

  it('is null right after an export', () => {
    expect(backupNudgeKind(3, '2026-01-15T00:00:00.000Z', '2026-01-15T01:00:00.000Z')).toBeNull()
  })

  it('is null just under the threshold (13 days)', () => {
    expect(backupNudgeKind(3, '2026-01-01T00:00:00.000Z', '2026-01-14T00:00:00.000Z')).toBeNull()
  })

  it('is "stale" at exactly the threshold (14 days)', () => {
    expect(backupNudgeKind(3, '2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z')).toBe('stale')
  })

  it('is "stale" well past the threshold', () => {
    expect(backupNudgeKind(3, '2025-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z')).toBe('stale')
  })
})

describe('daysSinceExport', () => {
  it('floors partial days', () => {
    expect(daysSinceExport('2026-01-01T12:00:00.000Z', '2026-01-03T11:00:00.000Z')).toBe(1)
  })

  it('is 0 for the same day', () => {
    expect(daysSinceExport('2026-01-01T00:00:00.000Z', '2026-01-01T23:00:00.000Z')).toBe(0)
  })
})
