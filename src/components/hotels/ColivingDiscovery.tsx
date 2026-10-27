import { Briefcase, GraduationCap, Heart, Users, UserRound, Crown, Laptop, PawPrint, Home } from "lucide-react";
import { COLIVING_CATEGORIES } from "@/config/hospitalityCategories";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import hero from "@/assets/coliving-hero.jpg";

const icons: Record<string, typeof Home> = { professionals: Briefcase, students: GraduationCap, couples: Heart, women: UserRound, men: Users, premium: Crown, workspace: Laptop, pet: PawPrint };
type Props = { selected: string[]; counts: Record<string, number>; onSelect: (keys: string[]) => void };
export function ColivingCategoryTiles({ selected, counts, total, onSelect, images }: Props & { total: number; images: Record<string, string> }) {
  return <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto py-1" aria-label="Co-living categories">
    {[{ key: "", label: "All Co-living" }, ...COLIVING_CATEGORIES].map(c => {
      const Icon = icons[c.key] ?? Home;
      const active = c.key ? selected.length === 1 && selected[0] === c.key : !selected.length;
      return <Button key={c.key} variant="outline" aria-pressed={active} onClick={() => onSelect(c.key ? [c.key] : [])} className={`h-auto min-h-[90px] min-w-[125px] flex-1 flex-col items-stretch justify-start gap-0 overflow-hidden rounded-md p-0 text-left ${active ? "border-primary ring-1 ring-primary" : "border-border"}`}>
        <img src={images[c.key] || hero} alt="" width={200} height={80} loading="lazy" className="h-10 w-full object-cover" />
        <span className="flex items-center gap-1 px-2 pt-2 text-[10px] font-semibold whitespace-normal"><Icon className="h-3.5 w-3.5 shrink-0 text-primary" />{c.label}</span>
        <span className="px-2 pb-1 text-[10px] text-muted-foreground">{c.key ? counts[c.key] || 0 : total} stays</span>
      </Button>;
    })}
  </div>;
}
export function ColivingTypeFilter({ selected, counts, onSelect }: Props) {
  return <div><h3 className="mb-2 text-xs font-semibold">Co-living Type</h3><div className="space-y-2">{COLIVING_CATEGORIES.map(c => <label key={c.key} className="flex items-center gap-2 text-xs"><Checkbox checked={selected.includes(c.key)} onCheckedChange={() => onSelect(selected.includes(c.key) ? selected.filter(k => k !== c.key) : [...selected, c.key])} /><span>{c.label}</span><span className="text-muted-foreground">({counts[c.key] || 0})</span></label>)}</div></div>;
}