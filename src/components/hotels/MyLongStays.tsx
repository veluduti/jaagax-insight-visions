import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadMyLongStays, payLongStay } from "@/services/hospitality/longStayBookingService";

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment", active: "Confirmed", notice: "On notice", moved_out: "Moved out", manual_review: "Being reviewed",
};

/** Customer's PG / Hostel / Co-living rentals with rent history. */
export default function MyLongStays() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = () => loadMyLongStays().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  if (!rows?.length) return null;

  return (
    <div className="mb-6 space-y-3">
      <h2 className="text-lg font-semibold">My long stays</h2>
      {rows.map((s) => {
        const holdOk = s.status === "pending_payment" && s.hold_expires_at && new Date(s.hold_expires_at) > new Date();
        if (s.status === "pending_payment" && !holdOk) return null;
        return (
          <Card key={s.id}>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.partner_hotels?.name ?? "Property"} · {s.unit_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.booking_ref} · Move-in {s.move_in} → {s.move_out} · {s.duration} {s.rent_plan === "weekly" ? "week" : "month"}(s) · {s.occupants} {s.occupants > 1 ? "people" : "person"}
                  </p>
                </div>
                <Badge variant={s.status === "active" ? "default" : "outline"}>{LABEL[s.status] ?? s.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                <span>Paid at booking: <b className="text-foreground">{inr(s.amount_due)}</b></span>
                {Number(s.advance) > 0 && <span>Advance: {inr(s.advance)}</span>}
                {Number(s.deposit) > 0 && <span>Deposit (refundable): {inr(s.deposit)}</span>}
                {s.quote?.recurring && <span>Rent: {inr(s.quote.recurring)}/{s.rent_plan === "weekly" ? "week" : "month"}</span>}
              </div>
              {s.dues?.length > 0 && (
                <div className="rounded-md border border-border/60 p-2 text-xs">
                  {s.dues.map((d: any) => (
                    <div key={d.period_month} className="flex justify-between">
                      <span>{d.period_month.slice(0, 7)} · due {d.due_date}</span>
                      <span>{inr(d.amount)} · {d.status === "paid" ? "Paid" : "Due"}</span>
                    </div>
                  ))}
                </div>
              )}
              {holdOk && (
                <Button size="sm" onClick={() => payLongStay(s.id, s.unit_label, {}).then(() => { toast.success("Payment done"); load(); }).catch((e) => toast.error(e.message))}>
                  Complete payment
                </Button>
              )}
              {s.status === "active" && <p className="text-xs text-muted-foreground">To extend or give notice, message the property from this page or call them.</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
