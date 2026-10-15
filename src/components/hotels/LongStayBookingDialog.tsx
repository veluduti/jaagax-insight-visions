import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireSignIn } from "@/lib/requireSignIn";
import { quoteLongStay, reserveLongStay, payLongStay, type ServerQuote } from "@/services/hospitality/longStayBookingService";
import { freeUnits } from "@/services/hospitality/availabilityService";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Move-out (exclusive). Monthly = calendar months, clamped to month end (Jan 31 → Feb 28/29), same as the server. Weekly = 7 days × n. */
export function longStayMoveOut(moveIn: string, plan: "weekly" | "monthly", duration: number): string {
  if (!moveIn) return "";
  const [y, m, d] = moveIn.split("-").map(Number);
  let out: Date;
  if (plan === "monthly") {
    const tm = m - 1 + duration;
    const last = new Date(Date.UTC(y, tm + 1, 0)).getUTCDate();
    out = new Date(Date.UTC(y, tm, Math.min(d, last)));
  } else {
    out = new Date(Date.UTC(y, m - 1, d + 7 * duration));
  }
  return out.toISOString().slice(0, 10);
}
const fmtDate = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function LongStayBookingDialog({ open, onOpenChange, room, hotelName, isBed }: {
  open: boolean; onOpenChange: (v: boolean) => void; hotelName: string; isBed: boolean;
  room: { id: string; room_type: string; weekly_price?: number | null; monthly_price?: number | null; attributes?: any; max_occupancy?: number | null };
}) {
  const nav = useNavigate();
  const hasMonthly = Number(room.monthly_price) > 0 || Number(room.weekly_price) > 0;
  const hasWeekly = Number(room.weekly_price) > 0;
  const minMonths = Math.max(1, Number(room.attributes?.min_months) || 1);
  const [plan, setPlan] = useState<"weekly" | "monthly">(hasMonthly ? "monthly" : "weekly");
  const [duration, setDuration] = useState(plan === "monthly" ? minMonths : 1);
  const [occupants, setOccupants] = useState(1);
  const [moveIn, setMoveIn] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [requests, setRequests] = useState("");
  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail((v) => v || user.email || "");
      setPhone((v) => v || user.phone || (user.user_metadata as any)?.phone || "");
      setName((v) => v || (user.user_metadata as any)?.full_name || "");
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setQErr(null);
    quoteLongStay(room.id, plan, duration, occupants).then((q) => alive && setQuote(q)).catch((e) => { if (alive) { setQuote(null); setQErr(e.message); } });
    return () => { alive = false; };
  }, [open, room.id, plan, duration, occupants]);

  const moveOut = longStayMoveOut(moveIn, plan, duration);
  const [free, setFree] = useState<number | null>(null);
  useEffect(() => {
    if (!open || !moveIn || !moveOut) { setFree(null); return; }
    let alive = true;
    freeUnits(room.id, moveIn, moveOut).then((n) => alive && setFree(n)).catch(() => alive && setFree(null));
    return () => { alive = false; };
  }, [open, room.id, moveIn, moveOut]);
  const unavailable = free !== null && free < occupants;

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { requireSignIn(nav, () => {}, "Please sign in to book a long stay"); return; }
    if (!moveIn) return toast.error("Choose your move-in date");
    if (!name.trim()) return toast.error("Enter the tenant's name");
    if (phone && !/^\+?[0-9 ]{10,15}$/.test(phone.trim())) return toast.error("Enter a valid phone number");
    setBusy(true);
    try {
      const res = await reserveLongStay({ room_id: room.id, move_in: moveIn, plan, duration, occupants, name, phone, email, requests });
      const ref = await payLongStay(res.stay_id, `${hotelName} · ${room.room_type}`, { name, email, contact: phone });
      toast.success(`Booked! Reference ${ref}. Move-in ${moveIn}.`);
      onOpenChange(false);
      nav("/my-trips");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const per = plan === "monthly" ? "month" : "week";
  const chip = (a: boolean) => `rounded-full border px-3 py-1.5 text-xs font-medium ${a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Book long stay · {room.room_type}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Move-in date</Label>
              <Input type="date" min={today()} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
            </div>
            <div>
              <Label>{isBed ? "Beds needed" : "Occupants"}</Label>
              <Input type="number" min={1} max={isBed ? 10 : Math.max(1, room.max_occupancy || 1)} value={occupants}
                onChange={(e) => setOccupants(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>
          <div>
            <Label>Rental plan</Label>
            <div className="mt-1 flex gap-2">
              {hasMonthly && <button type="button" className={chip(plan === "monthly")} onClick={() => { setPlan("monthly"); setDuration(minMonths); }}>Monthly</button>}
              {hasWeekly && <button type="button" className={chip(plan === "weekly")} onClick={() => { setPlan("weekly"); setDuration(1); }}>Weekly</button>}
            </div>
          </div>
          <div>
            <Label>Duration ({per}s)</Label>
            <Input type="number" min={plan === "monthly" ? minMonths : 1} max={60} value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))} />
            {plan === "monthly" && minMonths > 1 && <p className="mt-1 text-xs text-muted-foreground">Minimum {minMonths} months.</p>}
          </div>

          <div className="rounded-md border border-border/60 p-3 text-sm">
            {qErr ? <p className="text-destructive">{qErr}</p> : !quote ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="space-y-1">
                <Row l={`Rent (first ${per})`} v={quote.period_rent} />
                {quote.extras > 0 && <Row l={`Utilities / food / services`} v={quote.extras} />}
                {quote.one_time_fees > 0 && <Row l="One-time fees" v={quote.one_time_fees} />}
                {quote.tax > 0 && <Row l={`Tax (${quote.tax_percent}%)`} v={quote.tax} />}
                {quote.advance > 0 && <Row l="Advance rent (adjusted later)" v={quote.advance} />}
                {quote.deposit > 0 && <Row l="Security deposit (refundable)" v={quote.deposit} />}
                <div className="flex justify-between border-t border-border/60 pt-1 font-semibold"><span>Pay now</span><span>{inr(quote.due_at_booking)}</span></div>
                {quote.duration > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Then {inr(quote.recurring)} per {per} for {quote.duration - 1} more {per}{quote.duration > 2 ? "s" : ""} ({inr(quote.recurring * (quote.duration - 1))} total), paid to the property.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Tenant name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div>
            <Label>Special requests</Label>
            <Textarea rows={2} maxLength={1000} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="e.g. lower bunk, vegetarian food" />
            <p className="mt-1 text-xs text-muted-foreground">The property will confirm requests; they aren't guaranteed.</p>
          </div>
          <Button className="w-full" disabled={busy || !quote || !!qErr} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${quote ? inr(quote.due_at_booking) : ""} & book`}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">Your bed/room is held for 20 minutes while you pay.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ l, v }: { l: string; v: number }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{inr(v)}</span></div>;
}
