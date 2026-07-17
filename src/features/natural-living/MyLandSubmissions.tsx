import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Ruler, ArrowUpRight, Plus } from "lucide-react";

type Row = {
  id: string;
  village: string | null;
  mandal: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  total_area: number | null;
  area_unit: string | null;
  status: string;
  is_published: boolean | null;
  assigned_admin_role: string | null;
  rejection_reason: string | null;
  change_request_notes: string | null;
  submitted_at: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft (not submitted)", cls: "bg-[hsl(var(--nl-cream-deep))] text-[hsl(var(--nl-ink))] border-[hsl(var(--nl-forest)/0.3)]" },
  submitted: { label: "Sent for approval", cls: "bg-amber-500/15 text-amber-800 border-amber-500/40" },
  changes_requested: { label: "Changes requested", cls: "bg-blue-500/15 text-blue-800 border-blue-500/40" },
  approved: { label: "Approved · Live", cls: "bg-emerald-600/15 text-emerald-800 border-emerald-600/40" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-800 border-red-500/40" },
};

export default function MyLandSubmissions({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("nl_land_registrations")
        .select(
          "id,village,mandal,district,state,country,total_area,area_unit,status,is_published,assigned_admin_role,rejection_reason,change_request_notes,submitted_at,created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (alive) {
        setRows(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <section
      className="mt-12 p-6 md:p-8 border"
      style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="nl-serif text-2xl">Your land submissions</h2>
          <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">
            Track approval status of every land you've listed with JAAGA.
          </p>
        </div>
        <Link to="/natural-living/list-land" className="nl-btn nl-btn-outline">
          <Plus className="h-3.5 w-3.5 mr-2" /> List new land
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--nl-muted))] py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your submissions…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-[hsl(var(--nl-muted))] py-4">
          You haven't listed any land yet. Use "List new land" to begin — our AI will guide you.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.submitted;
            return (
              <div
                key={r.id}
                className="p-4 border bg-white/60 backdrop-blur-sm"
                style={{ borderColor: "hsl(var(--nl-forest) / 0.2)" }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[hsl(var(--nl-ink))]">
                        {r.village || r.district || "Untitled land"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 border rounded-full ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {r.status === "submitted" && r.assigned_admin_role && (
                        <span className="text-xs text-[hsl(var(--nl-muted))]">
                          → routed to {r.assigned_admin_role.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[hsl(var(--nl-ink)/0.7)] flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[r.village, r.mandal, r.district, r.state, r.country].filter(Boolean).join(", ") || "—"}
                      </span>
                      {r.total_area && (
                        <span className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          {r.total_area} {r.area_unit || ""}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--nl-muted))]">
                      {r.submitted_at
                        ? `Submitted ${new Date(r.submitted_at).toLocaleString()}`
                        : `Started ${new Date(r.created_at).toLocaleString()}`}
                    </div>
                    {r.rejection_reason && (
                      <div className="text-xs text-red-700 mt-1">Rejection reason: {r.rejection_reason}</div>
                    )}
                    {r.change_request_notes && (
                      <div className="text-xs text-blue-700 mt-1">Changes requested: {r.change_request_notes}</div>
                    )}
                  </div>

                  {r.status === "approved" && r.is_published ? (
                    <Link
                      to={`/natural-living/farms`}
                      className="text-xs inline-flex items-center gap-1 text-[hsl(var(--nl-forest))] hover:underline shrink-0"
                    >
                      View live listing <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : r.status === "draft" || r.status === "changes_requested" ? (
                    <Link
                      to="/natural-living/list-land"
                      className="text-xs inline-flex items-center gap-1 text-[hsl(var(--nl-forest))] hover:underline shrink-0"
                    >
                      Resume / edit <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
