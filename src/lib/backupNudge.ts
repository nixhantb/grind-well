// Pure logic for "should we nag about backing up" — no Vue, no Pinia, no
// `new Date()` reading the live clock; every function takes its inputs as
// parameters, same testability rule as scheduler.ts. Export/Import (Data
// page) is the ONLY backup this app has — no server, no account — so
// going quiet for too long is worth surfacing before a cleared cache
// takes weeks of rep history with it.

const NUDGE_AFTER_DAYS = 14

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO).getTime()
  const to = new Date(toISO).getTime()
  return Math.floor((to - from) / (1000 * 60 * 60 * 24))
}

export type BackupNudgeKind = 'never' | 'stale'

/**
 * `problemCount` gates the whole thing — nobody needs nagging about
 * backing up zero progress. `lastExportedAt`/`nowISO` are full ISO
 * timestamps (not just YYYY-MM-DD days), so exporting a few hours ago
 * doesn't immediately look stale again.
 */
export function backupNudgeKind(problemCount: number, lastExportedAt: string | null, nowISO: string): BackupNudgeKind | null {
  if (problemCount === 0) return null
  if (lastExportedAt === null) return 'never'
  return daysBetween(lastExportedAt, nowISO) >= NUDGE_AFTER_DAYS ? 'stale' : null
}

/** Whole days since the last export — only meaningful once `backupNudgeKind`
 *  has already confirmed `lastExportedAt` isn't null. */
export function daysSinceExport(lastExportedAt: string, nowISO: string): number {
  return daysBetween(lastExportedAt, nowISO)
}
