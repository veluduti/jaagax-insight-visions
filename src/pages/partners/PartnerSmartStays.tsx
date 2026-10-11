import { useEffect, useState } from "react";
import { toast } from "sonner";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PackageBuilder from "@/components/smartstays/PackageBuilder";
import { listMyApprovalRequests, decideApproval, listHotelReservations, statusText, errMsg, inr } from "@/services/smartStayService";

export default function PartnerSmartStays() {
  const { loading, userId } = usePartnerHotel({ requirePmsSetup: false });
  const [hotelIds, setHotelIds] = useState<string[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [res, setRes] = useState<any[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const db = supabase as any;
      const [{ data: own }, { data: staff }] = await Promise.all([
        db.from("partner_hotels").select("id").eq("manager_id", userId),
        db.from("hotel_staff").select("hotel_id").eq("user_id", userId).eq("is_active", true),
      ]);
      setHotelIds([...new Set([...(own ?? []).map((h: any) => h.id), ...(staff ?? []).map((s: any) => s.hotel_id)])] as string[]);
    })();
  }, [userId]);

  const load = () => { listMyApprovalRequests(hotelIds).then(setReqs).catch(() => {}); listHotelReservations(hotelIds).then(setRes); };
  useEffect(() => { load(); }, [hotelIds.join()]);

  const decide = async (id: string, d: "approved" | "rejected" | "changes_requested") => {
    try { await decideApproval(id, d, reason[id] ?? ""); toast.success("Saved"); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  const pending = reqs.filter((r) => r.status === "pending" && r.revision?.revision === r.stay?.current_revision);

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav /><PartnerSubNav />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Smart Stays</h1>
        {loading || !userId ? <p className="text-muted-foreground">Loading…</p> : (
          <Tabs defaultValue="approvals">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="approvals">Approval requests {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="reservations">Reservations</TabsTrigger>
              <TabsTrigger value="packages">My packages</TabsTrigger>
            </TabsList>
            <TabsContent value="approvals" className="space-y-3">
              {reqs.length === 0 && <Card className="p-8 text-center text-muted-foreground">No requests yet. When an agent or partner adds your hotel to a package, it shows here.</Card>}
              {reqs.map((r) => {
                const current = r.revision?.revision === r.stay?.current_revision;
                return (
                  <Card key={r.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div><h3 className="font-semibold">{r.stay?.title}</h3><p className="text-xs text-muted-foreground">{r.stay?.public_ref} · {r.hotel?.name} · Revision {r.revision?.revision}</p></div>
                      <Badge variant={r.status === "approved" ? "default" : "secondary"}>{!current && r.status === "pending" ? "Out of date" : r.status.replace("_", " ")}</Badge>
                    </div>
                    {(r.stays ?? []).map((s: any, i: number) => (
                      <div key={i} className="text-sm bg-muted/50 rounded-md p-2">{s.room_name} × {s.num_rooms} · {s.check_in} → {s.check_out} · {s.adults} adult(s){s.children ? `, ${s.children} child(ren)` : ""}{s.meal_plan ? ` · ${s.meal_plan}` : ""} · {inr(s.amount)}</div>
                    ))}
                    {r.reason && <p className="text-xs text-muted-foreground">Note: {r.reason}</p>}
                    {r.status === "pending" && current && (
                      <div className="space-y-2">
                        <Textarea rows={2} placeholder="Reason (required to reject or request changes)" value={reason[r.id] ?? ""} onChange={(e) => setReason({ ...reason, [r.id]: e.target.value })} />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => decide(r.id, "changes_requested")}>Request changes</Button>
                          <Button size="sm" variant="destructive" onClick={() => decide(r.id, "rejected")}>Reject</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </TabsContent>
            <TabsContent value="reservations" className="space-y-2">
              {res.length === 0 && <Card className="p-8 text-center text-muted-foreground">No Smart Stay reservations yet.</Card>}
              {res.map((r) => (
                <Card key={r.id} className="p-3 text-sm flex flex-wrap justify-between gap-2">
                  <div><div className="font-medium">{r.hotel_name} · {r.room_name} × {r.num_rooms}</div>
                    <div className="text-muted-foreground">{r.check_in} → {r.check_out} · {r.booking?.guest_name} {r.booking?.guest_phone} · {r.booking?.booking_ref}</div></div>
                  <div className="text-right"><Badge variant="outline">{statusText[r.status] ?? r.status}</Badge><div className="text-xs mt-1">{inr(Number(r.amount) + Number(r.tax))}</div></div>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="packages"><PackageBuilder userId={userId} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
