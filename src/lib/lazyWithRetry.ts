import { ComponentType, lazy } from "react";

/**
 * lazyWithRetry — resilient dynamic import.
 *
 * Why: after a new deploy, old tabs hold stale chunk filenames. The next
 * route change throws "Failed to fetch dynamically imported module" /
 * "Loading chunk failed", which React surfaces as a white screen.
 *
 * Behaviour:
 *  1. Retries the import once after a short delay (handles transient network).
 *  2. If still failing, force a one-time hard reload to pull fresh asset
 *     manifest. A sessionStorage flag prevents reload loops.
 */
const RELOAD_FLAG = "__lazy_chunk_reloaded__";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Successful load: clear reload flag so future failures can reload again.
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch {}
      return mod;
    } catch (err) {
      // One quick retry (covers transient network blips).
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (err2) {
        const reloaded = (() => {
          try { return sessionStorage.getItem(RELOAD_FLAG); } catch { return null; }
        })();
        if (!reloaded) {
          try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch {}
          // Hard reload to fetch new asset manifest. Throws below first so
          // React doesn't try to render before reload kicks in.
          window.location.reload();
        }
        // Re-throw so the nearest error boundary shows a recovery UI
        // (in case reload is blocked or already happened).
        throw err2;
      }
    }
  });
}
