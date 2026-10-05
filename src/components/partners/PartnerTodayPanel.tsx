import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadWorkspace, type WorkspaceData } from "@/services/hospitality/workspaceService";

const CANCELLED = ["cancelled", "canceled", "rejected"];
const iso = (d = new Date()) => d.toISOString().slice(0, 10);

/** Action-first partner home: what needs attention today, then numbers, then upcoming. */
export default function PartnerTodayPanel({ hotelId, groupName }: { hotelId: string | null; groupName: string }) {
  const nav = useNavigate();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const n = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "").split(/[ @]/)[0];
      setName(n);
    });
    if (hotelId) loadWorkspace(hotelId).then(setData).catch(() => setData({ rooms: [], units: [], bookings: [] }));
  }, [hotelId]);

  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const t = iso();
  const live = (data?.bookings ?? []).filter((b) => !CANCELLED.includes(String(b.status).toLowerCase()));
  const checkIns = live.filter((b) => b.check_in === t && !b.actual_check_in_at);
  const checkOuts = live.filter((b) => b.check_out === t && !b.actual_check_out_at);
  const pending = live.filter((b) => String(b.status).toLowerCase() === "pending");
  const cleaning = live.filter((b) => b.housekeeping_status && !["clean", "inspected"].includes(b.housekeeping_status));
  const inHouse = live.filter((b) => b.check_in <= t && b.check_out > t);
  const totalUnits = (data?.rooms ?? []).reduce((s, r) => s + (r.is_active === false ? 0 : r.total_units || 0), 0);
  const occupancy = totalUnits ? Math.min(100, Math.round((inHouse.length / totalUnits) * 100)) : 0;
  const revenue = live.filter((b) => b.check_in === t).reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
  const noPrice = (data?.rooms ?? []).filter((r) => !r.base_price && !r.monthly_price).length;
  const upcoming = live.filter((b) => b.check_in > t).sort((a, b) => a.check_in.localeCompare(b.check_in)).slice(0, 4);

  const attention = [
    cleaning.length && { dot: "bg-destructive", text: `${cleaning.length} room${cleaning.length > 1 ? "s" : ""} need cleaning`, to: "/partners/dashboard#housekeeping" },
    pending.length && { dot: "bg-orange-400", text: `${pending.length} booking request${pending.length > 1 ? "s" : ""} waiting`, to: "/partners/reservations" },
    noPrice && { dot: "bg-yellow-400", text: `${noPrice} room type${noPrice > 1 ? "s have" : " has"} no price`, to: "/partners/rooms" },
    totalUnits === 0 && data && { dot: "bg-yellow-400", text: "Add rooms so guests can book", to: "/partners/rooms" },
  ].filter(Boolean) as { dot: string; text: string; to: string }[];

  return (
    <Card className="mb-6 border-emerald-500/20">
      <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="text-xl font-semibold">{greet}{name ? `, ${name}` : ""}</p>
            <p className="text-sm text-muted-foreground">{groupName}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Check-ins", checkIns.length], ["Check-outs", checkOuts.length], ["Pending", pending.length]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg border border-border/60 p-2">
                <p className="text-2xl font-bold">{data ? v : "…"}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => nav("/partners/portfolio")}>Add property</Button>
            <Button size="sm" variant="outline" onClick={() => nav("/partners/inventory")}>Manage availability</Button>
            <Button size="sm" variant="outline" onClick={() => nav("/partners/reservations")}>View bookings</Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Needs your attention</p>
          {data && attention.length === 0 && <p className="text-sm text-muted-foreground">All clear — nothing needs you right now.</p>}
          <div className="space-y-1.5">
            {attention.map((a) => (
              <button key={a.text} type="button" onClick={() => nav(a.to)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40">
                <span className={`h-2 w-2 rounded-full ${a.dot}`} />{a.text}
              </button>
            ))}
          </div>
          <p className="mb-1 mt-4 text-sm font-semibold">Today's business</p>
          <div className="flex gap-6">
            <div><p className="text-xl font-bold">{occupancy}%</p><p className="text-xs text-muted-foreground">Occupancy</p></div>
            <div><p className="text-xl font-bold">₹{revenue.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">Arrivals value</p></div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Upcoming</p>
          {data && upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming arrivals.</p>}
          <div className="space-y-2">
            {upcoming.map((b) => (
              <div key={b.id} className="rounded-md border border-border/60 px-3 py-2 text-sm">
                <p className="font-medium">{b.check_in} · Check-in</p>
                <p className="text-xs text-muted-foreground">{b.guest_name || "Guest"} · {b.room_type || "Room"}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
