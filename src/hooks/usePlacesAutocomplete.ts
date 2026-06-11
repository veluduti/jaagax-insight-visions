import { useEffect, useMemo, useRef, useState } from "react";
import {
  createSessionToken,
  fetchAutocompleteSuggestions,
  fetchPlaceDetails,
} from "@/lib/googleMaps";
import type { AutocompleteSuggestionItem, NormalizedLocation } from "@/lib/googleMaps";

interface Options {
  /** Debounce in ms (default 220). */
  debounceMs?: number;
  /** Restrict suggestions to one or more ISO country codes. */
  country?: string | string[];
}

export function usePlacesAutocomplete(input: string, options: Options = {}) {
  const { debounceMs = 220, country } = options;
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const reqIdRef = useRef(0);

  // Lazily create the session token on first use (needs google.maps loaded).
  const ensureSession = async () => {
    if (sessionTokenRef.current) return sessionTokenRef.current;
    // Lazy-load Maps JS so the session-token class exists.
    const { loadGoogleMaps } = await import("@/lib/googleMaps/loader");
    await loadGoogleMaps();
    sessionTokenRef.current = createSessionToken();
    return sessionTokenRef.current;
  };

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const token = await ensureSession();
        const items = await fetchAutocompleteSuggestions(trimmed, token, { country });
        if (myId === reqIdRef.current) setSuggestions(items);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [input, debounceMs, JSON.stringify(country)]);

  const selectPlace = async (placeId: string): Promise<NormalizedLocation> => {
    const token = sessionTokenRef.current;
    const details = await fetchPlaceDetails(placeId, token);
    // Session is consumed by Place Details — start a fresh one.
    sessionTokenRef.current = null;
    return details;
  };

  return useMemo(
    () => ({ suggestions, loading, selectPlace }),
    [suggestions, loading],
  );
}
