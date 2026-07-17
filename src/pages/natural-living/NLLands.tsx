import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Ruler, Droplets, Leaf, Loader2 } from "lucide-react";
import NLLayout from "@/features/natural-living/NLLayout";
import { supabase } from "@/integrations/supabase/client";

type Land = any;

export default function NLLands() {
  const [rows, setRows] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("nl_land_registrations")
        .select(
          "id, owner_name, village, mandal, district, state, country, total_area, area_unit, soil, terrain, water_availability, current_crop, suitable_for, farming_readiness, latitude, longitude, published_at, project_tenure"
        )
        .eq("status", "approved")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = q
    ? rows.filter((r) =>
        [r.village, r.mandal, r.district, r.state, r.owner_name, r.current_crop]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : rows;

  return (
    <NLLayout>
      <section className="nl-container py-12 md:py-16">
        <div className="mb-8 md:mb-12">
          <p className="nl-eyebrow mb-3">Live Lands</p>
          <h1 className="nl-serif text-3xl md:text-5xl" style={{ color: "hsl(var(--nl-forest))" }}>
            Verified lands, ready for a slower life
          </h1>
          <p className="mt-3 text-[hsl(var(--nl-ink)/0.75)] max-w-2xl">
            Every listing here has been reviewed and approved by our regional admins. Explore land available
            for lease, farm projects, farm stays, and community-owned initiatives.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by village, district, crop…"
            className="w-full md:w-96 px-4 py-2.5 rounded-full border text-sm bg-[hsl(var(--nl-cream))]"
            style={{ borderColor: "hsl(var(--border))" }}
          />
          <span className="text-xs text-[hsl(var(--nl-muted))] whitespace-nowrap">
            {filtered.length} live
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--nl-forest))]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[hsl(var(--nl-muted))]">
            No live lands yet. Approved listings will appear here.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to={`/natural-living/lands/${r.id}`}
                className="group rounded-2xl border overflow-hidden bg-[hsl(var(--nl-cream))] hover:shadow-lg transition-all"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <div
                  className="h-40 flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--nl-forest)/0.85), hsl(var(--nl-forest)/0.55))",
                    color: "hsl(var(--nl-cream))",
                  }}
                >
                  <Leaf className="h-10 w-10 opacity-80" />
                </div>
                <div className="p-4 space-y-2">
                  <h3
                    className="nl-serif text-lg leading-tight group-hover:underline"
                    style={{ color: "hsl(var(--nl-forest))" }}
                  >
                    {r.village || r.mandal || r.district || "Land parcel"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--nl-ink)/0.7)]">
                    <MapPin className="h-3.5 w-3.5" />
                    {[r.mandal, r.district, r.state].filter(Boolean).join(", ") || "—"}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    {r.total_area && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--nl-forest)/0.08)] text-[hsl(var(--nl-forest))]">
                        <Ruler className="h-3 w-3" />
                        {r.total_area} {r.area_unit || ""}
                      </span>
                    )}
                    {r.water_availability && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--nl-forest)/0.08)] text-[hsl(var(--nl-forest))]">
                        <Droplets className="h-3 w-3" />
                        {r.water_availability}
                      </span>
                    )}
                    {r.current_crop && (
                      <span className="px-2 py-1 rounded-full bg-[hsl(var(--nl-forest)/0.08)] text-[hsl(var(--nl-forest))]">
                        {r.current_crop}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </NLLayout>
  );
}
