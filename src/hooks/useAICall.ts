import { useEffect, useRef, useState } from "react";
import { runWhenIdle } from "@/lib/aiCache";

export interface UseAICallState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Phase 9 — Non-blocking AI hook.
 *
 * Runs an AI/edge-function producer on the browser idle phase so it never
 * blocks initial paint. Components render immediately; callers show
 * skeletons while `loading` is true.
 *
 * The producer itself should typically be `aiService.xxx(body)` so that the
 * cache layer in `lib/aiCache.ts` handles dedup + sessionStorage reuse.
 */
export function useAICall<T>(
  producer: (() => Promise<T>) | null | undefined,
  deps: ReadonlyArray<unknown>,
): UseAICallState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(!!producer);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!producer) {
      setLoading(false);
      return () => {
        cancelled.current = true;
      };
    }
    setLoading(true);
    setError(null);

    const handle = runWhenIdle(async () => {
      try {
        const value = await producer();
        if (!cancelled.current) setData(value);
      } catch (err: any) {
        if (!cancelled.current) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    });

    return () => {
      cancelled.current = true;
      try {
        const cic = (globalThis as any).cancelIdleCallback;
        if (typeof cic === "function") cic(handle);
        else clearTimeout(handle as any);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
