import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search } from "lucide-react";

interface Suggestion { placeId: string; text: string }
interface Props {
  label?: string;
  value?: string;
  context?: string;
  bias?: { latitude?: number | null; longitude?: number | null };
  onPick: (place: { latitude: number; longitude: number; address: string; placeId: string }) => void | Promise<void>;
}

// Google Maps place search (through the backend) for typing a city, area or address.
const PlaceSearchBox = ({ bias, onPick, label = "Search city, area or address", value = "", context = "" }: Props) => {
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(-1);
  const searching = useRef(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const token = useRef(crypto.randomUUID());
  const seq = useRef(0);

  useEffect(() => { setQuery(value); searching.current = false; setOpen(false); }, [value]);

  useEffect(() => {
    const input = query.trim();
    const id = ++seq.current;
    if (!searching.current || input.length < 2) { setItems([]); setLoading(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error: err } = await supabase.functions.invoke("property-location-search", {
        body: { action: "suggest", input: [input, context].filter(Boolean).join(", ").slice(0, 120), sessionToken: token.current, latitude: bias?.latitude ?? undefined, longitude: bias?.longitude ?? undefined },
      });
      if (id !== seq.current) return;
      setLoading(false);
      if (err || data?.error) { setError("Place search is unavailable. Use the map or the lists below."); setItems([]); return; }
      setError("");
      setItems(data?.suggestions ?? []);
      setActive(-1);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query, context, bias?.latitude, bias?.longitude]);

  const pick = async (s: Suggestion) => {
    seq.current++;
    searching.current = false;
    setOpen(false);
    setQuery(s.text);
    setLoading(true);
    const { data, error: err } = await supabase.functions.invoke("property-location-search", {
      body: { action: "details", placeId: s.placeId, sessionToken: token.current },
    });
    token.current = crypto.randomUUID();
    setLoading(false);
    if (err || data?.error) { setError("Couldn't open that place. Try another one."); return; }
    await onPick(data);
  };

  return (
    <div className="relative space-y-1">
      <label htmlFor="property-place-search" className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="property-place-search"
          value={query}
          onChange={(e) => { searching.current = true; setQuery(e.target.value); setError(""); }}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls="property-city-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `property-city-option-${active}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (!open || !items.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((index) => (index + 1) % items.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((index) => (index - 1 + items.length) % items.length); }
            if (e.key === "Enter" && active >= 0 && items[active]) { e.preventDefault(); void pick(items[active]); }
          }}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={label === "City" ? "Select city — type to search" : "e.g. Kukatpally, Hyderabad"}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
      </div>
      {open && items.length > 0 && (
        <ul id="property-city-suggestions" role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {items.map((s, index) => (
            <li key={s.placeId} id={`property-city-option-${index}`} role="option" aria-selected={active === index}>
              <Button variant="ghost" type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                className={`flex h-auto w-full justify-start items-start gap-2 whitespace-normal px-3 py-2 text-left text-sm text-popover-foreground ${active === index ? "bg-accent" : ""}`}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{s.text}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 2 && !items.length && !error && <p className="text-xs text-muted-foreground">No matching places. Try another city or area.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default PlaceSearchBox;
