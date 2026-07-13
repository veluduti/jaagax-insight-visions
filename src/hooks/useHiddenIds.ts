import { useCallback, useEffect, useState } from "react";

/**
 * Per-user, per-scope hidden-item registry backed by localStorage.
 * Used to soft-delete cards from a user's own dashboard view without
 * removing the underlying data from the database.
 */
export function useHiddenIds(scope: string, userId?: string | null) {
  const key = `jaagax_hidden::${scope}::${userId || "anon"}`;
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setHidden(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setHidden(new Set());
    }
  }, [key]);

  const persist = (next: Set<string>) => {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(next)));
    } catch {
      /* ignore quota errors */
    }
  };

  const hide = useCallback(
    (id: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [key],
  );

  const unhide = useCallback(
    (id: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(id);
        persist(next);
        return next;
      });
    },
    [key],
  );

  const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);

  return { hidden, hide, unhide, isHidden };
}
