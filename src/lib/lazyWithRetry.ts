import { ComponentType, lazy } from "react";

/**
 * lazyWithRetry — resilient dynamic import.
 *
 * After a new deploy, old tabs hold stale chunk filenames. The next route
 * change throws "Failed to fetch dynamically imported module" / "Loading
 * chunk failed", which React surfaces as a white screen.
 *
 * Strategy:
 *  1. Retry the import twice with backoff (covers transient network blips).
 *  2. If still failing, force a hard reload to fetch a fresh asset manifest.
 *     A short-lived sessionStorage timestamp prevents reload loops but
 *     auto-expires after 10s so a genuinely broken build doesn't trap users.
 */
const RELOAD_FLAG = "__lazy_chunk_reloaded_at__";
const RELOAD_COOLDOWN_MS = 10_000;

function shouldReload(): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_FLAG);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    if (Number.isNaN(last)) return true;
    return Date.now() - last > RELOAD_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markReloaded() {
  try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())); } catch {}
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      // Retry 1 — short delay
      try {
        await new Promise((r) => setTimeout(r, 300));
        return await factory();
      } catch {
        // Retry 2 — longer delay
        try {
          await new Promise((r) => setTimeout(r, 800));
          return await factory();
        } catch (err) {
          if (shouldReload()) {
            markReloaded();
            window.location.reload();
          }
          throw err;
        }
      }
    }
  });
}
