import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ALL_INDIAN_CITIES, POPULAR_CITIES } from "@/data/indianCities";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  id?: string;
};

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 220;

export default function CityAutocomplete({ value, onChange, placeholder = "Search your city...", id = "city" }: Props) {
  const [input, setInput] = useState(value);
  const [debounced, setDebounced] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value
  useEffect(() => { setInput(value); }, [value]);

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return POPULAR_CITIES.slice(0, MAX_RESULTS);
    // Prefix matches first, then includes
    const prefix: string[] = [];
    const includes: string[] = [];
    for (const city of ALL_INDIAN_CITIES) {
      const lc = city.toLowerCase();
      if (lc.startsWith(q)) prefix.push(city);
      else if (lc.includes(q)) includes.push(city);
      if (prefix.length >= MAX_RESULTS) break;
    }
    return [...prefix, ...includes].slice(0, MAX_RESULTS);
  }, [debounced]);

  useEffect(() => { setHighlight(0); }, [results.length, debounced]);

  const select = (city: string) => {
    onChange(city);
    setInput(city);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlight]) select(results[highlight]);
    } else if (e.key === "Escape") { setOpen(false); }
  };

  // Highlight matching substring inside a label
  const renderLabel = (city: string) => {
    const q = debounced.trim();
    if (!q) return city;
    const idx = city.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return city;
    return (
      <>
        {city.slice(0, idx)}
        <span className="text-primary font-semibold">{city.slice(idx, idx + q.length)}</span>
        {city.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {input && (
          <button
            type="button"
            onClick={() => { setInput(""); onChange(""); setOpen(true); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Clear city"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {!debounced.trim() && (
            <li className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
              <Search className="h-3 w-3" /> Popular cities
            </li>
          )}
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground text-center">No results found</li>
          ) : (
            results.map((city, i) => (
              <li
                key={city}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => { e.preventDefault(); select(city); }}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors",
                  i === highlight ? "bg-primary/10 text-foreground" : "text-foreground/90 hover:bg-muted/50"
                )}
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{renderLabel(city)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
