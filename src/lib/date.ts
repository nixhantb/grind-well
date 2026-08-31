/** Today as a plain YYYY-MM-DD string — the one place in the app that
 *  actually calls `new Date()` for "now" outside a test. Everything in
 *  scheduler.ts takes "today" as a parameter instead, specifically so it
 *  never needs this. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
