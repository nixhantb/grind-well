// Character-level diff (via the `diff` package's Myers-algorithm
// implementation) plus the "which line did you stall on" prefill helper
// the trainer's log form needs.

import { diffChars as jsDiffChars } from 'diff'

export type DiffSegmentType = 'equal' | 'insert' | 'delete'

export interface DiffSegment {
  type: DiffSegmentType
  text: string
}

/**
 * `delete` means "in `reference` but not in `typed`" (you're missing
 * this); `insert` means "in `typed` but not in `reference`" (you added
 * something extra).
 */
export function diffChars(reference: string, typed: string): DiffSegment[] {
  return jsDiffChars(reference, typed).map((part) => ({
    type: part.added ? 'insert' : part.removed ? 'delete' : 'equal',
    text: part.value,
  }))
}

/**
 * Collapses runs of horizontal whitespace and trims each line, but keeps
 * line breaks. "I care about the mechanics, not my brace style" means
 * indentation depth and trailing spaces shouldn't count as differences —
 * but which line something landed on still should.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
}

export interface DiffResult {
  segments: DiffSegment[]
  /** Fraction (0–1) of the reference reproduced correctly — equal chars
   *  divided by the reference's length. Deliberately NOT a symmetric
   *  similarity measure: the reference is the thing being reproduced
   *  from memory, so "100 extra characters typed" shouldn't dilute the
   *  score the same way "100 characters missing" should. */
  similarity: number
}

/**
 * A method's name and parameter names, as best-effort-parsed out of a
 * chunk of C#. Good enough for "which identifiers did the user choose to
 * call the method/its params", not a real parser — it looks for the
 * first line shaped like `<modifiers> <returnType> Name(params) {`.
 */
export interface MethodSignature {
  name: string
  params: string[]
}

// Control-flow/declaration keywords that can be followed by `(...)` and
// would otherwise false-positive as "a method named `if`/`for`/etc." —
// this is exactly the shape `extractSignature`'s regex is looking for,
// so anything on this list has to be explicitly rejected.
const NON_METHOD_NAMES = new Set([
  'if',
  'for',
  'foreach',
  'while',
  'switch',
  'catch',
  'using',
  'lock',
  'fixed',
  'return',
  'new',
  'class',
  'struct',
  'interface',
  'namespace',
  'enum',
  'sizeof',
  'typeof',
  'nameof',
])

// Matches a line like `public int[] TwoSum(int[] nums, int target) {`:
// an optional run of modifier keywords, then a return-type token
// (letters/digits/`<>[],.?` — generics, arrays, nullable, no spaces),
// then whitespace, then the name, then a parenthesized param list. `^`
// (no `m` flag) means this only matches when tested against a single
// line, which is how extractSignature uses it below.
//
// Each modifier keyword is paired with its OWN required `\s+` inside the
// repeated group — not left as a standalone `\s` alternative alongside
// the keywords — specifically so a run of whitespace can only ever be
// consumed one way. `(?:keyword|\s)*` looks equivalent but isn't: it
// lets a run of N spaces be split between that group and the adjacent
// `\s*` in exponentially many ways, and on non-matching input (this is
// reference/typed CODE, not necessarily anything of this shape) the
// engine backtracks through all of them — a classic ReDoS. A pasted or
// imported "solution" that's mostly whitespace could freeze the tab for
// seconds on every keystroke, since this runs on every reactive diff.
const SIGNATURE_LINE_RE =
  /^\s*(?:(?:public|private|protected|internal|static|virtual|override|sealed|abstract|async|unsafe|readonly|new)\s+)*[\w<>[\],.?]+[\s*]+(\w+)\s*\(([^)]*)\)/

/**
 * Best-effort extraction of "what did this code call its method and
 * parameters" — deliberately NOT a real parser (no tokenizer, no brace
 * tracking), just a per-line regex looking for the first thing shaped
 * like a method declaration. That's enough for the trainer's purposes:
 * showing the submitted signature in a rep log, and letting the diff
 * treat renamed identifiers as equivalent (see normalizeIdentifiers).
 */
export function extractSignature(code: string): MethodSignature | null {
  for (const line of code.split('\n')) {
    const match = line.match(SIGNATURE_LINE_RE)
    if (!match) continue
    const [, name, paramsRaw] = match
    if (NON_METHOD_NAMES.has(name)) continue

    const params = paramsRaw
      .split(',')
      .map((param) => param.split('=')[0].trim()) // drop default values first
      .filter((param) => param.length > 0)
      .map((param) => {
        // last identifier-looking token in e.g. `int[] nums` is the param name
        const tokens = param.match(/[A-Za-z_]\w*/g)
        return tokens && tokens.length > 0 ? tokens[tokens.length - 1] : null
      })
      .filter((name): name is string => name !== null)

    return { name, params }
  }
  return null
}

/** `TwoSum(nums, target)` — a signature formatted for display. */
export function formatSignature(signature: MethodSignature | null): string | null {
  if (!signature) return null
  return `${signature.name}(${signature.params.join(', ')})`
}

/**
 * Replaces every whole-word occurrence of the signature's method name and
 * parameter names with positional placeholders (`§M§`, `§P0§`, `§P1§`, …).
 * Applied independently to the reference and the typed code (each keeps
 * its own signature), this is what lets `computeDiff`'s `ignoreNames`
 * option treat `TwoSum(int[] nums, int target)` and
 * `TwoSum(int[] arr, int goal)` as identical: whatever the user actually
 * called things, the Nth parameter becomes the same placeholder text in
 * both, so a rename no longer shows up as a run of unrelated character
 * differences cascading through the rest of the diff.
 */
export function normalizeIdentifiers(code: string, signature: MethodSignature | null): string {
  if (!signature) return code
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wordRe = (word: string) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g')

  let result = code.replace(wordRe(signature.name), '§M§')
  signature.params.forEach((param, i) => {
    result = result.replace(wordRe(param), `§P${i}§`)
  })
  return result
}

export function computeDiff(
  reference: string,
  typed: string,
  options: { ignoreWhitespace: boolean; ignoreNames?: boolean },
): DiffResult {
  const a = options.ignoreWhitespace ? normalizeWhitespace(reference) : reference
  const b = options.ignoreWhitespace ? normalizeWhitespace(typed) : typed
  // The segments shown to the user are always based on `a`/`b` above —
  // whitespace-normalized (maybe), but never with placeholders swapped
  // in, so the visible diff still shows the real identifiers. `ignoreNames`
  // only changes what counts as "equal" for the similarity SCORE: a
  // second, separate diff over name-normalized text, used purely to
  // count matching characters.
  const segments = diffChars(a, b)

  if (a.length === 0) return { segments, similarity: b.length === 0 ? 1 : 0 }

  let scoreA = a
  let scoreB = b
  if (options.ignoreNames) {
    scoreA = normalizeIdentifiers(a, extractSignature(reference))
    scoreB = normalizeIdentifiers(b, extractSignature(typed))
  }
  const scoreSegments = scoreA === a && scoreB === b ? segments : diffChars(scoreA, scoreB)
  const equalChars = scoreSegments.filter((s) => s.type === 'equal').reduce((sum, s) => sum + s.text.length, 0)
  return { segments, similarity: equalChars / scoreA.length }
}

/**
 * The first reference line that doesn't match the typed line in the same
 * position — prefills "which line did you stall on?" for free, per spec.
 * Comparison is whitespace-insensitive by default (matching the diff's
 * own default), but the returned text is always the ORIGINAL reference
 * line, not a normalized one — you want to see the real line, just
 * without indentation false-flagging it as the divergence point.
 */
export function firstDivergentLine(reference: string, typed: string, ignoreWhitespace = true): string | null {
  const compareRef = (ignoreWhitespace ? normalizeWhitespace(reference) : reference).split('\n')
  const compareTyped = (ignoreWhitespace ? normalizeWhitespace(typed) : typed).split('\n')
  const rawRefLines = reference.split('\n')

  for (let i = 0; i < compareRef.length; i++) {
    if (compareRef[i] !== compareTyped[i]) return rawRefLines[i]
  }
  return null
}
