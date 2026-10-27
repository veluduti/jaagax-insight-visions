import { HOSPITALITY_CATEGORIES, STAY_PREFERENCES, AMENITY_CHIPS } from "@/config/hospitalityCategories";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { MapPin, SlidersHorizontal, Star, Compass } from "lucide-react";
import resortPhoto from "@/assets/explore-stays.jpg";
import hotelPhoto from "@/assets/hero-hotel.jpg";
import apartmentPhoto from "@/assets/gal-living.jpg";
import roomPhoto from "@/assets/gal-bedroom.jpg";
import uniquePhoto from "@/assets/nl-stay.jpg";
import type { StayFilters } from "./StayFinder";

type FilterProps = { value: StayFilters; onChange: (value: StayFilters) => void };

export function StayCategoryTabs({ value, onChange }: FilterProps) {
  const entries = [
    { label: "All Stays", subtitle: "Every kind of getaway", image: roomPhoto, types: [], prefs: [] },
    { label: "Hotels", subtitle: "Rest for short stays", image: hotelPhoto, types: ["hotel"], prefs: [] },
    { label: "Resorts", subtitle: "Vacation & leisure", image: resortPhoto, types: ["resort"], prefs: [] },
    { label: "Service Apartments", subtitle: "For long stays", image: apartmentPhoto, types: ["serviced_apartment"], prefs: [] },
    { label: "PG / Hostels", subtitle: "For students & working", image: roomPhoto, types: ["pg", "hostel"], prefs: [] },
    { label: "Co-living", subtitle: "Community living", image: apartmentPhoto, types: ["coliving"], prefs: [] },
    { label: "Luxury Stays", subtitle: "Premium experiences", image: hotelPhoto, types: [], prefs: ["luxury"] },
    { label: "Corporate Stays", subtitle: "For business travel", image: apartmentPhoto, types: [], prefs: ["business"] },
    { label: "Unique Stays", subtitle: "Villas, farm stays & more", image: uniquePhoto, types: ["villa", "farm_stay", "homestay", "boutique"], prefs: [] },
  ];
  return <div className="stay-image-categories no-scrollbar mb-5 flex gap-2 overflow-x-auto py-1" aria-label="Accommodation types">{entries.map(e => {
    const active = e.types.length ? e.types.length === value.types.length && e.types.every(k => value.types.includes(k)) : e.prefs.length ? e.prefs.every(k => value.prefs.includes(k)) && !value.types.length : !value.types.length && !value.prefs.includes("luxury") && !value.prefs.includes("business");
    return <Button key={e.label} variant="outline" aria-pressed={active} className={`h-[100px] min-w-[125px] flex-1 flex-col items-stretch justify-start gap-0 overflow-hidden rounded-md p-0 text-left ${active ? "border-primary ring-1 ring-primary" : "border-border"}`} onClick={() => onChange({ ...value, types: e.types, prefs: [...value.prefs.filter(k => k !== "luxury" && k !== "business"), ...e.prefs] })}><img src={e.image} alt="" className="h-12 w-full shrink-0 object-cover" loading="lazy" width={200} height={80} /><span className="px-2 pt-2 text-[11px] font-bold">{e.label}</span><span className="truncate px-2 pt-0.5 text-[10px] font-normal text-muted-foreground">{e.subtitle}</span></Button>;
  })}</div>;
}

export function StayIntentStrip({ value, onChange }: FilterProps) {
  return <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-accent/60 p-3 sm:flex-row sm:items-center">
    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold"><Compass className="h-5 w-5 text-primary" />Search by your intent</div>
    <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
      {STAY_PREFERENCES.map(p => <Button key={p.key} size="sm" variant={value.prefs.includes(p.key) ? "default" : "outline"} className="h-8 shrink-0 rounded-full text-xs" aria-pressed={value.prefs.includes(p.key)} onClick={() => onChange({ ...value, prefs: value.prefs.includes(p.key) ? value.prefs.filter(k => k !== p.key) : [...value.prefs, p.key] })}>{p.label}</Button>)}
    </div>
  </div>;
}

export function HotelDiscoveryFilters({ value, onChange, stars, onStarsChange, areas, selectedArea, onAreaChange, onClear, mobile = false }: FilterProps & {
  mobile?: boolean; stars: number[]; onStarsChange: (stars: number[]) => void;
  areas: { name: string; count: number }[]; selectedArea: string | null;
  onAreaChange: (area: string | null) => void; onClear: () => void;
}) {
  const toggle = (key: "types" | "amenities", item: string) => onChange({ ...value, [key]: value[key].includes(item) ? value[key].filter(k => k !== item) : [...value[key], item] });
  return <aside className={`${mobile ? "block mt-5" : "hidden lg:block"} self-start rounded-lg border border-border bg-card p-3 text-card-foreground`} aria-label="Hotel filters">
    <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="h-4 w-4" />Refine Your Stay</h2><Button size="sm" variant="ghost" className="h-auto p-0 text-xs text-primary" onClick={onClear}>Clear all</Button></div>
    <div className="space-y-5">
      <div><h3 className="mb-2 flex items-center gap-2 text-xs font-semibold"><MapPin className="h-3.5 w-3.5" />City / Area</h3><select aria-label="Filter by area" className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={selectedArea || ""} onChange={e => onAreaChange(e.target.value || null)}><option value="">All areas</option>{areas.map(a => <option key={a.name} value={a.name}>{a.name}{a.count ? ` (${a.count})` : ""}</option>)}</select></div>
      <div><h3 className="mb-3 text-xs font-semibold">Price range (per night)</h3><Slider aria-label="Maximum nightly budget" min={500} max={20000} step={500} value={[value.maxPrice ?? 20000]} onValueChange={([price]) => onChange({ ...value, maxPrice: price >= 20000 ? null : price })} /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>₹500</span><span>{value.maxPrice ? `₹${value.maxPrice.toLocaleString("en-IN")}` : "Any budget"}</span></div></div>
      <div><h3 className="mb-2 text-xs font-semibold">Star rating</h3><div className="space-y-2">{[5, 4, 3, 2, 1].map(s => <label key={s} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={stars.includes(s)} onCheckedChange={() => onStarsChange(stars.includes(s) ? stars.filter(x => x !== s) : [...stars, s])} /><span className="flex gap-0.5">{Array.from({ length: s }, (_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}</span><span>{s} Star</span></label>)}</div></div>
      <div><h3 className="mb-2 text-xs font-semibold">Property type</h3><div className="space-y-2">{HOSPITALITY_CATEGORIES.filter(c => c.key !== "other").map(c => <label key={c.key} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={value.types.includes(c.key)} onCheckedChange={() => toggle("types", c.key)} /><span aria-hidden>{c.emoji}</span>{c.label}</label>)}</div></div>
      <div><h3 className="mb-2 text-xs font-semibold">Amenities</h3><div className="grid grid-cols-2 gap-2">{AMENITY_CHIPS.map(a => <label key={a.key} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={value.amenities.includes(a.key)} onCheckedChange={() => toggle("amenities", a.key)} />{a.label}</label>)}</div></div>
    </div>
  </aside>;
}