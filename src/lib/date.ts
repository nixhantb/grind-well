/** Today as a plain YYYY-MM-DD string — the one place in the app that
 *  actually calls `new Date()` for "now" outside a test. Everything in
 *  scheduler.ts takes "today" as a parameter instead, specifically so it
 *  never needs this. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Parses a `YYYY-MM-DD` string as a LOCAL calendar date (local midnight),
 *  not `new Date(str)`'s UTC-midnight parse. The two only agree for
 *  timezones at/east of UTC — anywhere west of it (all of the Americas),
 *  `new Date('2026-06-15')` reads back as June 14 through local getters
 *  (`getFullYear`/`getMonth`/`getDate`), which is exactly how the
 *  contribution heatmap buckets a rep into a day. Every rep's `date` —
 *  live-logged or restored from an imported backup — must go through this
 *  before reaching anything that reads it with local getters, or it lands
 *  on the wrong square for roughly half the world. */
export function parseLocalDateISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
