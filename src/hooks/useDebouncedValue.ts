import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has stayed unchanged for `delayMs` ms.
 * Use for filter inputs / search boxes to avoid refetching on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
