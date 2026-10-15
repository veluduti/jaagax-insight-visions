import { useEffect, useState } from "react";
import { loadLongStayMetrics, type LongStayMetrics } from "@/services/hospitality/longStayMetricsService";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type Stat = { label: string; value: (m: LongStayMetrics) => string };
const STATS: Record<string, Stat[]> = {
  pg: [
    { label: "Rooms / beds", value: (m) => `${m.rooms} / ${m.capacity}` },
    { label: "Current tenants", value: (m) => String(m.residents) },
    { label: "Available", value: (m) => String(m.available) },
    { label: "Rent due", value: (m) => `${m.rentDue} · ${inr(m.rentDueAmount)}` },
    { label: "Overdue", value: (m) => `${m.overdue} · ${inr(m.overdueAmount)}` },
    { label: "Move-ins / outs (30d)", value: (m) => `${m.upcomingMoveIns} / ${m.upcomingMoveOuts}` },
    { label: "Advance held", value: (m) => inr(m.advances) },
    { label: "Deposits held", value: (m) => inr(m.deposits) },
  ],
  hostel: [
    { label: "Total beds", value: (m) => String(m.capacity) },
    { label: "Occupied / free", value: (m) => `${m.occupied} / ${m.available}` },
    { label: "Dorm occupancy", value: (m) => `${m.occupancyPct}%` },
    { label: "Arrivals / departures (30d)", value: (m) => `${m.upcomingMoveIns} / ${m.upcomingMoveOuts}` },
    { label: "Rent due", value: (m) => `${m.rentDue + m.overdue} · ${inr(m.rentDueAmount + m.overdueAmount)}` },
    { label: "Maintenance blocks", value: (m) => String(m.maintenanceBlocks) },
  ],
  coliving: [
    { label: "Occupancy rate", value: (m) => `${m.occupancyPct}%` },
    { label: "Active residents", value: (m) => String(m.residents) },
    { label: "Revenue this month", value: (m) => inr(m.revenueThisMonth) },
    { label: "Renewals due (30d)", value: (m) => String(m.renewalsSoon) },
    { label: "Pending payments", value: (m) => String(m.pendingPayments) },
    { label: "Available units", value: (m) => String(m.available) },
    { label: "Maintenance", value: (m) => String(m.maintenanceBlocks) },
  ],
};

export const hasLongStayStats = (type: string) => !!STATS[type];

/** Live PG / Hostel / Co-living widgets; other business types render nothing. */
export default function LongStayDashboardStats({ type, hotelId }: { type: string; hotelId: string | null }) {
  const [m, setM] = useState<LongStayMetrics | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!hotelId || !STATS[type]) return;
    let alive = true;
    loadLongStayMetrics(hotelId).then((x) => alive && setM(x)).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [hotelId, type]);
  if (!STATS[type] || !hotelId) return null;
  if (err) return <p className="text-xs text-muted-foreground">Figures could not be loaded.</p>;
  if (!m) return <p className="text-xs text-muted-foreground">Loading figures…</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {STATS[type].map((s) => (
        <div key={s.label} className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2">
          <p className="text-[11px] leading-tight text-muted-foreground">{s.label}</p>
          <p className="text-sm font-semibold">{s.value(m)}</p>
        </div>
      ))}
    </div>
  );
}
