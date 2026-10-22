import { HOSPITALITY_CATEGORIES, STAY_PREFERENCES, AMENITY_CHIPS } from "@/config/hospitalityCategories";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { MapPin, SlidersHorizontal, Star, Compass } from "lucide-react";
import type { StayFilters } from "./StayFinder";

type FilterProps = { value: StayFilters; onChange: (value: StayFilters) => void };

export function StayCategoryTabs({ value, onChange }: FilterProps) {
  return <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border pb-3" aria-label="Accommodation types">
    <Button size="sm" variant={!value.types.length ? "default" : "ghost"} className="shrink-0" onClick={() => onChange({ ...value, types: [] })}>All stays</Button>
    {HOSPITALITY_CATEGORIES.filter(c => c.key !== "other").map(c => <Button key={c.key} size="sm" variant={value.types.includes(c.key) ? "default" : "ghost"} className="shrink-0 gap-2" aria-pressed={value.types.includes(c.key)} onClick={() => onChange({ ...value, types: value.types.includes(c.key) ? [] : [c.key] })}><span aria-hidden>{c.emoji}</span>{c.label}</Button>)}
  </div>;
}

export function StayIntentStrip({ value, onChange }: FilterProps) {
  return <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-accent/60 p-3 sm:flex-row sm:items-center">
    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold"><Compass className="h-5 w-5 text-primary" />Search by your intent</div>
    <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
      {STAY_PREFERENCES.map(p => <Button key={p.key} size="sm" variant={value.prefs.includes(p.key) ? "default" : "outline"} className="h-8 shrink-0 rounded-full text-xs" aria-pressed={value.prefs.includes(p.key)} onClick={() => onChange({ ...value, prefs: value.prefs.includes(p.key) ? value.prefs.filter(k => k !== p.key) : [...value.prefs, p.key] })}>{p.label}</Button>)}
    </div>
  </div>;
}

export function HotelDiscoveryFilters({ value, onChange, stars, onStarsChange, areas, selectedArea, onAreaChange, onClear }: FilterProps & {
  stars: number[]; onStarsChange: (stars: number[]) => void;
  areas: { name: string; count: number }[]; selectedArea: string | null;
  onAreaChange: (area: string | null) => void; onClear: () => void;
}) {
  const toggle = (key: "types" | "amenities", item: string) => onChange({ ...value, [key]: value[key].includes(item) ? value[key].filter(k => k !== item) : [...value[key], item] });
  return <aside className="hidden self-start rounded-lg border border-border bg-card p-4 text-card-foreground lg:block" aria-label="Hotel filters">
    <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="h-4 w-4" />Filters</h2><Button size="sm" variant="ghost" className="h-auto p-0 text-xs text-primary" onClick={onClear}>Clear all</Button></div>
    <div className="space-y-5">
      <div><h3 className="mb-2 flex items-center gap-2 text-xs font-semibold"><MapPin className="h-3.5 w-3.5" />City / Area</h3><select aria-label="Filter by area" className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={selectedArea || ""} onChange={e => onAreaChange(e.target.value || null)}><option value="">All areas</option>{areas.map(a => <option key={a.name} value={a.name}>{a.name}{a.count ? ` (${a.count})` : ""}</option>)}</select></div>
      <div><h3 className="mb-3 text-xs font-semibold">Price range (per night)</h3><Slider aria-label="Maximum nightly budget" min={500} max={20000} step={500} value={[value.maxPrice ?? 20000]} onValueChange={([price]) => onChange({ ...value, maxPrice: price >= 20000 ? null : price })} /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>₹500</span><span>{value.maxPrice ? `₹${value.maxPrice.toLocaleString("en-IN")}` : "Any budget"}</span></div></div>
      <div><h3 className="mb-2 text-xs font-semibold">Star rating</h3><div className="space-y-2">{[5, 4, 3, 2, 1].map(s => <label key={s} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={stars.includes(s)} onCheckedChange={() => onStarsChange(stars.includes(s) ? stars.filter(x => x !== s) : [...stars, s])} /><span className="flex gap-0.5">{Array.from({ length: s }, (_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}</span><span>{s} Star</span></label>)}</div></div>
      <div><h3 className="mb-2 text-xs font-semibold">Property type</h3><div className="space-y-2">{HOSPITALITY_CATEGORIES.filter(c => c.key !== "other").map(c => <label key={c.key} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={value.types.includes(c.key)} onCheckedChange={() => toggle("types", c.key)} /><span aria-hidden>{c.emoji}</span>{c.label}</label>)}</div></div>
      <div><h3 className="mb-2 text-xs font-semibold">Amenities</h3><div className="grid grid-cols-2 gap-2">{AMENITY_CHIPS.map(a => <label key={a.key} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={value.amenities.includes(a.key)} onCheckedChange={() => toggle("amenities", a.key)} />{a.label}</label>)}</div></div>
    </div>
  </aside>;
}