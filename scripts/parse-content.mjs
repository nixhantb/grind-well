// One-off generator: parses content-source/dsa-csharp-implementation-fluency.md
// into src/content/content.generated.ts.
//
// Run with: node scripts/parse-content.mjs
//
// This script is not part of the app build — it's a development-time tool.
// Re-run it whenever the source markdown changes.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_MD = resolve(__dirname, '../content-source/dsa-csharp-implementation-fluency.md')
const OUT_TS = resolve(__dirname, '../src/content/content.generated.ts')

const md = readFileSync(SRC_MD, 'utf8')

// Trigger-signal lines mix a comma list of quoted phrases with connective
// unquoted prose ('"first unique". Any time your brute force is "for each
// element, scan the rest".'), and some patterns are entirely unquoted prose
// ('the input is a `ListNode`. That's it.'). A plain comma-split breaks
// wherever a quoted phrase happens to contain its own comma, so instead:
// walk the string alternating between quoted spans (each becomes one signal,
// whole) and the unquoted gaps between them (comma-split those, protecting
// [bracket, groups], and drop bare connector words).
const CONNECTOR_ONLY = new Set(['and', 'or', 'any time your brute force is', 'basically:', 'the words', 'the word'])

function splitUnquotedGap(text, items) {
  const pieces = []
  let current = ''
  let bracketDepth = 0
  for (const ch of text) {
    if (ch === '[') bracketDepth++
    if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1)
    if (ch === ',' && bracketDepth === 0) {
      pieces.push(current)
      current = ''
      continue
    }
    current += ch
  }
  pieces.push(current)
  for (const piece of pieces) {
    const cleaned = piece.replace(/^[\s.]+|[\s.]+$/g, '')
    if (cleaned && !CONNECTOR_ONLY.has(cleaned.toLowerCase())) items.push(cleaned)
  }
}

function parseTriggerSignals(raw) {
  const items = []
  const quotedSpanRe = /"([^"]+)"/g
  let lastIndex = 0
  let m
  while ((m = quotedSpanRe.exec(raw))) {
    splitUnquotedGap(raw.slice(lastIndex, m.index), items)
    items.push(m[1].trim())
    lastIndex = quotedSpanRe.lastIndex
  }
  splitUnquotedGap(raw.slice(lastIndex), items)
  return items
}

// The source doc's own prose style leans on em dashes; the app's copy
// doesn't want them (they read as an AI-writing tell). This runs on the
// EXTRACTED field values, never on the raw markdown before parsing — the
// pattern-header and ladder regexes below match against a literal em dash
// in the source, so stripping it pre-parse would break extraction itself.
function deAiDash(text) {
  return text.replace(/\s*—\s*/g, ' - ')
}
function deepDeAiDash(value) {
  if (typeof value === 'string') return deAiDash(value)
  if (Array.isArray(value)) return value.map(deepDeAiDash)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepDeAiDash(v)]))
  }
  return value
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// LeetCode blocks automated fetches (confirmed: 403 on every attempt), so
// these 12 could not be live-verified. The source doc shortens these titles
// (e.g. "Two Sum II" instead of "Two Sum II - Input Array Is Sorted"), and a
// naive kebab-case of the shortened title produces a URL that 404s. These
// overrides are the real LeetCode slugs, recalled from memory — correct any
// that are wrong; that's exactly why `slug` is a stored field, not derived
// at render time.
const SLUG_OVERRIDES = {
  3: 'longest-substring-without-repeating-characters',
  19: 'remove-nth-node-from-end-of-list',
  34: 'find-first-and-last-position-of-element-in-sorted-array',
  108: 'convert-sorted-array-to-binary-search-tree',
  167: 'two-sum-ii-input-array-is-sorted',
  208: 'implement-trie-prefix-tree',
  211: 'design-add-and-search-words-data-structure',
  235: 'lowest-common-ancestor-of-a-binary-search-tree',
  387: 'first-unique-character-in-a-string',
  700: 'search-in-a-binary-search-tree',
  701: 'insert-into-a-binary-search-tree',
  1876: 'substrings-of-size-three-with-distinct-characters',
}

// ---------- split the doc into 24 pattern blocks ----------

const patternHeaderRe = /^# PATTERN (\d+)\s*[—-]\s*(.+)$/gm
const headers = [...md.matchAll(patternHeaderRe)]
if (headers.length !== 24) {
  throw new Error(`Expected 24 "# PATTERN" headers, found ${headers.length}`)
}

const protocolStart = md.indexOf('\n# 1. THE RE-TYPING PROTOCOL')
if (protocolStart === -1) {
  throw new Error('Could not find the "# 1. THE RE-TYPING PROTOCOL" marker that ends the last pattern block')
}

const patterns = []
const problems = []

for (let i = 0; i < headers.length; i++) {
  const h = headers[i]
  const order = Number(h[1])
  const name = h[2].trim()
  const start = h.index
  const end = i + 1 < headers.length ? headers[i + 1].index : protocolStart
  const block = md.slice(start, end)
  const id = slugify(name)

  const oneLinerM = block.match(/\*\*In one sentence:\*\*\s*(.+)/)
  if (!oneLinerM) throw new Error(`Pattern ${order} (${name}): missing "In one sentence"`)
  const oneLiner = oneLinerM[1].trim()

  const triggerM = block.match(/\*\*Trigger signals:\*\*\s*(.+)/)
  if (!triggerM) throw new Error(`Pattern ${order} (${name}): missing "Trigger signals"`)
  const triggerSignals = parseTriggerSignals(triggerM[1]).filter(Boolean)

  const templateRegionM = block.match(/### THE TEMPLATE([\s\S]*?)### THE MECHANICS I MUST GET RIGHT/)
  if (!templateRegionM) throw new Error(`Pattern ${order} (${name}): missing THE TEMPLATE section`)
  // Most patterns have one ```csharp fence here; Pattern 2 has two (a second,
  // shorter snippet after some connecting prose). Join every fence found —
  // the template is meant to be typed in full, prose asides aside.
  const codeBlocks = [...templateRegionM[1].matchAll(/```csharp\n([\s\S]*?)```/g)].map((m) =>
    m[1].replace(/\n$/, ''),
  )
  if (codeBlocks.length === 0) throw new Error(`Pattern ${order} (${name}): no csharp code fence found`)
  const template = codeBlocks.join('\n\n')

  const mechanicsRegionM = block.match(/### THE MECHANICS I MUST GET RIGHT([\s\S]*?)\n\|\s*#\s*\|/)
  if (!mechanicsRegionM) throw new Error(`Pattern ${order} (${name}): missing THE MECHANICS section`)
  const mechanics = mechanicsRegionM[1]
    .split('\n')
    .map((line) => line.match(/^\d+\.\s+(.+)$/))
    .filter(Boolean)
    .map((m) => m[1].trim())
  if (mechanics.length < 4 || mechanics.length > 6) {
    throw new Error(`Pattern ${order} (${name}): expected 4-6 mechanics, found ${mechanics.length}`)
  }

  patterns.push({ id, order, name, oneLiner, triggerSignals, template, mechanics })

  // ---------- this pattern's problem-table rows ----------
  const rowRe = /^\|\s*(\d+)\s*\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|\s*$/gm
  for (const row of block.matchAll(rowRe)) {
    const [, idStr, problemCell, diffCell, subSkillCell, locCell, targetCell] = row
    const problemId = Number(idStr)

    const cellM = problemCell.trim().match(/^(.*?)\s*\((\d+)\)\s*(?:\*\*(.+?)\*\*)?\s*$/)
    if (!cellM) throw new Error(`Pattern ${order}, row ${idStr}: unparsable problem cell "${problemCell}"`)
    const [, titleRaw, leetcodeIdStr, flagsBlob] = cellM
    const title = titleRaw.trim()
    const leetcodeId = Number(leetcodeIdStr)

    const flags = flagsBlob ? [...flagsBlob.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]) : []
    const isWarmUp = flags.includes('WARM-UP')
    const isMasterCopy = flags.includes('MASTER COPY')
    const repFlag = flags.find((f) => f.startsWith('REP of '))
    const repOfLeetcodeId = repFlag ? Number(repFlag.replace('REP of ', '')) : null

    const slug = SLUG_OVERRIDES[leetcodeId] ?? slugify(title)

    problems.push({
      id: problemId,
      leetcodeId,
      title,
      slug,
      url: `https://leetcode.com/problems/${slug}/`,
      difficulty: diffCell.trim(),
      patternId: id,
      subSkill: subSkillCell.trim(),
      expectedLoc: Number(locCell.trim()),
      targetMinutes: Number(targetCell.trim().match(/\d+/)[0]),
      isWarmUp,
      isMasterCopy,
      repOfLeetcodeId, // resolved to repOf (our internal id) below, then deleted
    })
  }
}

// ---------- resolve "REP of <leetcodeId>" -> internal problem id ----------

const byLeetcodeId = new Map(problems.map((p) => [p.leetcodeId, p.id]))
for (const p of problems) {
  if (p.repOfLeetcodeId != null) {
    const target = byLeetcodeId.get(p.repOfLeetcodeId)
    if (target == null) {
      throw new Error(`Problem #${p.id} (${p.title}): "REP of ${p.repOfLeetcodeId}" matches no parsed problem`)
    }
    p.repOf = target
  } else {
    p.repOf = null
  }
  delete p.repOfLeetcodeId
}

// ---------- assertions — the whole point of Phase 1 ----------

if (patterns.length !== 24) throw new Error(`Expected 24 patterns, got ${patterns.length}`)
if (problems.length !== 149) throw new Error(`Expected 149 problems, got ${problems.length}`)

const expectedIds = Array.from({ length: 149 }, (_, i) => i + 1)
const actualIds = problems.map((p) => p.id)
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
  throw new Error('Problem ids are not exactly 1..149 in ascending order')
}

const leetcodeIdSet = new Set(problems.map((p) => p.leetcodeId))
if (leetcodeIdSet.size !== 149) throw new Error('Duplicate LeetCode ids detected across problems')

const validDifficulties = new Set(['Easy', 'Medium', 'Hard'])
const counts = { Easy: 0, Medium: 0, Hard: 0 }
for (const p of problems) {
  if (!validDifficulties.has(p.difficulty)) {
    throw new Error(`Problem #${p.id} (${p.title}): invalid difficulty "${p.difficulty}"`)
  }
  counts[p.difficulty]++
}
// The source doc states its own distribution; use it as an independent
// cross-check against transcription errors elsewhere in the parse.
if (counts.Easy !== 81 || counts.Medium !== 62 || counts.Hard !== 6) {
  throw new Error(
    `Difficulty split is ${counts.Easy}/${counts.Medium}/${counts.Hard}, expected 81/62/6 per the source doc`,
  )
}

const validPatternIds = new Set(patterns.map((p) => p.id))
for (const p of problems) {
  if (!validPatternIds.has(p.patternId)) {
    throw new Error(`Problem #${p.id} (${p.title}): unknown patternId "${p.patternId}"`)
  }
}

// ---------- Section 4: the 20-minute ladder (Phase 8 needs this) ----------

const ladderRegionM = md.match(
  /# 4\. WHAT TO DO AT 20 MINUTES[\s\S]*?\n\n([\s\S]*?)\n\n\*\*Never\*\*/,
)
if (!ladderRegionM) throw new Error('Could not find Section 4 (the 20-minute ladder)')

const ladder = [...ladderRegionM[1].matchAll(/\*\*Minute (\d+) — (.+?)\.\*\*\s+(.+)/g)].map((m) => ({
  minute: Number(m[1]),
  title: m[2].trim(),
  description: m[3].trim(),
}))
const expectedMinutes = [20, 24, 28, 33, 40, 45, 55]
if (JSON.stringify(ladder.map((s) => s.minute)) !== JSON.stringify(expectedMinutes)) {
  throw new Error(`Ladder minutes are ${JSON.stringify(ladder.map((s) => s.minute))}, expected ${JSON.stringify(expectedMinutes)}`)
}

// ---------- emit ----------

const banner = `// GENERATED FILE - do not hand-edit.
// Produced by scripts/parse-content.mjs from
// content-source/dsa-csharp-implementation-fluency.md.
// Re-run \`node scripts/parse-content.mjs\` after editing the source doc.
// Every em dash from the source is normalized to a hyphen (see deAiDash
// above) - so this is the source's wording verbatim, minus that one
// punctuation substitution, not a byte-for-byte copy.
`

const out = `${banner}
import type { Pattern, Problem, LadderStep } from './types'

export const PATTERNS: Pattern[] = ${JSON.stringify(deepDeAiDash(patterns), null, 2)}

export const PROBLEMS: Problem[] = ${JSON.stringify(deepDeAiDash(problems), null, 2)}

export const LADDER: LadderStep[] = ${JSON.stringify(deepDeAiDash(ladder), null, 2)}
`

writeFileSync(OUT_TS, out, 'utf8')

console.log(`Parsed ${patterns.length} patterns, ${problems.length} problems, ${ladder.length} ladder steps.`)
console.log(`Difficulty split: Easy ${counts.Easy}, Medium ${counts.Medium}, Hard ${counts.Hard}.`)
console.log(`Wrote ${OUT_TS}`)
