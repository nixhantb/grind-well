import { describe, it, expect } from 'vitest'
import { diffChars, normalizeWhitespace, computeDiff, firstDivergentLine } from './diff'

describe('diffChars', () => {
  it('returns a single equal segment for identical strings', () => {
    expect(diffChars('abc', 'abc')).toEqual([{ type: 'equal', text: 'abc' }])
  })

  it('detects a pure insertion', () => {
    expect(diffChars('ac', 'abc')).toEqual([
      { type: 'equal', text: 'a' },
      { type: 'insert', text: 'b' },
      { type: 'equal', text: 'c' },
    ])
  })

  it('detects a pure deletion', () => {
    expect(diffChars('abc', 'ac')).toEqual([
      { type: 'equal', text: 'a' },
      { type: 'delete', text: 'b' },
      { type: 'equal', text: 'c' },
    ])
  })

  it('detects a substitution as a delete+insert pair', () => {
    expect(diffChars('cat', 'cot')).toEqual([
      { type: 'equal', text: 'c' },
      { type: 'delete', text: 'a' },
      { type: 'insert', text: 'o' },
      { type: 'equal', text: 't' },
    ])
  })

  it('handles a completely empty reference (everything typed is an insert)', () => {
    expect(diffChars('', 'abc')).toEqual([{ type: 'insert', text: 'abc' }])
  })

  it('handles completely empty typed text (everything is missing)', () => {
    expect(diffChars('abc', '')).toEqual([{ type: 'delete', text: 'abc' }])
  })

  it('handles two empty strings', () => {
    expect(diffChars('', '')).toEqual([])
  })

  it('every character from both inputs is accounted for exactly once', () => {
    const reference = 'for (int i = 0; i < n; i++)'
    const typed = 'for (int i = 0; i <= n; i++)' // off-by-one bug: <= instead of <
    const segments = diffChars(reference, typed)
    const refReconstructed = segments
      .filter((s) => s.type === 'equal' || s.type === 'delete')
      .map((s) => s.text)
      .join('')
    const typedReconstructed = segments
      .filter((s) => s.type === 'equal' || s.type === 'insert')
      .map((s) => s.text)
      .join('')
    expect(refReconstructed).toBe(reference)
    expect(typedReconstructed).toBe(typed)
  })
})

describe('normalizeWhitespace', () => {
  it('collapses runs of spaces/tabs to one space', () => {
    expect(normalizeWhitespace('int   x  =\t1;')).toBe('int x = 1;')
  })

  it('trims leading and trailing whitespace per line', () => {
    expect(normalizeWhitespace('    return x;   ')).toBe('return x;')
  })

  it('preserves line breaks — only intra-line whitespace is collapsed', () => {
    expect(normalizeWhitespace('a\n\nb')).toBe('a\n\nb')
  })
})

describe('computeDiff', () => {
  it('is 100% similar for identical text', () => {
    const result = computeDiff('int x = 1;', 'int x = 1;', { ignoreWhitespace: false })
    expect(result.similarity).toBe(1)
  })

  it('ignores pure indentation differences by default', () => {
    const reference = 'if (x) {\n    return 1;\n}'
    const typed = 'if (x) {\n  return 1;\n}' // 2 spaces instead of 4
    const result = computeDiff(reference, typed, { ignoreWhitespace: true })
    expect(result.similarity).toBe(1)
  })

  it('counts indentation differences when whitespace-sensitivity is on', () => {
    const reference = 'if (x) {\n    return 1;\n}'
    const typed = 'if (x) {\n  return 1;\n}'
    const result = computeDiff(reference, typed, { ignoreWhitespace: false })
    expect(result.similarity).toBeLessThan(1)
  })

  it('is 0% similar for completely disjoint text against a non-empty reference', () => {
    const result = computeDiff('abc', 'xyz', { ignoreWhitespace: false })
    expect(result.similarity).toBe(0)
  })

  it('is 100% similar for two empty strings, not NaN', () => {
    const result = computeDiff('', '', { ignoreWhitespace: false })
    expect(result.similarity).toBe(1)
  })

  it('is 0% similar for an empty reference matched against non-empty typed text', () => {
    const result = computeDiff('', 'abc', { ignoreWhitespace: false })
    expect(result.similarity).toBe(0)
  })
})

describe('firstDivergentLine', () => {
  it('finds the first line that actually differs', () => {
    const reference = 'int a = 0;\nint b = 1;\nint c = 2;'
    const typed = 'int a = 0;\nint b = 999;\nint c = 2;'
    expect(firstDivergentLine(reference, typed)).toBe('int b = 1;')
  })

  it('returns null when every reference line is matched', () => {
    const reference = 'int a = 0;\nint b = 1;'
    const typed = 'int a = 0;\nint b = 1;'
    expect(firstDivergentLine(reference, typed)).toBeNull()
  })

  it('flags the first line never reached at all as the divergence — useful, not a bug: that IS where they stalled', () => {
    const reference = 'int a = 0;\nint b = 1;'
    const typed = 'int a = 0;'
    expect(firstDivergentLine(reference, typed)).toBe('int b = 1;')
  })

  it('ignores indentation differences by default', () => {
    const reference = 'if (x) {\n    return 1;\n}'
    const typed = 'if (x) {\n  return 1;\n}'
    expect(firstDivergentLine(reference, typed)).toBeNull()
  })

  it('returns the ORIGINAL (non-normalized) line text even when whitespace-insensitive', () => {
    const reference = 'if (x) {\n    return 1;\n}'
    const typed = 'if (x) {\n  return 2;\n}' // actually wrong content this time
    expect(firstDivergentLine(reference, typed)).toBe('    return 1;') // original indentation preserved
  })
})
