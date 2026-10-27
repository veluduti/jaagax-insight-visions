import { Checkbox } from "@/components/ui/checkbox";
import { Building2, BedSingle, BedDouble, Home, Sofa, Crown, Briefcase, PawPrint, CalendarDays, LayoutGrid, Armchair, CookingPot, Clock, BadgeCheck } from "lucide-react";
import { APARTMENT_TYPES } from "@/lib/apartmentDiscovery";
import allImg from "@/assets/service-apartment-hero.jpg";
import livingImg from "@/assets/gal-living.jpg";
import bedImg from "@/assets/gal-bedroom.jpg";
import cityImg from "@/assets/hero-cityscape.jpg";

const ICONS: Record<string, typeof Home> = { "1bhk": BedSingle, "2bhk": BedDouble, "3bhk": Home, studio: Sofa, luxury: Crown, corporate: Briefcase, pet: PawPrint, monthly: CalendarDays };
const IMGS: Record<string, string> = { "1bhk": bedImg, "2bhk": livingImg, "3bhk": allImg, studio: bedImg, luxury: livingImg, corporate: cityImg, pet: livingImg, monthly: bedImg };

export function ApartmentCategoryTiles({ selected, counts, total, onSelect }: { selected: string[]; counts: Record<string, number>; total: number; onSelect: (keys: string[]) => void }) {
  const tiles = [{ key: "", label: "All Service Apartments", sub: "Every apartment" }, ...APARTMENT_TYPES];
  return <div className="no-scrollbar mb-5 grid auto-cols-[150px] grid-flow-col gap-3 overflow-x-auto py-1 lg:grid-flow-row lg:grid-cols-9" aria-label="Apartment categories">
    {tiles.map(t => {
      const active = t.key ? selected.length === 1 && selected[0] === t.key : !selected.length;
      const n = t.key ? counts[t.key] || 0 : total;
      const Icon = t.key ? ICONS[t.key] : LayoutGrid;
      return <button key={t.label} type="button" aria-pressed={active} onClick={() => onSelect(t.key ? [t.key] : [])} className={`overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md ${active ? "border-primary ring-2 ring-primary" : "border-border"}`}>
        <span className="relative block h-16"><img src={t.key ? IMGS[t.key] : allImg} alt="" loading="lazy" width={300} height={128} className="h-full w-full object-cover" /><span className="absolute -bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-md bg-card text-primary shadow"><Icon className="h-4 w-4" /></span></span>
        <span className={`block px-3 pt-4 text-xs font-semibold leading-tight ${active ? "text-primary" : ""}`}>{t.label}</span>
        <span className="block px-3 pb-2 text-[10px] text-muted-foreground">{t.sub} · {n}</span>
      </button>;
    })}
  </div>;
}

export function ApartmentTypeFilter({ selected, counts, onChange }: { selected: string[]; counts: Record<string, number>; onChange: (keys: string[]) => void }) {
  return <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
    <h3 className="mb-2 text-xs font-semibold">Apartment Type</h3>
    <div className="space-y-2">{APARTMENT_TYPES.map(t => <label key={t.key} className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox className="!rounded-[3px]" checked={selected.includes(t.key)} onCheckedChange={() => onChange(selected.includes(t.key) ? selected.filter(k => k !== t.key) : [...selected, t.key])} />
      <span>{t.label}</span><span className="text-muted-foreground">({counts[t.key] || 0})</span>
    </label>)}</div>
  </div>;
}

const WHY = [
  { icon: Armchair, title: "Fully Furnished", sub: "Move-in ready" },
  { icon: CookingPot, title: "Kitchen Facilities", sub: "Cook like home" },
  { icon: Clock, title: "Flexible Durations", sub: "Daily, weekly, monthly" },
  { icon: BadgeCheck, title: "Verified Properties", sub: "Trusted listings" },
];
export function WhyBookApartments() {
  return <section className="rounded-lg border border-border bg-card p-3">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Building2 className="h-4 w-4 text-primary" />Why Choose JaagaX Service Apartments?</h3>
    <div className="grid grid-cols-2 gap-2">{WHY.map(w => <div key={w.title} className="rounded-md border border-border p-2 text-center"><w.icon className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-[11px] font-semibold">{w.title}</p><p className="text-[10px] text-muted-foreground">{w.sub}</p></div>)}</div>
  </section>;
}
