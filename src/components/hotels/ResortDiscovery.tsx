import { Checkbox } from "@/components/ui/checkbox";
import { BadgeCheck, BadgePercent, CalendarCheck, Headphones, Heart, Palmtree, Mountain, Waves, Leaf, Users, Crown, Flower2, LayoutGrid } from "lucide-react";
import { RESORT_TYPES } from "@/lib/resortDiscovery";
import { HOTEL_IMAGE_FALLBACK } from "@/lib/hotelImage";
import allImg from "@/assets/home-hero-resort.jpg";
import beachImg from "@/assets/explore-stays.jpg";
import hillImg from "@/assets/resort-hill.jpg";
import lakeImg from "@/assets/resort-lake.jpg";
import spaImg from "@/assets/resort-spa.jpg";
import ecoImg from "@/assets/resort-eco.jpg";
import familyImg from "@/assets/resort-family.jpg";
import luxuryImg from "@/assets/resort-luxury.jpg";

const TILES = [
  { key: "", label: "All Resorts", icon: LayoutGrid, img: allImg },
  { key: "beach", label: "Beach Resorts", icon: Palmtree, img: beachImg },
  { key: "hill", label: "Hill Resorts", icon: Mountain, img: hillImg },
  { key: "lake", label: "Lake Resorts", icon: Waves, img: lakeImg },
  { key: "spa_wellness", label: "Spa & Wellness Resorts", icon: Flower2, img: spaImg },
  { key: "eco", label: "Eco Resorts", icon: Leaf, img: ecoImg },
  { key: "family", label: "Family Resorts", icon: Users, img: familyImg },
  { key: "luxury", label: "Luxury Resorts", icon: Crown, img: luxuryImg },
];

export function ResortCategoryTiles({ selected, counts, total, onSelect }: { selected: string[]; counts: Record<string, number>; total: number; onSelect: (keys: string[]) => void }) {
  return <div className="no-scrollbar mb-5 grid auto-cols-[140px] grid-flow-col gap-3 overflow-x-auto py-1 lg:grid-flow-row lg:grid-cols-8" aria-label="Resort categories">
    {TILES.map(t => {
      const active = t.key ? selected.length === 1 && selected[0] === t.key : !selected.length;
      const n = t.key ? counts[t.key] || 0 : total;
      const Icon = t.icon;
      return <button key={t.label} type="button" aria-pressed={active} onClick={() => onSelect(t.key ? [t.key] : [])} className={`overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md ${active ? "border-primary ring-2 ring-primary" : "border-border"}`}>
        <span className="relative block h-16"><img src={t.img} alt="" loading="lazy" width={300} height={128} className="h-full w-full object-cover" /><span className="absolute -bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-md bg-card text-primary shadow"><Icon className="h-4 w-4" /></span></span>
        <span className={`block px-3 pb-2 pt-4 text-xs font-semibold ${active ? "text-primary" : ""}`}>{t.label}</span>
        <span className="block px-3 pb-2 -mt-1 text-[10px] text-muted-foreground">{n} {n === 1 ? "stay" : "stays"}</span>
      </button>;
    })}
  </div>;
}

export function ResortTypeFilter({ selected, counts, onChange }: { selected: string[]; counts: Record<string, number>; onChange: (keys: string[]) => void }) {
  return <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
    <h3 className="mb-2 text-xs font-semibold">Resort Type</h3>
    <div className="space-y-2">{RESORT_TYPES.map(t => <label key={t.key} className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox className="!rounded-[3px]" checked={selected.includes(t.key)} onCheckedChange={() => onChange(selected.includes(t.key) ? selected.filter(k => k !== t.key) : [...selected, t.key])} />
      <span>{t.label}</span><span className="text-muted-foreground">({counts[t.key] || 0})</span>
    </label>)}</div>
  </div>;
}

const WHY = [
  { icon: BadgeCheck, title: "Verified Properties", sub: "Trusted listings" },
  { icon: BadgePercent, title: "Best Price", sub: "No hidden charges" },
  { icon: CalendarCheck, title: "Flexible Plans", sub: "Policies shown upfront" },
  { icon: Headphones, title: "24/7 Support", sub: "Always here" },
];
export function WhyBookResorts() {
  return <section className="rounded-lg border border-border bg-card p-3">
    <h3 className="mb-3 text-sm font-bold">Why Book Resorts on JaagaX?</h3>
    <div className="grid grid-cols-2 gap-2">{WHY.map(w => <div key={w.title} className="rounded-md border border-border p-2 text-center"><w.icon className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-[11px] font-semibold">{w.title}</p><p className="text-[10px] text-muted-foreground">{w.sub}</p></div>)}</div>
  </section>;
}

type Recent = { id: string; name: string; price_per_night: number; images: string[] | null };
export function RecentlyViewedResorts({ items, favorites, onOpen, onFavorite }: { items: Recent[]; favorites: string[]; onOpen: (id: string) => void; onFavorite: (id: string, e: React.MouseEvent) => void }) {
  if (!items.length) return null;
  return <section className="rounded-lg border border-border bg-card p-3">
    <h3 className="mb-3 text-sm font-bold">Recently Viewed</h3>
    <div className="grid grid-cols-3 gap-2">{items.slice(0, 3).map(h => <button key={h.id} type="button" onClick={() => onOpen(h.id)} className="text-left">
      <span className="relative block"><img src={h.images?.[0] || HOTEL_IMAGE_FALLBACK} alt={h.name} loading="lazy" className="h-16 w-full rounded-md object-cover" /><span role="button" tabIndex={0} aria-label="Save" onClick={e => onFavorite(h.id, e)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card"><Heart className={`h-3 w-3 ${favorites.includes(h.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} /></span></span>
      <span className="mt-1 block truncate text-[11px] font-semibold">{h.name}</span>
      <span className="block text-[11px] font-bold">₹{Number(h.price_per_night).toLocaleString("en-IN")}<span className="font-normal text-muted-foreground"> / night</span></span>
    </button>)}</div>
  </section>;
}
