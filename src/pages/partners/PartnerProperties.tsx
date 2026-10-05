import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { usePartnerBusinessTypes } from "@/hooks/usePartnerBusinessTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_BY_KEY, normalizeCategory } from "@/config/hospitalityCategories";
import { workspaceFor, type WorkspaceSectionKey } from "@/config/propertyWorkspaces";
import { listProperties, type PartnerProperty } from "@/services/hospitality/partnerService";
import { loadWorkspace, type WorkspaceData } from "@/services/hospitality/workspaceService";

const money = (n: number | null | undefined) => (n ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—");
const today = () => new Date().toISOString().slice(0, 10);
const nights = (a: string, b: string) => Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 86400000));

export default function PartnerProperties() {
  const ctx = usePartnerHotel();
  const { types: partnerTypes, setActiveType } = usePartnerBusinessTypes();
  const { id } = useParams();
  const nav = useNavigate();
  const [props, setProps] = useState<PartnerProperty[]>([]);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [type, setType] = useState<string>("");

  useEffect(() => {
    if (!ctx.userId) return;
    listProperties(ctx.userId).then(setProps).catch(() => setProps([]));
  }, [ctx.userId]);

  const typesOf = (p: PartnerProperty) => {
    const t = (p.business_types ?? []).map(normalizeCategory);
    return t.length ? Array.from(new Set(t)) : p.id === ctx.hotelId && partnerTypes.length ? partnerTypes : ["hotel"];
  };

  const selected = props.find((p) => p.id === id) ?? props.find((p) => p.id === ctx.hotelId) ?? props[0];
  const selTypes = selected ? typesOf(selected) : [];
  const activeType = selTypes.includes(type) ? type : selTypes[0];

  useEffect(() => {
    if (!selected) return;
    setData(null);
    loadWorkspace(selected.id).then(setData).catch(() => setData({ rooms: [], units: [], bookings: [] }));
  }, [selected?.id]);

  const grouped = useMemo(() => {
    const g: Record<string, PartnerProperty[]> = {};
    props.forEach((p) => typesOf(p).forEach((t) => { (g[t] ||= []).push(p); }));
    return g;
  }, [props, partnerTypes, ctx.hotelId]);

  const stat = (k: WorkspaceSectionKey): string => {
    if (!data) return "…";
    const t = today();
    const active = data.bookings.filter((b) => !["cancelled", "canceled", "rejected"].includes(String(b.status)));
    const byUnit = (u: string) => data.rooms.filter((r) => (r.stay_unit || "room") === u);
    const unitsOf = (u: string) => data.units.filter((x) => (x.unit_kind || "room") === u).length || byUnit(u).reduce((s, r) => s + (r.total_units || 0), 0);
    const avg = (f: "base_price" | "weekly_price" | "monthly_price") => {
      const v = data.rooms.map((r) => r[f]).filter(Boolean) as number[];
      return v.length ? `from ${money(Math.min(...v))}` : "Not set";
    };
    switch (k) {
      case "room_types": return `${data.rooms.filter((r) => (r.stay_unit || "room") !== "unit").length} types`;
      case "apartment_types": return `${byUnit("unit").length} types`;
      case "rooms": return `${unitsOf("room")} rooms`;
      case "units": return `${unitsOf("unit")} units`;
      case "beds": return `${unitsOf("bed")} beds`;
      case "rates": case "daily_rates": return avg("base_price");
      case "weekly_rates": return avg("weekly_price");
      case "monthly_rates": return avg("monthly_price");
      case "availability": return `${data.rooms.filter((r) => r.is_active !== false).length} open`;
      case "housekeeping": return `${active.filter((b) => b.housekeeping_status && b.housekeeping_status !== "clean").length} to clean`;
      case "residents": return `${active.filter((b) => b.check_in <= t && b.check_out > t).length} living now`;
      case "move": return `${active.filter((b) => b.check_in >= t).length} in · ${active.filter((b) => b.check_out >= t && b.check_in <= t).length} out`;
      case "bookings": return `${active.length} bookings`;
      default: return "Open";
    }
  };

  if (ctx.loading) return <Shell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Shell>;

  const t = today();
  const residents = data?.bookings.filter((b) => b.check_in <= t && b.check_out > t && !["cancelled", "canceled"].includes(String(b.status))) ?? [];
  const showResidents = activeType && workspaceFor(activeType).some((s) => s.key === "residents");

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Property tree */}
        <Card className="h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-base">Properties</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground">No properties yet.</p>}
            {Object.entries(grouped).map(([tk, list]) => (
              <div key={tk}>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  {CATEGORY_BY_KEY[tk]?.emoji} {CATEGORY_BY_KEY[tk]?.label ?? tk}
                </p>
                {list.map((p) => (
                  <button key={p.id + tk} type="button"
                    onClick={() => { setType(tk); nav(`/partners/properties/${p.id}`); }}
                    className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                      selected?.id === p.id && activeType === tk ? "bg-primary/10 text-primary" : "hover:bg-muted/50")}>
                    <span className="truncate">{p.name}</span><ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            ))}
            <Link to="/partners/portfolio" className="block text-xs text-primary hover:underline">Manage businesses & properties →</Link>
          </CardContent>
        </Card>

        {/* Type-specific workspace */}
        {selected && activeType ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold"><Building2 className="h-5 w-5 text-primary" />{selected.name}</h1>
                <p className="text-sm text-muted-foreground">{[selected.locality, selected.city].filter(Boolean).join(", ")}</p>
              </div>
              <Badge variant="secondary" className="capitalize">{(selected.onboarding_status || "draft").replace(/_/g, " ")}</Badge>
            </div>

            {selTypes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {selTypes.map((tk) => (
                  <Button key={tk} size="sm" variant={tk === activeType ? "default" : "outline"} onClick={() => setType(tk)}>
                    {CATEGORY_BY_KEY[tk]?.emoji} {CATEGORY_BY_KEY[tk]?.label ?? tk}
                  </Button>
                ))}
              </div>
            )}

            <h2 className="text-lg font-semibold">{CATEGORY_BY_KEY[activeType]?.label} workspace</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {workspaceFor(activeType).map((s) => (
                <button key={s.key} type="button"
                  onClick={() => { setActiveType(activeType); nav(s.to); }}
                  className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.label}</p>
                    <span className="text-sm font-semibold text-primary">{stat(s.key)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                </button>
              ))}
            </div>

            {showResidents && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Current residents</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {residents.length === 0 && <p className="text-sm text-muted-foreground">Nobody is living here right now.</p>}
                  {residents.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>{r.guest_name || "Guest"} · {r.room_type || "Bed"}</span>
                      <span className="text-muted-foreground">Moves out {r.check_out} · {nights(r.check_in, r.check_out)} nights</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a property to open its workspace.</p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
