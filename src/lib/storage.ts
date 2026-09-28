// The one module every piece of persisted state goes through — "behind
// one storage module so it can be swapped later" per spec. The swap point
// is the KeyValueStore interface: anything with getItem/setItem satisfies
// it (window.localStorage does, so does a plain in-memory Map in tests),
// so moving to a different backend later means writing one new adapter,
// not touching every store.
//
// Framework-free: no Vue import here. Pinia stores call into this; this
// file has no idea Pinia or Vue exist.

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | null {
  // Guarded because this file can be imported in contexts with no DOM
  // (a plain vitest run, a future SSR build) — localStorage simply isn't
  // there, and every function below has to degrade gracefully rather
  // than throw.
  return typeof window !== 'undefined' ? window.localStorage : null
}

/** A machine-readable description of what went wrong, not a message —
 *  this file is deliberately framework-free (no Vue, no i18n import), so
 *  it can't build the user-facing sentence itself. The caller (App.vue)
 *  turns `reason` + `key` into real text via `t('storage.<reason>', { key })`. */
export interface StorageWarning {
  reason: 'corrupted' | 'invalid-shape'
  key: string
}

export interface ReadResult<T> {
  value: T
  /** Non-null only when the stored data existed but was unusable — the
   *  caller is expected to surface this somewhere the user can see it. */
  warning: StorageWarning | null
}

/** Anything shaped like a Zod schema — duck-typed so this file doesn't
 *  need to import Zod itself, just like it doesn't import Pinia or Vue. */
export interface Schema<T> {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false }
}

/**
 * Reads and JSON-parses `key`, then runs `schema` against the parsed
 * result. A missing key, invalid JSON, or a value that fails validation
 * all resolve the same way: fall back to `fallback`, and (for the latter
 * two — never for a merely-missing key, that's just "first visit") return
 * a warning explaining what happened. This is the one place "never let a
 * corrupt blob brick the app" is enforced — and, since the value used is
 * the schema's own PARSED output rather than the raw JSON, any unexpected
 * key (say, a `__proto__` planted in an imported file) is stripped here
 * rather than surviving into a later `Object.assign`.
 */
export function readFromStorage<T>(
  key: string,
  schema: Schema<T>,
  fallback: T,
  store: KeyValueStore | null = defaultStore(),
): ReadResult<T> {
  if (!store) return { value: fallback, warning: null }

  const raw = store.getItem(key)
  if (raw == null) return { value: fallback, warning: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { value: fallback, warning: { reason: 'corrupted', key } }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    return { value: fallback, warning: { reason: 'invalid-shape', key } }
  }

  return { value: result.data, warning: null }
}

/** Serializes and writes `value`. Never throws — localStorage can (quota
 *  exceeded, private-browsing restrictions in some browsers), and a
 *  failed save should degrade to "your last change wasn't persisted",
 *  never to a crashed app. */
export function writeToStorage(key: string, value: unknown, store: KeyValueStore | null = defaultStore()): void {
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Failed to save "${key}" to storage`, err)
  }
}

/**
 * Delays calling `fn` until `delayMs` has passed with no further calls —
 * "every write is debounced" means every store routes its writes through
 * one of these rather than calling writeToStorage directly on every
 * keystroke/mutation.
 */
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delayMs)
  }
}
