import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import type { NormalizedLocation } from "@/lib/googleMaps";
import { cn } from "@/lib/utils";

interface Props {
  /** Initial display text (e.g. saved city). */
  initialValue?: string;
  placeholder?: string;
  className?: string;
  /** Visual variant. 'pill' = transparent input for white pill bar. 'box' = bordered. */
  variant?: "pill" | "box";
  /** Country restriction (default IN). */
  country?: string | string[];
  /** Persist selection to global saved location (default true). */
  persistSavedLocation?: boolean;
  /** Called when the user picks a place. */
  onSelected?: (loc: NormalizedLocation) => void;
  /** Called on every text change. */
  onTextChange?: (text: string) => void;
  /** Called when Enter pressed without a selection (use current text). */
  onEnterRaw?: (text: string) => void;
  inputId?: string;
}

/**
 * A compact Google Places autocomplete that can be dropped into any hero /
 * filter / search bar. By default it saves the chosen city into the global
 * LocationContext so the rest of the app (Search, Hotels, Projects) filters
 * accordingly.
 */
export default function InlineLocationSearch({
  initialValue = "",
  placeholder = "Search city, locality or address…",
  className,
  variant = "pill",
  country = "IN",
  persistSavedLocation = true,
  onSelected,
  onTextChange,
  onEnterRaw,
  inputId,
}: Props) {
  const { selectLocation } = useLocationContext();
  const [text, setText] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { suggestions, loading, selectPlace } = usePlacesAutocomplete(text, { country });

  useEffect(() => setText(initialValue), [initialValue]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setHighlight(0), [suggestions.length]);

  const handlePick = async (placeId: string, fallbackText: string) => {
    try {
      setSelecting(true);
      setOpen(false);
      const loc = await selectPlace(placeId);
      const displayText = loc.city || loc.locality || fallbackText;
      setText(displayText);
      onTextChange?.(displayText);
      if (persistSavedLocation) {
        await selectLocation({
          city: loc.city || loc.locality || fallbackText,
          area: loc.locality && loc.locality !== loc.city ? loc.locality : "",
          latitude: loc.latitude ?? null,
          longitude: loc.longitude ?? null,
        });
      }
      onSelected?.(loc);
    } catch (err) {
      console.warn("[InlineLocationSearch] select failed", err);
    } finally {
      setSelecting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      if (e.key === "ArrowDown") {
        setOpen(true);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        // No open list: if we have a suggestion, pick first; else raw enter.
        if (suggestions[0]) {
          e.preventDefault();
          handlePick(suggestions[0].placeId, suggestions[0].fullText);
        } else {
          onEnterRaw?.(text);
        }
        return;
      }
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[highlight];
      if (pick) handlePick(pick.placeId, pick.fullText);
      else onEnterRaw?.(text);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const isPill = variant === "pill";

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-2",
          isPill
            ? "px-3 py-1.5"
            : "px-3 py-2.5 rounded-lg bg-background border border-border/50 focus-within:border-primary/50 transition-colors",
        )}
      >
        <MapPin className={cn("h-4 w-4 flex-shrink-0", isPill ? "text-gray-400" : "text-primary")} />
        <input
          id={inputId}
          type="text"
          value={text}
          disabled={selecting}
          onChange={(e) => {
            setText(e.target.value);
            onTextChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "flex-1 min-w-0 border-0 outline-none bg-transparent text-sm",
            isPill ? "text-gray-700 placeholder:text-gray-400 py-1.5" : "text-foreground placeholder:text-muted-foreground",
          )}
        />
        {(loading || selecting) && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && !selecting && text && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setText("");
              onTextChange?.("");
              setOpen(true);
            }}
            className="h-5 w-5 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || loading) && (
        <ul
          role="listbox"
          className="absolute z-[80] left-0 right-0 mt-1.5 rounded-lg border border-border bg-popover shadow-xl overflow-hidden max-h-72 overflow-y-auto"
        >
          {loading && suggestions.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(s.placeId, s.fullText);
              }}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer flex items-start gap-2 transition-colors",
                i === highlight
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground/90 hover:bg-muted/50",
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="font-medium block truncate">{s.mainText || s.fullText}</span>
                {s.secondaryText && (
                  <span className="text-xs text-muted-foreground block truncate">
                    {s.secondaryText}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
