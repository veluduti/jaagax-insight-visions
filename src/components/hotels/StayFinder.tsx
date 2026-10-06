import { useState } from "react";
import { Sparkles, Loader2, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  HOSPITALITY_CATEGORIES, STAY_PREFERENCES, AMENITY_CHIPS, CATEGORY_BY_KEY,
} from "@/config/hospitalityCategories";

export interface StayFilters {
  types: string[];
  prefs: string[];
  amenities: string[];
  maxPrice: number | null;
}

export interface AiIntent {
  location: string | null;
  business_types: string[];
  preferences: string[];
  amenities: string[];
  adults: number | null;
  children: number | null;
  rooms: number | null;
  nights: number | null;
  check_in: string | null;
  max_price: number | null;
  min_price: number | null;
  accommodation_kinds?: string[];
  optional_amenities?: string[];
}

interface Props {
  value: StayFilters;
  onChange: (f: StayFilters) => void;
  onAiIntent: (intent: AiIntent) => void;
}

const MAX = 20000;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60"
      }`}
    >
      {children}
    </button>
  );
}

export default function StayFinder({ value, onChange, onAiIntent }: Props) {
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const toggle = (k: keyof Pick<StayFilters, "types" | "prefs" | "amenities">, v: string) => {
    const list = value[k];
    onChange({ ...value, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };

  const runAi = async () => {
    const q = aiText.trim();
    if (q.length < 3) return toast.error("Describe your stay in a few words.");
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotel-ai-intent", {
        body: { query: q, today: new Date().toISOString().slice(0, 10) },
      });
      if (error) {
        let msg = "AI search failed. Please use the filters instead.";
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* keep default */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      onAiIntent(data.intent as AiIntent);
      setOpen(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const activeCount = value.types.length + value.prefs.length + value.amenities.length + (value.maxPrice ? 1 : 0);

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4">
      {/* AI intent search */}
      <form
        onSubmit={(e) => { e.preventDefault(); runAi(); }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder='Describe your stay — e.g. "Pool villa in Delhi for 4 people, preferably with breakfast"'
            className="h-11 pl-9"
            maxLength={500}
          />
        </div>
        <Button type="submit" disabled={aiBusy} className="h-11 gap-2">
          {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI Search
        </Button>
        <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setOpen((o) => !o)}>
          <SlidersHorizontal className="h-4 w-4" />
          Stay filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </form>

      {/* Step 2: kind of stay (always visible, compact) */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">What kind of stay?</p>
        <div className="flex flex-wrap gap-1.5">
          {HOSPITALITY_CATEGORIES.filter((c) => c.key !== "other").map((c) => (
            <Chip key={c.key} on={value.types.includes(c.key)} onClick={() => toggle("types", c.key)}>
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Step 3: what are you looking for */}
      {open && (
        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">What are you looking for?</p>
            <div className="flex flex-wrap gap-1.5">
              {STAY_PREFERENCES.map((p) => (
                <Chip key={p.key} on={value.prefs.includes(p.key)} onClick={() => toggle("prefs", p.key)}>{p.label}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_CHIPS.map((a) => (
                <Chip key={a.key} on={value.amenities.includes(a.key)} onClick={() => toggle("amenities", a.key)}>{a.label}</Chip>
              ))}
            </div>
          </div>
          <div className="max-w-md">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Budget per night: {value.maxPrice ? `up to ₹${value.maxPrice.toLocaleString("en-IN")}` : "any"}
            </p>
            <Slider
              value={[value.maxPrice ?? MAX]}
              min={500}
              max={MAX}
              step={500}
              onValueChange={([v]) => onChange({ ...value, maxPrice: v >= MAX ? null : v })}
            />
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
          {value.types.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {CATEGORY_BY_KEY[t]?.label ?? t}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggle("types", t)} />
            </span>
          ))}
          {value.prefs.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
              {STAY_PREFERENCES.find((p) => p.key === t)?.label ?? t}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggle("prefs", t)} />
            </span>
          ))}
          {value.amenities.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
              {AMENITY_CHIPS.find((p) => p.key === t)?.label ?? t}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggle("amenities", t)} />
            </span>
          ))}
          {value.maxPrice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
              ≤ ₹{value.maxPrice.toLocaleString("en-IN")}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onChange({ ...value, maxPrice: null })} />
            </span>
          )}
          <button
            type="button"
            className="ml-auto text-xs font-medium text-muted-foreground underline"
            onClick={() => onChange({ types: [], prefs: [], amenities: [], maxPrice: null })}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
