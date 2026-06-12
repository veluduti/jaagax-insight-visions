import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Visit {
  id: string; visit_date: string; visit_time: string | null;
  status: string; buyer_name: string | null; city: string | null; locality: string | null;
  property_id: string | null;
  properties?: { title: string | null } | null;
}

export default function VisitManagement({ sellerId }: { sellerId: string }) {
  const [visits, setVisits] = useState<Visit[]>([]);

  const load = async () => {
    const sb: any = supabase;
    // visits on properties owned by this seller
    const { data: props } = await sb.from("properties").select("id").eq("submitted_by", sellerId);
    const ids = (props || []).map((p: any) => p.id);
    if (ids.length === 0) { setVisits([]); return; }
    const { data } = await sb
      .from("visit_bookings")
      .select("*, properties(title)")
      .in("property_id", ids)
      .order("visit_date", { ascending: true })
      .limit(20);
    setVisits((data || []) as Visit[]);
  };

  useEffect(() => { if (sellerId) load(); }, [sellerId]);

  const cancel = async (id: string) => {
    const sb: any = supabase;
    const { error } = await sb.from("visit_bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Visit cancelled");
    load();
  };

  if (visits.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-emerald-400" /> Scheduled Visits
          </div>
          <div className="space-y-2">
            {visits.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{v.properties?.title || "Property visit"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <CalendarDays className="h-3 w-3" /> {v.visit_date} {v.visit_time || ""}
                    {v.locality && <><MapPin className="h-3 w-3 ml-1" /> {v.locality}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{v.status}</Badge>
                  {v.status !== "cancelled" && v.status !== "completed" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cancel(v.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
