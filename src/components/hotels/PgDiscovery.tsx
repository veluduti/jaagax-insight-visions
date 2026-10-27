import { Checkbox } from "@/components/ui/checkbox";
import { Building, User, UserRound, Users, GraduationCap, Briefcase, Home, BedDouble, BadgeCheck, HandCoins, ShieldCheck, CalendarClock } from "lucide-react";
import { PG_TYPES } from "@/lib/pgDiscovery";
import bedImg from "@/assets/gal-bedroom.jpg";
import livingImg from "@/assets/gal-living.jpg";

const ICONS: Record<string, typeof Home> = { boys: User, girls: UserRound, coliving: Users, student: GraduationCap, professionals: Briefcase, family: Home, short: BedDouble };

export function PgCategoryTiles({ selected, counts, total, onSelect }: { selected: string[]; counts: Record<string, number>; total: number; onSelect: (keys: string[]) => void }) {
  const tiles = [{ key: "", label: "All PGs / Hostels" }, ...PG_TYPES];
  return <div className="no-scrollbar mb-5 grid auto-cols-[140px] grid-flow-col gap-3 overflow-x-auto py-1 lg:grid-flow-row lg:grid-cols-8" aria-label="PG and hostel categories">
    {tiles.map((t, i) => {
      const active = t.key ? selected.length === 1 && selected[0] === t.key : !selected.length;
      const n = t.key ? counts[t.key] || 0 : total;
      const Icon = t.key ? ICONS[t.key] : Building;
      return <button key={t.label} type="button" aria-pressed={active} onClick={() => onSelect(t.key ? [t.key] : [])} className={`overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md ${active ? "border-primary ring-2 ring-primary" : "border-border"}`}>
        <span className="relative block h-14"><img src={i % 2 ? livingImg : bedImg} alt="" loading="lazy" width={300} height={112} className="h-full w-full object-cover" /><span className="absolute -bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-md bg-card text-primary shadow"><Icon className="h-4 w-4" /></span></span>
        <span className={`block px-3 pt-4 text-xs font-semibold ${active ? "text-primary" : ""}`}>{t.label}</span>
        <span className="block px-3 pb-2 text-[10px] text-muted-foreground">{n} {n === 1 ? "stay" : "stays"}</span>
      </button>;
    })}
  </div>;
}

export function PgTypeFilter({ selected, counts, onChange }: { selected: string[]; counts: Record<string, number>; onChange: (keys: string[]) => void }) {
  return <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
    <h3 className="mb-2 text-xs font-semibold">PG / Hostel Type</h3>
    <div className="space-y-2">{PG_TYPES.map(t => <label key={t.key} className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox className="!rounded-[3px]" checked={selected.includes(t.key)} onCheckedChange={() => onChange(selected.includes(t.key) ? selected.filter(k => k !== t.key) : [...selected, t.key])} />
      <span>{t.label}</span><span className="text-muted-foreground">({counts[t.key] || 0})</span>
    </label>)}</div>
  </div>;
}

const WHY = [
  { icon: BadgeCheck, title: "Verified Properties", sub: "Trusted listings" },
  { icon: HandCoins, title: "No Brokerage", sub: "Direct booking" },
  { icon: ShieldCheck, title: "Safe & Secure", sub: "Verified by JaagaX" },
  { icon: CalendarClock, title: "Flexible Durations", sub: "Monthly or long stay" },
];
export function WhyBookPgs() {
  return <section className="rounded-lg border border-border bg-card p-3">
    <h3 className="mb-3 text-sm font-bold">Why Choose PGs & Hostels on JaagaX?</h3>
    <div className="grid grid-cols-2 gap-2">{WHY.map(w => <div key={w.title} className="rounded-md border border-border p-2 text-center"><w.icon className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-[11px] font-semibold">{w.title}</p><p className="text-[10px] text-muted-foreground">{w.sub}</p></div>)}</div>
  </section>;
}
