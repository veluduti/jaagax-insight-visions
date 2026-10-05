import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePartnerBusinessTypes } from "@/hooks/usePartnerBusinessTypes";
import { CATEGORY_BY_KEY, type PartnerModule } from "@/config/hospitalityCategories";

const MODULE_INFO: Record<PartnerModule, { label: string; desc: string; to: string; cta: string }> = {
  rooms: { label: "Rooms", desc: "Room types, nightly rates, occupancy", to: "/partners/rooms", cta: "Manage rooms" },
  beds: { label: "Beds", desc: "Dorm / sharing beds, per-bed pricing", to: "/partners/rooms", cta: "Manage beds" },
  units: { label: "Units", desc: "Entire apartments / villas", to: "/partners/rooms", cta: "Manage units" },
  meals: { label: "Meals", desc: "Breakfast, meal plans, food services", to: "/partners/extra-services", cta: "Meal plans" },
  longstay: { label: "Long stay", desc: "Monthly pricing, deposits", to: "/partners/pricing", cta: "Monthly pricing" },
  experiences: { label: "Experiences", desc: "Activities, tours, events", to: "/partners/extra-services", cta: "Experiences" },
};

/** One dashboard section per business type the partner selected. */
export default function BusinessTypePanels() {
  const nav = useNavigate();
  const { types, activeType, setActiveType } = usePartnerBusinessTypes();
  const shown = activeType === "all" ? types : types.filter((t) => t === activeType);
  if (!shown.length) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">
        {shown.length > 1 ? `Your ${shown.length} business types` : "Your business"}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((t) => {
          const c = CATEGORY_BY_KEY[t];
          if (!c) return null;
          return (
            <Card key={t} className="border-emerald-500/20">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <span className="text-2xl">{c.emoji}</span>{c.label} dashboard
                  </div>
                  {types.length > 1 && activeType === "all" && (
                    <Button size="sm" variant="ghost" onClick={() => setActiveType(t)}>Open</Button>
                  )}
                </div>
                <div className="space-y-2">
                  {c.modules.map((m) => {
                    const info = MODULE_INFO[m];
                    return (
                      <div key={m} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{info.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{info.desc}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setActiveType(t); nav(info.to); }}>
                          {info.cta}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
