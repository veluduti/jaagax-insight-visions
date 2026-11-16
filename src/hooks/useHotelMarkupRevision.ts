import { useEffect, useState } from "react";
import { loadPublicMarkupRates } from "@/services/hospitality/markupService";

/** Refresh pricing on admin edits, tab focus and cross-session changes. */
export function useHotelMarkupRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let previous: string | undefined;
    let stopped = false;
    const check = async () => {
      try {
        const rates = await loadPublicMarkupRates();
        const signature = JSON.stringify(Object.entries(rates).sort(([a], [b]) => a.localeCompare(b)));
        if (!stopped && previous !== undefined && signature !== previous) setRevision(r => r + 1);
        previous = signature;
      } catch { /* Quotes fail closed; retry on the next refresh. */ }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30000);
    window.addEventListener("focus", check);
    window.addEventListener("hotel-markup-changed", check);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener("focus", check); window.removeEventListener("hotel-markup-changed", check); };
  }, []);
  return revision;
}