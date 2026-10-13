import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ITEMS = [
  { key: "cancellation", title: "Cancellation policies", how: "At checkout review, deadlines, refundable status and charges match the selected rate." },
  { key: "board", title: "Board bases", how: "Meal plan shown on each rate matches what HyperGuest returned." },
  { key: "taxes", title: "Taxes and fees", how: "Room price, included taxes/fees and pay-at-property amounts are listed separately and the total matches." },
  { key: "remarks", title: "Remarks", how: "Hotel remarks and rate remarks are shown separately before payment." },
  { key: "special_requests", title: "Special requests", how: "Request entered at checkout appears on the booking sent to HyperGuest." },
  { key: "photos", title: "Photos", how: "Hotel and room photos load on desktop and mobile; missing ones show a placeholder." },
  { key: "facilities", title: "Facilities", how: "Hotel facilities and room facilities are shown separately." },
  { key: "e2e", title: "End-to-end booking flow", how: "Search → details → room/rate → review → pay → confirmation → appears in My Bookings; retry does not double-book." },
];
type Status = "pending" | "passed" | "failed";
type Row = { status: Status; notes: string };

const HyperGuestCertification = () => {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).from("hyperguest_cert_checks").select("*").then(({ data }: any) => {
      const m: Record<string, Row> = {};
      (data ?? []).forEach((r: any) => (m[r.item_key] = { status: r.status, notes: r.notes ?? "" }));
      setRows(m);
    });
  }, []);

  const save = async (key: string, patch: Partial<Row>) => {
    const next = { ...(rows[key] ?? { status: "pending", notes: "" }), ...patch } as Row;
    setRows((r) => ({ ...r, [key]: next }));
    setSaving(key);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("hyperguest_cert_checks").upsert({
      item_key: key, status: next.status, notes: next.notes || null, updated_by: user?.id ?? null, updated_at: new Date().toISOString(),
    });
    setSaving(null);
    if (error) toast.error("Couldn't save: " + error.message);
  };

  const downloadLogs = async () => {
    const [{ data: logs, error }, { data: bookings }] = await Promise.all([
      (supabase as any).from("channel_api_payloads").select("created_at,operation,endpoint,http_status,request_id,error_message,request_payload,response_payload").eq("channel", "hyperguest").order("created_at", { ascending: true }).limit(1000),
      (supabase as any).from("hyperguest_bookings").select("agency_reference,hg_booking_id,test_label,status,check_in,check_out,rooms,total_amount,total_currency,created_at,cancelled_at").order("created_at"),
    ]);
    if (error) return toast.error("Couldn't load logs: " + error.message);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), bookings, logs }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `hyperguest-cert-logs-${Date.now()}.json`; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">HyperGuest Stage 2 checklist</h1>
        <p className="text-sm text-muted-foreground">Each item stays Pending until a tester checks it by hand and marks it.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><a href="/hotels/hyperguest/19912" target="_blank" rel="noreferrer">Open certification property 19912</a></Button>
          <Button variant="outline" onClick={downloadLogs}>Download booking logs (search → cancel)</Button>
        </div>
        {ITEMS.map((it) => {
          const r = rows[it.key] ?? { status: "pending" as Status, notes: "" };
          return (
            <Card key={it.key}><CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{it.title}</h2>
                  <p className="text-xs text-muted-foreground">{it.how}</p>
                </div>
                <Badge variant={r.status === "passed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["pending", "passed", "failed"] as Status[]).map((s) => (
                  <Button key={s} size="sm" variant={r.status === s ? "default" : "outline"} disabled={saving === it.key}
                    onClick={() => save(it.key, { status: s })} className="capitalize">{s}</Button>
                ))}
              </div>
              <Textarea rows={2} placeholder="Notes (optional)" defaultValue={r.notes}
                onBlur={(e) => e.target.value !== r.notes && save(it.key, { notes: e.target.value })} />
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
};

export default HyperGuestCertification;
