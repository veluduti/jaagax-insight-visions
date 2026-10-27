import * as React from "react";
import { MapPin, Search, X } from "lucide-react";
import { canonicalizeCity } from "@/lib/cityNormalizer";
import { findCities, findLocalities, type CityNode } from "@/lib/locationAutocomplete";

type Option =
  | { kind: "all"; label: string }
  | { kind: "city"; label: string; city: string; count: number }
  | { kind: "area"; label: string; city: string; area: string; count: number };

export default function CityAreaSearch({ index, selectedCity, selectedArea, onPick, onClear }: {
  index: Map<string, CityNode>;
  selectedCity: string;
  selectedArea: string | null;
  onPick: (city: string, area: string | null) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectedNode = selectedCity !== "all" ? index.get(canonicalizeCity(selectedCity)) : undefined;
  const currentLabel = selectedArea ? `${selectedArea}, ${selectedNode?.name || selectedCity}` : selectedNode?.name || "All areas";

  const options = React.useMemo<Option[]>(() => {
    const q = query.trim();
    if (!q) {
      const head: Option[] = [{ kind: "all", label: "All areas" }];
      if (selectedNode) {
        selectedNode.localities.slice(0, 12).forEach(l => head.push({ kind: "area", label: l.name, city: selectedNode.name, area: l.name, count: l.count }));
      } else {
        Array.from(index.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10)
          .forEach(c => head.push({ kind: "city", label: c.name, city: c.name, count: c.count }));
      }
      return head;
    }
    const out: Option[] = findCities(index, q, 4).map(m => ({ kind: "city" as const, label: m.city.name, city: m.city.name, count: m.city.count }));
    findLocalities(index, q, 8).forEach(({ city, locality }) => out.push({ kind: "area", label: locality.name, city: city.name, area: locality.name, count: locality.count }));
    return out;
  }, [query, index, selectedNode]);

  React.useEffect(() => { setActive(0); }, [query]);

  const choose = (option: Option) => {
    setOpen(false); setQuery("");
    if (option.kind === "all") onClear();
    else if (option.kind === "city") onPick(option.city, null);
    else onPick(option.city, option.area);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) setOpen(true); else setActive(a => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open && options[active]) choose(options[active]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };

  const hasSelection = selectedCity !== "all" || !!selectedArea;
  let lastKind = "";

  return <div ref={wrapRef} className="relative">
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        role="combobox"
        aria-expanded={open}
        aria-label="Search city or area"
        autoComplete="off"
        value={query}
        placeholder={currentLabel}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-md border border-input bg-background pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
      />
      {hasSelection && <button type="button" aria-label="Clear city and area" onClick={() => { setOpen(false); setQuery(""); onClear(); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3 w-3" /></button>}
    </div>
    {open && <div role="listbox" className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-border bg-card shadow-xl">
      {options.length === 0 ? <p className="px-3 py-3 text-xs text-muted-foreground">No city or area matches “{query}”. Try another name.</p> : options.map((o, i) => {
        const header = o.kind !== lastKind && query.trim() ? (o.kind === "city" ? "Cities" : "Areas") : null;
        lastKind = o.kind;
        return <React.Fragment key={`${o.kind}-${o.label}-${i}`}>
          {header && <p className="border-b border-border/50 bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{header}</p>}
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(o)}
            className={`flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left last:border-b-0 hover:bg-muted/40 ${i === active ? "bg-accent" : ""}`}
          >
            <MapPin className="h-3 w-3 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">{o.label}</span>
              {o.kind === "area" && o.city !== selectedNode?.name && <span className="block truncate text-[10px] text-muted-foreground">{o.city}</span>}
            </span>
            {o.kind !== "all" && o.count > 0 && <span className="shrink-0 text-[10px] text-primary">{o.count}</span>}
          </button>
        </React.Fragment>;
      })}
    </div>}
  </div>;
}
