import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, Utensils, Receipt, MessageSquareText, Sparkles, Info } from "lucide-react";
import { getHotelCanonical } from "@/services/hotelChannelService";
import { boardLabel, type CanonicalProperty, type CanonicalRatePlan, type CanonicalRoom, type CanonicalTaxFee, type CanonicalCancellationPolicy } from "@/types/hotelCanonical";

interface Props {
  hotelId: string;
  roomId: string;
  ratePlanId?: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  /** Called once the matching rate is resolved (or null when unavailable). */
  onResolved?: (r: { plan: CanonicalRatePlan | null; room: CanonicalRoom | null; error: string | null }) => void;
}

const money = (n: number | null | undefined, cur?: string | null) =>
  n == null ? "—" : `${cur && cur !== "INR" ? cur + " " : "₹"}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Taxes/fees with relation "display" (or naming the property) are collected by the hotel, not by us. */
export const isPayAtProperty = (t: CanonicalTaxFee) =>
  /display|property|hotel|pay_?at/i.test(`${t.relation ?? ""} ${t.scope ?? ""}`);

function describePolicy(p: CanonicalCancellationPolicy, checkIn: string) {
  let deadline: string | null = null;
  const days = p.daysBefore ?? (p.timeFromCheckInType?.toLowerCase().startsWith("day") ? p.timeFromCheckIn : null);
  const hours = p.timeFromCheckInType?.toLowerCase().startsWith("hour") ? p.timeFromCheckIn : null;
  if (checkIn && (days != null || hours != null)) {
    const d = new Date(`${checkIn}T${p.cancellationDeadlineHour || "00:00"}`);
    if (days != null) d.setDate(d.getDate() - Number(days));
    if (hours != null) d.setHours(d.getHours() - Number(hours));
    if (!isNaN(+d)) deadline = d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  const type = (p.penaltyType || "").toLowerCase();
  const charge =
    p.amount == null ? "a cancellation charge"
      : type.includes("percent") ? `${p.amount}% of the booking`
      : type.includes("night") ? `${p.amount} night${p.amount === 1 ? "" : "s"}`
      : money(p.amount, p.currency);
  return deadline ? `From ${deadline}: ${charge}` : `Charge: ${charge}`;
}

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <h4 className="text-sm font-semibold flex items-center gap-2">{icon}{title}</h4>
    <div className="text-sm text-muted-foreground space-y-1">{children}</div>
  </div>
);

const amenityList = (a: unknown): string[] =>
  Array.isArray(a) ? a.map(String) : a && typeof a === "object" ? Object.entries(a as any).filter(([, v]) => v).map(([k]) => k) : [];

/**
 * Shows the live rate details for the selected room + rate plan, exactly as
 * the hotel search returned them (HyperGuest or direct). Nothing is invented:
 * missing information is labelled as not provided.
 */
const RateDetailsPanel = ({ hotelId, roomId, ratePlanId, checkIn, checkOut, adults, children, rooms, onResolved }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prop, setProp] = useState<CanonicalProperty | null>(null);
  const [room, setRoom] = useState<CanonicalRoom | null>(null);
  const [plan, setPlan] = useState<CanonicalRatePlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const p = await getHotelCanonical(hotelId, { check_in: checkIn, check_out: checkOut, adults, children, rooms });
        const r = p?.rooms.find((x) => x.jaagaRoomId === roomId || x.roomId === roomId) ?? null;
        const rp = r?.ratePlans.find((x) => ratePlanId && (x.jaagaRatePlanId === ratePlanId || x.ratePlanId === ratePlanId))
          ?? r?.ratePlans[0] ?? null;
        if (cancelled) return;
        setProp(p); setRoom(r); setPlan(rp);
        const err = !r ? "This room is no longer available for your dates." : null;
        setError(err);
        onResolved?.({ plan: rp, room: r, error: err });
      } catch (e: any) {
        if (cancelled) return;
        setError("We couldn't load the latest rate details. Please try again.");
        onResolved?.({ plan: null, room: null, error: e?.message ?? "load failed" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, roomId, ratePlanId, checkIn, checkOut, adults, children, rooms]);

  if (loading) return <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">Loading rate details…</div>;
  if (error) return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{error}
    </div>
  );

  const sell = plan?.prices.find((p) => p.priceType === "sell") ?? plan?.prices[0] ?? null;
  const all: CanonicalTaxFee[] = [...(plan?.taxes ?? []), ...(plan?.fees ?? [])];
  const included = all.filter((t) => !isPayAtProperty(t));
  const atHotel = all.filter(isPayAtProperty);
  const policies = plan?.cancellationPolicies ?? [];
  const refundable = plan?.jaaga?.isRefundable ?? (policies.length ? policies.some((p) => (p.daysBefore ?? p.timeFromCheckIn ?? 0) > 0) : null);
  const hotelRemarks = prop?.remarks ?? [];
  const rateRemarks = plan?.remarks ?? [];
  const hotelFacilities = prop?.jaaga?.amenities ?? [];
  const roomFacilities = amenityList(room?.jaaga?.amenities);
  const source = plan?.source ?? prop?.source;

  return (
    <div className="rounded-lg border border-border/60 p-4 space-y-4" data-testid="rate-details">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Rate details · {plan?.ratePlanName || room?.roomName || "Selected rate"}</h3>
        {source && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{source}</span>}
      </div>

      <Section icon={<Utensils className="h-4 w-4 text-primary" />} title="Meal plan">
        <p>{plan?.board ? boardLabel(plan.board) : "Not provided by the hotel"}</p>
      </Section>

      <Section icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Cancellation policy">
        {refundable != null && (
          <p className={refundable ? "text-emerald-500 font-medium" : "text-destructive font-medium"}>
            {refundable ? "Refundable" : "Non-refundable"}
          </p>
        )}
        {policies.length ? policies.map((p, i) => <p key={i}>• {describePolicy(p, checkIn)}</p>)
          : <p>The hotel hasn't shared a cancellation policy for this rate. Please contact us before booking if this matters to you.</p>}
      </Section>

      <Section icon={<Receipt className="h-4 w-4 text-primary" />} title="Price, taxes and fees">
        {sell && <div className="flex justify-between"><span>Room price</span><span>{money(sell.price, sell.currency)}</span></div>}
        {included.map((t, i) => (
          <div key={`i${i}`} className="flex justify-between"><span>{t.name || t.code || "Tax/fee"} (included)</span><span>{money(t.amount, t.currency)}</span></div>
        ))}
        {atHotel.length > 0 && <p className="pt-1 font-medium text-foreground">Payable at the property</p>}
        {atHotel.map((t, i) => (
          <div key={`h${i}`} className="flex justify-between"><span>{t.name || t.code || "Tax/fee"}</span><span>{money(t.amount, t.currency)}</span></div>
        ))}
        {!all.length && <p>No separate taxes or fees were provided for this rate; the total shown is what you pay.</p>}
      </Section>

      {(hotelRemarks.length > 0 || rateRemarks.length > 0) && (
        <Section icon={<MessageSquareText className="h-4 w-4 text-primary" />} title="Remarks">
          {hotelRemarks.length > 0 && <p className="font-medium text-foreground">About the hotel</p>}
          {hotelRemarks.map((r, i) => <p key={`hr${i}`}>• {typeof r === "string" ? r : (r as any)?.remark ?? (r as any)?.text ?? JSON.stringify(r)}</p>)}
          {rateRemarks.length > 0 && <p className="font-medium text-foreground pt-1">About this rate</p>}
          {rateRemarks.map((r, i) => <p key={`rr${i}`}>• {r}</p>)}
        </Section>
      )}

      {(hotelFacilities.length > 0 || roomFacilities.length > 0) && (
        <Section icon={<Sparkles className="h-4 w-4 text-primary" />} title="Facilities">
          {hotelFacilities.length > 0 && <p><span className="text-foreground">Hotel:</span> {hotelFacilities.join(", ")}</p>}
          {roomFacilities.length > 0 && <p><span className="text-foreground">Room:</span> {roomFacilities.join(", ")}</p>}
        </Section>
      )}

      <p className="text-[11px] text-muted-foreground flex gap-1"><Info className="h-3 w-3 mt-0.5" />Details as provided by the hotel for {checkIn} to {checkOut}.</p>
    </div>
  );
};

export default RateDetailsPanel;
