// The shapes every screen reads from. Nothing Vue-specific lives here —
// this is the "domain model", same idea as a set of POCOs in a C# project,
// kept separate from anything that renders them.

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface Problem {
  id: number // 1..149, our curriculum ordering (not the LeetCode id)
  leetcodeId: number
  title: string
  slug: string // LeetCode URL slug — stored, not computed at render time
  url: string
  difficulty: Difficulty
  patternId: string // foreign key into Pattern.id
  subSkill: string // "the one implementation sub-skill it drills"
  expectedLoc: number
  targetMinutes: number
  isWarmUp: boolean
  isMasterCopy: boolean
  repOf: number | null // Problem.id this one repeats, or null
}

export interface Pattern {
  id: string
  order: number // 1..24, curriculum order
  name: string
  oneLiner: string
  triggerSignals: string[]
  template: string // canonical C# skeleton, verbatim from the source doc
  mechanics: string[]
}

/** One rung of "Section 4 — What To Do At 20 Minutes", parsed from the
 *  same source doc as everything else. `description` keeps the source's
 *  inline markdown (**bold**, `code`) — render it through
 *  renderInlineMarkdown, same as Pattern.mechanics. */
export interface LadderStep {
  minute: number
  title: string
  description: string
}

// ---- Protocols content (src/content/protocols.ts) ----
// Hand-authored rather than parsed, unlike everything above — see the
// comment at the top of protocols.ts for why.

export interface RepScheduleRow {
  rep: string
  when: string
  notesAllowed: string
  doneWhen: string
}

/** One step of an interactive checklist (the Blank Page Ritual, the
 *  Pseudocode Bridge). `code`/`codeLang` are only present on steps that
 *  embed a snippet — 'csharp' gets real syntax highlighting via
 *  CodeBlock.vue, 'plain' is pseudocode/notation rendered as plain
 *  monospace text (running it through the C# highlighter would be
 *  actively wrong, not just unstyled). */
export interface ChecklistStep {
  id: string
  label: string
  body: string
  code?: string
  codeLang?: 'csharp' | 'plain'
  /** Prose that continues after the code snippet, within the same step —
   *  several steps in the source doc read "intro sentence, then a fence,
   *  then one more sentence." */
  afterCode?: string
}

export interface Checklist {
  intro: string
  steps: ChecklistStep[]
  closingNote: string
}

export interface WeeklyScheduleRow {
  time: string
  block: string
  detail?: string
}

export interface CheatSheetRow {
  operation: string
  line: string
}
