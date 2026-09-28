import { describe, it, expect } from 'vitest'
import {
  diffChars,
  normalizeWhitespace,
  computeDiff,
  firstDivergentLine,
  extractSignature,
  formatSignature,
  normalizeIdentifiers,
} from './diff'

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

describe('extractSignature', () => {
  it('pulls the method name and param names out of a typical LeetCode-shaped solution', () => {
    const code = [
      'public class Solution {',
      '    public int[] TwoSum(int[] nums, int target) {',
      '        return null;',
      '    }',
      '}',
    ].join('\n')
    expect(extractSignature(code)).toEqual({ name: 'TwoSum', params: ['nums', 'target'] })
  })

  it('does not need a modifier keyword to find the method', () => {
    const code = 'int[] TwoSum(int[] nums, int target) {\n}'
    expect(extractSignature(code)).toEqual({ name: 'TwoSum', params: ['nums', 'target'] })
  })

  it('is not fooled by control-flow keywords that look like a call', () => {
    const code = ['public int[] TwoSum(int[] nums, int target) {', '    if (nums.Length == 0) return null;', '}'].join('\n')
    expect(extractSignature(code)).toEqual({ name: 'TwoSum', params: ['nums', 'target'] })
  })

  it('returns null when nothing method-shaped is found', () => {
    expect(extractSignature('if (x) { return 1; }')).toBeNull()
  })

  it('is not fooled by a constructor call on its own line', () => {
    const code = ['public class Solution {', '    var s = new Solution();', '}'].join('\n')
    expect(extractSignature(code)).toBeNull()
  })

  // Regression test for a ReDoS in the old signature regex: a run of
  // whitespace with no method in it could be split between two adjacent
  // quantifiers in exponentially many ways, so the engine spent seconds
  // backtracking through all of them before giving up. This is reachable
  // with attacker-controlled data — a crafted `solutionCode` imported via
  // a backup file becomes the reference code diffed on every keystroke.
  it('stays fast on a long whitespace-only line (ReDoS regression)', () => {
    const start = performance.now()
    expect(extractSignature(' '.repeat(50_000) + 'x')).toBeNull()
    expect(performance.now() - start).toBeLessThan(200)
  })

  it('handles generic/array param types, keeping only the param name', () => {
    const code = 'public IList<IList<int>> Combine(List<int> candidates, int target) {\n}'
    expect(extractSignature(code)).toEqual({ name: 'Combine', params: ['candidates', 'target'] })
  })
})

describe('formatSignature', () => {
  it('formats a signature as Name(param, param)', () => {
    expect(formatSignature({ name: 'TwoSum', params: ['nums', 'target'] })).toBe('TwoSum(nums, target)')
  })

  it('returns null when there is no signature', () => {
    expect(formatSignature(null)).toBeNull()
  })
})

describe('normalizeIdentifiers', () => {
  it('replaces the method name and each param name with a positional placeholder', () => {
    const code = 'int[] TwoSum(int[] nums, int target) {\n  return nums.Length + target;\n}'
    const signature = { name: 'TwoSum', params: ['nums', 'target'] }
    expect(normalizeIdentifiers(code, signature)).toBe(
      'int[] §M§(int[] §P0§, int §P1§) {\n  return §P0§.Length + §P1§;\n}',
    )
  })

  it('only replaces whole-word matches, not substrings inside other identifiers', () => {
    const code = 'int n = nums.Length;'
    const signature = { name: 'f', params: ['n'] }
    expect(normalizeIdentifiers(code, signature)).toBe('int §P0§ = nums.Length;')
  })

  it('returns the code unchanged when there is no signature', () => {
    expect(normalizeIdentifiers('int x = 1;', null)).toBe('int x = 1;')
  })
})

describe('computeDiff with ignoreNames', () => {
  it('scores a renamed method/params as a full match', () => {
    const reference = 'public int[] TwoSum(int[] nums, int target) {\n    return null;\n}'
    const typed = 'public int[] TwoSum(int[] nums1, int nums2) {\n    return null;\n}'
    const result = computeDiff(reference, typed, { ignoreWhitespace: true, ignoreNames: true })
    expect(result.similarity).toBe(1)
  })

  it('still penalizes a real logic difference even with names ignored', () => {
    const reference = 'public int[] TwoSum(int[] nums, int target) {\n    return null;\n}'
    const typed = 'public int[] TwoSum(int[] arr, int goal) {\n    return new int[0];\n}'
    const result = computeDiff(reference, typed, { ignoreWhitespace: true, ignoreNames: true })
    expect(result.similarity).toBeLessThan(1)
  })

  it('without ignoreNames, a rename alone is scored as a real difference', () => {
    const reference = 'public int[] TwoSum(int[] nums, int target) {\n    return null;\n}'
    const typed = 'public int[] TwoSum(int[] nums1, int nums2) {\n    return null;\n}'
    const result = computeDiff(reference, typed, { ignoreWhitespace: true, ignoreNames: false })
    expect(result.similarity).toBeLessThan(1)
  })

  it('the visible diff segments still show the real (non-placeholder) text even with ignoreNames on', () => {
    const reference = 'TwoSum(nums)'
    const typed = 'TwoSum(nums1)'
    const result = computeDiff(reference, typed, { ignoreWhitespace: true, ignoreNames: true })
    const rendered = result.segments.map((s) => s.text).join('')
    expect(rendered.includes('§')).toBe(false)
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
