import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search } from "lucide-react";

interface Suggestion { placeId: string; text: string }
interface Props {
  bias?: { latitude?: number | null; longitude?: number | null };
  onPick: (place: { latitude: number; longitude: number; address: string; placeId: string }) => void | Promise<void>;
}

// Google Maps place search (through the backend) for typing a city, area or address.
const PlaceSearchBox = ({ bias, onPick }: Props) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const token = useRef(crypto.randomUUID());
  const seq = useRef(0);

  useEffect(() => {
    const input = query.trim();
    if (input.length < 2) { setItems([]); return; }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error: err } = await supabase.functions.invoke("property-location-search", {
        body: { action: "suggest", input, sessionToken: token.current, latitude: bias?.latitude ?? undefined, longitude: bias?.longitude ?? undefined },
      });
      if (id !== seq.current) return;
      setLoading(false);
      if (err || data?.error) { setError("Place search is unavailable. Use the map or the lists below."); setItems([]); return; }
      setError("");
      setItems(data?.suggestions ?? []);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query, bias?.latitude, bias?.longitude]);

  const pick = async (s: Suggestion) => {
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
      <label htmlFor="property-place-search" className="text-sm font-medium text-foreground">Search city, area or address</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="property-place-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="e.g. Kukatpally, Hyderabad"
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
      </div>
      {open && items.length > 0 && (
        <ul role="listbox" className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {items.map((s) => (
            <li key={s.placeId}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{s.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default PlaceSearchBox;
