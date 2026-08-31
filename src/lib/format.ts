/** Formats a whole number of seconds as `m:ss` (e.g. 65 -> "1:05"). Used
 *  by the trainer's running timer now, and the rep-history table later. */
export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
