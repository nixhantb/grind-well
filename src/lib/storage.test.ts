import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFromStorage, writeToStorage, debounce, type KeyValueStore } from './storage'

// A minimal in-memory stand-in for window.localStorage — this is the
// whole point of KeyValueStore being an interface: no jsdom, no real
// browser, just a Map behind two methods.
function fakeStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

interface Widget {
  name: string
  count: number
}
function isWidget(v: unknown): v is Widget {
  if (typeof v !== 'object' || v === null) return false
  const w = v as Record<string, unknown>
  return typeof w.name === 'string' && typeof w.count === 'number'
}

describe('readFromStorage', () => {
  it('returns the fallback with no warning when the key is missing', () => {
    const store = fakeStore()
    const result = readFromStorage('widget', isWidget, { name: 'default', count: 0 }, store)
    expect(result).toEqual({ value: { name: 'default', count: 0 }, warning: null })
  })

  it('returns the parsed value when it matches the shape', () => {
    const store = fakeStore({ widget: JSON.stringify({ name: 'saved', count: 3 }) })
    const result = readFromStorage('widget', isWidget, { name: 'default', count: 0 }, store)
    expect(result).toEqual({ value: { name: 'saved', count: 3 }, warning: null })
  })

  it('falls back and warns on corrupted (unparseable) JSON', () => {
    const store = fakeStore({ widget: '{not json' })
    const result = readFromStorage('widget', isWidget, { name: 'default', count: 0 }, store)
    expect(result.value).toEqual({ name: 'default', count: 0 })
    expect(result.warning).toEqual({ reason: 'corrupted', key: 'widget' })
  })

  it('falls back and warns when the parsed value fails the type guard', () => {
    const store = fakeStore({ widget: JSON.stringify({ name: 'saved' }) }) // missing `count`
    const result = readFromStorage('widget', isWidget, { name: 'default', count: 0 }, store)
    expect(result.value).toEqual({ name: 'default', count: 0 })
    expect(result.warning).toEqual({ reason: 'invalid-shape', key: 'widget' })
  })

  it('degrades to the fallback with no store at all (e.g. no window)', () => {
    const result = readFromStorage('widget', isWidget, { name: 'default', count: 0 }, null)
    expect(result).toEqual({ value: { name: 'default', count: 0 }, warning: null })
  })
})

describe('writeToStorage', () => {
  it('round-trips a value through the same store', () => {
    const store = fakeStore()
    writeToStorage('widget', { name: 'saved', count: 3 }, store)
    const result = readFromStorage('widget', isWidget, { name: 'default', count: 0 }, store)
    expect(result).toEqual({ value: { name: 'saved', count: 3 }, warning: null })
  })

  it('does not throw when the store itself throws (e.g. quota exceeded)', () => {
    const angryStore: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => writeToStorage('widget', { name: 'x', count: 1 }, angryStore)).not.toThrow()
  })

  it('is a no-op with no store at all', () => {
    expect(() => writeToStorage('widget', { name: 'x', count: 1 }, null)).not.toThrow()
  })
})

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('only calls the underlying function once after the delay, with the last args', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced('first')
    vi.advanceTimersByTime(200)
    debounced('second')
    vi.advanceTimersByTime(200)
    debounced('third')
    expect(fn).not.toHaveBeenCalled() // still within the debounce window

    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('third')
  })

  it('fires again for a call that arrives after the previous debounce settled', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced('first')
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('second')
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('second')
  })
})
