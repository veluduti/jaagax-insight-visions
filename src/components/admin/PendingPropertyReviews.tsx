import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

/** Partner properties submitted via "Submit for review" (partner_hotels.onboarding_status = pending_review). */
export default function PendingPropertyReviews() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await sb
      .from("partner_hotels")
      .select("id,name,city,locality,business_types,onboarding_status,updated_at")
      .eq("onboarding_status", "pending_review")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_pending_partner_hotels")
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_hotels" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const decide = async (id: string, status: "published" | "draft") => {
    setBusy(id);
    const { error } = await sb.from("partner_hotels").update({
      onboarding_status: status,
      is_active: status === "published",
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    const { data: { user } } = await supabase.auth.getUser();
    await sb.from("hospitality_audit_log").insert({ actor_id: user?.id, entity: "property", entity_id: id, action: status, details: {} });
    toast.success(status === "published" ? "Property approved & published" : "Sent back to partner");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties waiting for review ({rows?.length ?? 0})</CardTitle>
        <CardDescription>Partner properties submitted for review from the partner workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!rows ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> :
          rows.length === 0 ? <p className="text-sm text-muted-foreground">No properties waiting for review.</p> :
          rows.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <div className="font-medium">{p.name || "Untitled"}</div>
                <div className="text-xs text-muted-foreground">{[p.locality, p.city].filter(Boolean).join(", ") || "N/A"}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(p.business_types ?? []).map((t: string) => <Badge key={t} variant="secondary" className="capitalize">{t.replace(/_/g, " ")}</Badge>)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === p.id} onClick={() => decide(p.id, "published")}>Approve</Button>
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => decide(p.id, "draft")}>Send back</Button>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
