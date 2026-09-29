// The Sunday "Cold audit" ritual from the weekly protocol (protocols.ts):
// pick a handful of graduated problems at random and retype them, so
// material that's left the rep queue for good doesn't quietly get
// forgotten. Pure + generic over the item shape (mirrors
// suggestNextProblem.ts) so it's testable without a real Problem or store,
// and `random` is injectable so the sample is deterministic in tests.
export function pickColdAuditSample<T extends { id: number }>(
  problems: readonly T[],
  graduatedIds: ReadonlySet<number>,
  count: number,
  random: () => number = Math.random,
): T[] {
  const pool = problems.filter((p) => graduatedIds.has(p.id))
  const sample: T[] = []
  while (sample.length < count && pool.length > 0) {
    const i = Math.floor(random() * pool.length)
    sample.push(pool[i])
    pool.splice(i, 1)
  }
  return sample
}
