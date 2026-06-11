import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import type { NormalizedLocation } from "@/lib/googleMaps";

interface PlacesAutocompleteInputProps {
  /** Current display value (typically the city, locality, or formatted address). */
  value: string;
  /** Called on every keystroke so parents can mirror the text. */
  onChange?: (text: string) => void;
  /**
   * Called when the user picks a suggestion. Receives the fully normalized
   * location (placeId, formattedAddress, lat/lng, country/state/city/locality).
   */
  onSelect: (location: NormalizedLocation) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Restrict to one or more ISO country codes (e.g. "IN"). */
  country?: string | string[];
  /** Optional disabled flag. */
  disabled?: boolean;
}

export default function PlacesAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search city, locality, or address…",
  id,
  className,
  country = "IN",
  disabled,
}: PlacesAutocompleteInputProps) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { suggestions, loading, selectPlace } = usePlacesAutocomplete(text, { country });

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setHighlight(0), [suggestions.length]);

  const handleSelect = async (placeId: string, fallbackText: string) => {
    try {
      setSelecting(true);
      setOpen(false);
      const loc = await selectPlace(placeId);
      const displayText = loc.city || loc.locality || fallbackText;
      setText(displayText);
      onChange?.(displayText);
      onSelect(loc);
    } catch (err) {
      console.warn("[PlacesAutocompleteInput] selectPlace failed", err);
    } finally {
      setSelecting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      e.preventDefault();
      return;
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
      if (pick) handleSelect(pick.placeId, pick.fullText);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={text}
          disabled={disabled || selecting}
          onChange={(e) => {
            setText(e.target.value);
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {(loading || selecting) && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && !selecting && text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              onChange?.("");
              setOpen(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || loading) && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-72 overflow-y-auto"
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
                handleSelect(s.placeId, s.fullText);
              }}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer flex items-start gap-2 transition-colors",
                i === highlight ? "bg-primary/10 text-foreground" : "text-foreground/90 hover:bg-muted/50",
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="font-medium block truncate">{s.mainText || s.fullText}</span>
                {s.secondaryText && (
                  <span className="text-xs text-muted-foreground block truncate">{s.secondaryText}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only">Powered by Google</p>
    </div>
  );
}
