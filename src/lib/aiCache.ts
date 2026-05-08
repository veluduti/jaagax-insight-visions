/**
 * Phase 9 — Non-blocking AI layer.
 *
 * Centralized cache + in-flight dedup for AI/edge-function calls so that:
 *  - Repeated calls (same fn + same body) within TTL return instantly
 *  - Concurrent callers share one network round-trip
 *  - Results survive route changes via sessionStorage
 *  - Pages NEVER await AI on the critical render path — callers always
 *    treat the promise as background work and show skeletons meanwhile.
 */

type CacheEntry<T = unknown> = { value: T; expires: number };

const TTL_MS = 10 * 60 * 1000; // 10 min
const STORAGE_PREFIX = "ai-cache:";

const memCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const stableStringify = (v: unknown): string => {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`)
    .join(",")}}`;
};

const cacheKey = (fn: string, body: unknown) => `${fn}::${stableStringify(body ?? null)}`;

const readSession = <T>(key: string): CacheEntry<T> | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.expires || parsed.expires < Date.now()) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeSession = <T>(key: string, entry: CacheEntry<T>) => {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota — ignore */
  }
};

export interface CachedInvokeOptions {
  /** Override TTL in ms. Default 10 minutes. */
  ttl?: number;
  /** Skip cache and force a fresh call (still populates cache on success). */
  force?: boolean;
  /** Disable persistent (sessionStorage) caching — memory only. */
  memoryOnly?: boolean;
}

/**
 * Cached + de-duplicated invoker. Wraps an async producer.
 * Pages should call this from useEffect; never on the synchronous render path.
 */
export async function cachedInvoke<T>(
  fn: string,
  body: unknown,
  producer: () => Promise<T>,
  opts: CachedInvokeOptions = {},
): Promise<T> {
  const { ttl = TTL_MS, force = false, memoryOnly = false } = opts;
  const key = cacheKey(fn, body);
  const now = Date.now();

  if (!force) {
    const mem = memCache.get(key);
    if (mem && mem.expires > now) return mem.value as T;
    if (!memoryOnly) {
      const stored = readSession<T>(key);
      if (stored) {
        memCache.set(key, stored as CacheEntry);
        return stored.value;
      }
    }
    const flying = inflight.get(key);
    if (flying) return flying as Promise<T>;
  }

  const p = (async () => {
    try {
      const value = await producer();
      const entry: CacheEntry<T> = { value, expires: Date.now() + ttl };
      memCache.set(key, entry as CacheEntry);
      if (!memoryOnly) writeSession(key, entry);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function clearAICache(prefix?: string) {
  if (!prefix) {
    memCache.clear();
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
    return;
  }
  for (const key of memCache.keys()) {
    if (key.startsWith(prefix)) memCache.delete(key);
  }
}

/**
 * Defer a callback to the browser idle phase so AI work never blocks
 * the initial paint. Falls back to setTimeout in environments without
 * requestIdleCallback (Safari).
 */
export function runWhenIdle(cb: () => void, timeout = 1500) {
  const ric = (globalThis as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (typeof ric === "function") return ric(cb, { timeout });
  return setTimeout(cb, 1) as unknown as number;
}
