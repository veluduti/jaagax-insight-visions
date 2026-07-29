import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Ruler, Eye, Pencil, Share2, Sparkles, ExternalLink } from "lucide-react";

interface Row {
  id: string;
  village: string | null;
  district: string | null;
  state: string | null;
  total_area: number | null;
  area_unit: string | null;
  profile_tier: string | null;
  profile_slug: string | null;
  profile_created_at: string | null;
  status: string;
  is_published: boolean | null;
}

const tierBadge = (tier: string | null) => {
  const t = (tier || "normal").toLowerCase();
  if (t === "luxury")
    return { label: "Luxury", cls: "bg-amber-500/15 text-amber-700 border-amber-500/40" };
  if (t === "standard")
    return { label: "Standard", cls: "bg-emerald-600/15 text-emerald-800 border-emerald-600/40" };
  return { label: "Normal", cls: "bg-slate-500/15 text-slate-700 border-slate-500/40" };
};

export default function MyLandProfiles({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("nl_land_registrations")
      .select(
        "id, village, district, state, total_area, area_unit, profile_tier, profile_slug, profile_created_at, status, is_published",
      )
      .eq("user_id", userId)
      .eq("profile_created", true)
      .order("profile_created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function share(r: Row) {
    const url = `${window.location.origin}/natural-living/lands/${r.id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: r.village || "Land profile", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Profile link copied to clipboard");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <section
      className="mt-12 p-6 md:p-8 border"
      style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="nl-serif text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
            My Land Profiles
          </h2>
          <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">
            Shareable public profiles created from your land registrations.
          </p>
        </div>
        <Link to="/natural-living/list-land" className="nl-btn nl-btn-outline">
          + List new land
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--nl-muted))] py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your profiles…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-[hsl(var(--nl-muted))] py-4">
          No profiles yet. After submitting a land registration, JAAGA will offer to create a shareable profile for it.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const badge = tierBadge(r.profile_tier);
            const loc = [r.village, r.district, r.state].filter(Boolean).join(", ");
            const href = `/natural-living/lands/${r.id}`;
            return (
              <div
                key={r.id}
                className="p-4 border bg-white/70 backdrop-blur-sm rounded-xl"
                style={{ borderColor: "hsl(var(--nl-forest) / 0.2)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-semibold text-[hsl(var(--nl-ink))] truncate">
                    {r.village || r.district || "Land profile"}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 border rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-xs text-[hsl(var(--nl-ink)/0.7)] space-y-1 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {loc || "—"}
                  </div>
                  {r.total_area && (
                    <div className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" /> {r.total_area} {r.area_unit || ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-3 border-t" style={{ borderColor: "hsl(var(--nl-forest)/0.15)" }}>
                  <Link
                    to={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5"
                    style={{ borderColor: "hsl(var(--nl-forest))", color: "hsl(var(--nl-forest))" }}
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate("/natural-living/list-land")}
                    className="text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5"
                    style={{ borderColor: "hsl(var(--nl-forest))", color: "hsl(var(--nl-forest))" }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => share(r)}
                    className="text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                    style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </button>
                  <Link
                    to={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[hsl(var(--nl-forest))] p-1.5"
                    aria-label="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
