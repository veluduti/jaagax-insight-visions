import { CalendarDays, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RentPlan } from "@/lib/longStayPricing";

interface Props {
  plan: RentPlan;
  plans: RentPlan[];
  duration: number;
  occupants: number;
  onDuration: (plan: RentPlan, duration: number) => void;
  onOccupants: (count: number) => void;
}

export default function PgSearchControls({ plan, plans, duration, occupants, onDuration, onOccupants }: Props) {
  return <>
    <div>
      <label htmlFor="pg-duration" className="mb-1 block text-xs font-medium">Stay Duration</label>
      <div className="flex h-12 items-center gap-2 rounded-md border border-input bg-card px-2">
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <Input id="pg-duration" aria-label="Stay duration" type="number" min={1} max={60} value={duration} onChange={e => onDuration(plan, Math.min(60, Math.max(1, Number(e.target.value) || 1)))} className="h-9 w-14 shrink-0 border-0 !px-1 shadow-none" />
        <Select value={plan} onValueChange={v => { if (v === "monthly" || v === "weekly") onDuration(v, duration); }}>
          <SelectTrigger aria-label="Duration unit" className="h-9 min-w-0 flex-1 border-0 px-1 shadow-none"><SelectValue /></SelectTrigger>
          <SelectContent>{plans.map(p => <SelectItem key={p} value={p}>{p === "monthly" ? (duration === 1 ? "Month" : "Months") : (duration === 1 ? "Week" : "Weeks")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium">Occupancy</label>
      <Select value={String(occupants)} onValueChange={v => onOccupants(Number(v))}>
        <SelectTrigger aria-label="Occupancy" className="h-12 bg-card"><span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><SelectValue /></span></SelectTrigger>
        <SelectContent>{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "Person" : "People"}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </>;
}