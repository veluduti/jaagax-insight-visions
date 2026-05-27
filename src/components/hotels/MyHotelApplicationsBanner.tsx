import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppStatus {
  id: string;
  hotel_name: string;
  city: string;
  locality: string;
  status: string;
  rejection_reason: string | null;
  approved_hotel_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STORAGE_KEY = "hotel_partner_applications";

const MyHotelApplicationsBanner = () => {
  const [apps, setApps] = useState<AppStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const local: { id: string }[] = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
    })();
    if (local.length === 0) { setLoading(false); return; }

    (async () => {
      const results = await Promise.all(
        local.map(async (l) => {
          const { data } = await (supabase as any).rpc("get_hotel_application_status", { _id: l.id });
          return data?.[0] as AppStatus | undefined;
        })
      );
      const valid = results.filter(Boolean) as AppStatus[];
      // Clean stale ids
      try {
        const validIds = new Set(valid.map((v) => v.id));
        const trimmed = local.filter((l) => validIds.has(l.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {}
      setApps(valid);
      setLoading(false);
    })();
  }, []);

  if (loading || apps.length === 0) return null;

  const badge = (s: string) => {
    if (s === "approved")
      return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved & Live</Badge>;
    if (s === "rejected")
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Needs revision</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30"><Clock className="h-3 w-3 mr-1" /> Pending review</Badge>;
  };

  return (
    <section className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 mt-6">
      <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Your Hotel Partner Application{apps.length > 1 ? "s" : ""}</h3>
        </div>
        <div className="space-y-2">
          {apps.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md bg-background/60 border border-border/50">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.hotel_name}</p>
                <p className="text-xs text-muted-foreground">{a.locality}, {a.city} · Submitted {new Date(a.created_at).toLocaleDateString()}</p>
                {a.status === "rejected" && a.rejection_reason && (
                  <p className="text-xs text-destructive mt-1">Reason: {a.rejection_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {badge(a.status)}
                {a.status === "approved" && a.approved_hotel_id && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`/hotels/${a.approved_hotel_id}`, "_blank", "noopener,noreferrer")}>
                    View listing <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
};

export default MyHotelApplicationsBanner;
