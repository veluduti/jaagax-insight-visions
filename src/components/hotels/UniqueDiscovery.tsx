import { Checkbox } from "@/components/ui/checkbox";
import { BadgeCheck, FileText, CalendarRange, Headphones, Briefcase, Building, Users, LayoutGrid, Home, Tractor, Sparkles, Tent, TreePine, Waves, PawPrint } from "lucide-react";
import { UNIQUE_TYPES } from "@/lib/uniqueDiscovery";
import fallbackImg from "@/assets/explore-stays.jpg";

const ICONS: Record<string, typeof Briefcase> = { "": LayoutGrid, villa: Home, farm_stay: Tractor, homestay: Users, boutique: Sparkles, glamping: Tent, cottage: TreePine, entire_home: Building, private_pool: Waves, pet: PawPrint };

export function UniqueCategoryTiles({ selected, counts, total, images, onSelect }: { selected: string[]; counts: Record<string, number>; total: number; images: Record<string, string>; onSelect: (keys: string[]) => void }) {
  const tiles = [{ key: "", label: "All Unique Stays", n: total }, ...UNIQUE_TYPES.map(t => ({ key: t.key, label: t.label, n: counts[t.key] || 0 }))];
  return <div className="no-scrollbar mb-5 grid auto-cols-[120px] grid-flow-col gap-2 overflow-x-auto py-1 xl:grid-flow-row xl:grid-cols-10" aria-label="Unique stay categories">
    {tiles.map(t => {
      const active = t.key ? selected.length === 1 && selected[0] === t.key : !selected.length;
      const Icon = ICONS[t.key] || Briefcase;
      return <button key={t.label} type="button" aria-pressed={active} onClick={() => onSelect(t.key ? [t.key] : [])} className={`overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md ${active ? "border-primary ring-2 ring-primary" : "border-border"}`}>
        <span className="relative block h-16"><img src={images[t.key] || fallbackImg} alt="" loading="lazy" width={300} height={128} className="h-full w-full object-cover" /><span className="absolute -bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-md bg-card text-primary shadow"><Icon className="h-4 w-4" /></span></span>
        <span className={`block px-3 pt-4 text-xs font-semibold ${active ? "text-primary" : ""}`}>{t.label}</span>
        <span className="block px-3 pb-2 text-[10px] text-muted-foreground">{t.n} {t.n === 1 ? "stay" : "stays"}</span>
      </button>;
    })}
  </div>;
}

export function UniqueTypeFilter({ selected, counts, onChange }: { selected: string[]; counts: Record<string, number>; onChange: (keys: string[]) => void }) {
  return <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
    <h3 className="mb-2 text-xs font-semibold">Stay Style</h3>
    <div className="space-y-2">{UNIQUE_TYPES.map(t => <label key={t.key} className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox className="!rounded-[3px]" checked={selected.includes(t.key)} onCheckedChange={() => onChange(selected.includes(t.key) ? selected.filter(k => k !== t.key) : [...selected, t.key])} />
      <span>{t.label}</span><span className="text-muted-foreground">({counts[t.key] || 0})</span>
    </label>)}</div>
  </div>;
}

const WHY = [
  { icon: BadgeCheck, title: "Verified Properties", sub: "Partner-listed stays" },
  { icon: FileText, title: "Real Details", sub: "From partner listings" },
  { icon: CalendarRange, title: "Flexible Stays", sub: "Short & long term" },
  { icon: Headphones, title: "Support", sub: "Help when you need it" },
];
export function WhyBookUnique() {
  return <section className="rounded-lg border border-border bg-card p-3">
    <h3 className="mb-3 flex items-center gap-1 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary" />Why Choose JaagaX Unique Stays?</h3>
    <div className="grid grid-cols-2 gap-2">{WHY.map(w => <div key={w.title} className="rounded-md border border-border p-2 text-center"><w.icon className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-[11px] font-semibold">{w.title}</p><p className="text-[10px] text-muted-foreground">{w.sub}</p></div>)}</div>
  </section>;
}
