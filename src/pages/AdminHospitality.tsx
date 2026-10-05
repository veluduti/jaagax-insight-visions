import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

async function audit(entity: string, entity_id: string, action: string, details: Record<string, unknown> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await sb.from("hospitality_audit_log").insert({ actor_id: user?.id, entity, entity_id, action, details });
}

export default function AdminHospitality() {
  const [props, setProps] = useState<any[] | null>(null);
  const [biz, setBiz] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [p, b, bk, l] = await Promise.all([
      sb.from("partner_hotels").select("id,name,city,onboarding_status,quality_score,is_active,business_types").order("updated_at", { ascending: false }).limit(200),
      sb.from("partner_businesses").select("id,legal_name,gstin,verification_status,created_at").order("created_at", { ascending: false }).limit(200),
      sb.from("hotel_bookings").select("id,hotel_name,guest_name,check_in,check_out,status,payment_status,total_amount,created_at").order("created_at", { ascending: false }).limit(50),
      sb.from("hospitality_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProps(p.data ?? []); setBiz(b.data ?? []); setBookings(bk.data ?? []); setLogs(l.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setPropStatus = async (id: string, status: "published" | "unpublished" | "draft") => {
    const { error } = await sb.from("partner_hotels").update({
      onboarding_status: status, is_active: status === "published",
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    await audit("property", id, status); toast.success(`Property ${status}`); load();
  };
  const setBizStatus = async (id: string, status: "verified" | "rejected") => {
    const { error } = await sb.from("partner_businesses").update({ verification_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    await audit("business", id, status); toast.success(`Business ${status}`); load();
  };

  const pending = (props ?? []).filter((p) => p.onboarding_status === "pending_review");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 pb-24 pt-24">
        <h1 className="mb-4 text-2xl font-bold">Hospitality Admin</h1>
        {!props ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : (
          <Tabs defaultValue="review">
            <TabsList className="flex-wrap">
              <TabsTrigger value="review">Property review ({pending.length})</TabsTrigger>
              <TabsTrigger value="all">All properties</TabsTrigger>
              <TabsTrigger value="biz">Businesses</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="audit">Audit log</TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="space-y-2">
              {!pending.length && <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>}
              {pending.map((p) => <PropRow key={p.id} p={p} onSet={setPropStatus} />)}
            </TabsContent>
            <TabsContent value="all" className="space-y-2">{props.map((p) => <PropRow key={p.id} p={p} onSet={setPropStatus} />)}</TabsContent>
            <TabsContent value="biz" className="space-y-2">
              {biz.map((b) => (
                <Card key={b.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div><p className="font-medium">{b.legal_name}</p><p className="text-xs text-muted-foreground">GST {b.gstin || "—"}</p></div>
                  <div className="flex items-center gap-2"><Badge variant="secondary">{b.verification_status}</Badge>
                    <Button size="sm" onClick={() => setBizStatus(b.id, "verified")}>Verify</Button>
                    <Button size="sm" variant="outline" onClick={() => setBizStatus(b.id, "rejected")}>Reject</Button></div>
                </CardContent></Card>
              ))}
            </TabsContent>
            <TabsContent value="bookings">
              <Card><CardHeader><CardTitle className="text-base">Latest bookings</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
                {bookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-1.5">
                    <span>{b.hotel_name} · {b.guest_name} · {b.check_in} → {b.check_out}</span>
                    <span><Badge variant="secondary">{b.status}</Badge> <Badge variant="outline">{b.payment_status}</Badge> ₹{Number(b.total_amount ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="audit" className="space-y-1 text-sm">
              {logs.map((l) => <div key={l.id} className="border-b border-border py-1.5">{new Date(l.created_at).toLocaleString("en-IN")} · {l.entity} · {l.action}</div>)}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function PropRow({ p, onSet }: { p: any; onSet: (id: string, s: "published" | "unpublished" | "draft") => void }) {
  return (
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
      <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.city} · {(p.business_types ?? []).join(", ")} · Quality {p.quality_score}/100</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={p.onboarding_status === "published" ? "default" : "secondary"}>{p.onboarding_status}</Badge>
        <Button size="sm" variant="ghost" onClick={() => window.open(`/hotels/${p.id}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
        <Button size="sm" onClick={() => onSet(p.id, "published")}>Publish</Button>
        <Button size="sm" variant="outline" onClick={() => onSet(p.id, "unpublished")}>Unpublish</Button>
      </div>
    </CardContent></Card>
  );
}
