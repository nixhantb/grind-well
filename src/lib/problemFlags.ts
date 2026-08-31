// Turns a Problem's boolean/nullable flags into the pill list the spec
// calls for everywhere a problem row appears. Framework-free — just data
// in, data out — so this returns a `kind` (+ the one piece of data
// `rep-of` needs), not a rendered label: the caller runs that through
// `t('problemFlags.<kind>', { id })` to get real text, since this file
// has no i18n access.
import type { Problem } from '../content/types'

export type ProblemFlagKind = 'warm-up' | 'master-copy' | 'rep-of'

export interface ProblemFlag {
  kind: ProblemFlagKind
  tone: 'accent' | 'neutral'
  repOf?: number
}

export function problemFlags(problem: Problem): ProblemFlag[] {
  const flags: ProblemFlag[] = []
  if (problem.isWarmUp) flags.push({ kind: 'warm-up', tone: 'accent' })
  if (problem.isMasterCopy) flags.push({ kind: 'master-copy', tone: 'accent' })
  if (problem.repOf != null) flags.push({ kind: 'rep-of', tone: 'neutral', repOf: problem.repOf })
  return flags
}
