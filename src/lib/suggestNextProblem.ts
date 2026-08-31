// Picks "today's suggested new problem" for the dashboard: the first
// problem, in curriculum order, that hasn't been touched yet. Generic
// over the shape of both arguments so it's testable without importing
// the real Problem type or a real Pinia store.
export function suggestNextProblem<T extends { id: number }>(
  problems: readonly T[],
  touchedIds: ReadonlySet<number>,
): T | null {
  return problems.find((p) => !touchedIds.has(p.id)) ?? null
}
