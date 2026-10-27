import { Checkbox } from "@/components/ui/checkbox";
import { BadgeCheck, BadgePercent, Sparkles, Headphones, Crown } from "lucide-react";
import { LUXURY_TYPES } from "@/lib/luxuryDiscovery";
import fallbackImg from "@/assets/resort-luxury.jpg";

/** Tile images come from real partner photos for each category; the bundled image is only a fallback. */
export function LuxuryCategoryTiles({ selected, counts, total, images, onSelect }: { selected: string[]; counts: Record<string, number>; total: number; images: Record<string, string>; onSelect: (keys: string[]) => void }) {
  const tiles = [{ key: "", label: "All Luxury Stays", sub: `${total} ${total === 1 ? "stay" : "stays"}` }, ...LUXURY_TYPES.map(t => ({ key: t.key, label: t.label, sub: `${counts[t.key] || 0} · ${t.sub}` }))];
  return <div className="no-scrollbar mb-5 grid auto-cols-[150px] grid-flow-col gap-3 overflow-x-auto py-1 xl:grid-flow-row xl:grid-cols-9" aria-label="Luxury categories">
    {tiles.map(t => {
      const active = t.key ? selected.length === 1 && selected[0] === t.key : !selected.length;
      return <button key={t.label} type="button" aria-pressed={active} onClick={() => onSelect(t.key ? [t.key] : [])} className={`overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md ${active ? "border-primary ring-2 ring-primary" : "border-border"}`}>
        <img src={images[t.key] || fallbackImg} alt="" loading="lazy" width={300} height={128} className="h-16 w-full object-cover" />
        <span className={`block px-3 pt-2 text-xs font-semibold ${active ? "text-primary" : ""}`}>{t.label}</span>
        <span className="block truncate px-3 pb-2 text-[10px] text-muted-foreground">{t.sub}</span>
      </button>;
    })}
  </div>;
}

export function LuxuryTypeFilter({ selected, counts, onChange }: { selected: string[]; counts: Record<string, number>; onChange: (keys: string[]) => void }) {
  return <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
    <h3 className="mb-2 text-xs font-semibold">Luxury Type</h3>
    <div className="space-y-2">{LUXURY_TYPES.map(t => <label key={t.key} className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox className="!rounded-[3px]" checked={selected.includes(t.key)} onCheckedChange={() => onChange(selected.includes(t.key) ? selected.filter(k => k !== t.key) : [...selected, t.key])} />
      <span>{t.label}</span><span className="text-muted-foreground">({counts[t.key] || 0})</span>
    </label>)}</div>
  </div>;
}

const WHY = [
  { icon: BadgeCheck, title: "Verified Properties", sub: "Trusted listings" },
  { icon: BadgePercent, title: "Live Partner Prices", sub: "No hidden charges" },
  { icon: Sparkles, title: "Curated Experiences", sub: "Partner-listed extras" },
  { icon: Headphones, title: "Support", sub: "Help when you need it" },
];
export function WhyBookLuxury() {
  return <section className="rounded-lg border border-border bg-card p-3">
    <h3 className="mb-3 flex items-center gap-1 text-sm font-bold"><Crown className="h-4 w-4 text-primary" />Why Choose JaagaX Luxury Stays?</h3>
    <div className="grid grid-cols-2 gap-2">{WHY.map(w => <div key={w.title} className="rounded-md border border-border p-2 text-center"><w.icon className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-[11px] font-semibold">{w.title}</p><p className="text-[10px] text-muted-foreground">{w.sub}</p></div>)}</div>
  </section>;
}
