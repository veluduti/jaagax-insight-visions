import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireSignIn } from "@/lib/requireSignIn";
import { quoteLongStay, reserveLongStay, payLongStay, type ServerQuote } from "@/services/hospitality/longStayBookingService";
import { freeUnits } from "@/services/hospitality/availabilityService";
import LongStayDetails, { type LongStayDetailRoom } from "@/components/hotels/LongStayDetails";
import { customerView } from "@/config/accommodationTypes";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Move-out (exclusive). Monthly = calendar months, clamped to month end, same as the server. Weekly = 7 days × n. */
function longStayMoveOut(moveIn: string, plan: "weekly" | "monthly", duration: number): string {
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

/** Full-page long-stay (Hostel / PG / Co-living) booking — opens from a room card instead of a popup. */
export default function LongStayBooking() {
  const { id: hotelId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomId = searchParams.get("room") || "";
  const nav = useNavigate();

  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<LongStayDetailRoom[]>([]);
  const [room, setRoom] = useState<LongStayDetailRoom | null>(null);
  const [bizTypes, setBizTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!hotelId) return;
      const [{ data: h }, { data: rs }] = await Promise.all([
        supabase.from("partner_hotels").select("name, city, locality, business_types, photos").eq("id", hotelId).maybeSingle(),
        supabase.from("hotel_rooms").select("*").eq("hotel_id", hotelId).eq("is_active", true).order("base_price", { ascending: true }),
      ]);
      setHotel(h);
      setBizTypes(h?.business_types || []);
      const list = (rs || []) as LongStayDetailRoom[];
      setRooms(list);
      if (roomId && list.some((r) => r.id === roomId)) setRoom(list.find((r) => r.id === roomId) || null);
      else if (list.length === 1) { setRoom(list[0]); setSearchParams({ room: list[0].id }, { replace: true }); }
      setLoading(false);
    })();
  }, [hotelId, roomId]);

  // Booking form state
  const hasMonthly = Number(room?.monthly_price) > 0 || Number(room?.weekly_price) > 0;
  const hasWeekly = Number(room?.weekly_price) > 0;
  const minMonths = Math.max(1, Number(room?.attributes?.min_months) || 1);
  const [plan, setPlan] = useState<"weekly" | "monthly">("monthly");
  const [duration, setDuration] = useState(minMonths);
  const [occupants, setOccupants] = useState(1);
  const [moveIn, setMoveIn] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [requests, setRequests] = useState("");
  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail((v) => v || user.email || "");
      setPhone((v) => v || user.phone || (user.user_metadata as any)?.phone || "");
      setName((v) => v || (user.user_metadata as any)?.full_name || "");
    });
  }, []);

  useEffect(() => {
    if (!room) return;
    setPlan(hasMonthly ? "monthly" : "weekly");
    setDuration(hasMonthly ? minMonths : 1);
    setOccupants(1);
    setMoveIn("");
  }, [room?.id]);

  useEffect(() => {
    if (!room || !plan) return;
    let alive = true;
    setQErr(null); setQuote(null);
    quoteLongStay(room.id, plan, duration, occupants).then((q) => alive && setQuote(q))
      .catch((e) => { if (alive) { setQuote(null); setQErr(e.message); } });
    return () => { alive = false; };
  }, [room?.id, plan, duration, occupants]);

  const moveOut = room && moveIn ? longStayMoveOut(moveIn, plan, duration) : "";
  const [free, setFree] = useState<number | null>(null);
  useEffect(() => {
    if (!room || !moveIn || !moveOut) { setFree(null); return; }
    let alive = true;
    freeUnits(room.id, moveIn, moveOut).then((n) => alive && setFree(n)).catch(() => alive && setFree(null));
    return () => { alive = false; };
  }, [room?.id, moveIn, moveOut]);
  const unavailable = free !== null && free < occupants;

  const submit = async () => {
    if (!room) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { requireSignIn(nav, () => {}, "Please sign in to book a long stay"); return; }
    if (!moveIn) return toast.error("Choose your move-in date");
    if (!name.trim()) return toast.error("Enter the tenant's name");
    if (phone && !/^\+?[0-9 ]{10,15}$/.test(phone.trim())) return toast.error("Enter a valid phone number");
    setBusy(true);
    try {
      const res = await reserveLongStay({ room_id: room.id, move_in: moveIn, plan, duration, occupants, name, phone, email, requests });
      const ref = await payLongStay(res.stay_id, `${hotel?.name || "Property"} · ${room.room_type}`, { name, email, contact: phone });
      toast.success(`Booked! Reference ${ref}. Move-in ${moveIn}.`);
      nav("/my-trips");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const per = plan === "monthly" ? "month" : "week";
  const unitBed = room ? customerView(room, bizTypes).kind.unit === "bed" : false;

  if (loading) {
    return <div className="mx-auto flex max-w-3xl items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!hotel) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">This property could not be found.</div>;
  }

  const cover = Array.isArray(hotel.photos) && hotel.photos.length ? hotel.photos[0] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-16 pt-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => nav(`/hotels/${hotelId}`)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to property
      </Button>

      {/* Property header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {cover && <img src={cover} alt={hotel.name} className="h-44 w-full object-cover sm:h-56" />}
        <div className="space-y-1 p-5">
          <h1 className="text-xl font-bold sm:text-2xl">{room ? room.room_type : hotel.name}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {[hotel.locality, hotel.city].filter(Boolean).join(", ") || hotel.name}
          </p>
        </div>
      </div>

      {/* Room selection when no room chosen yet */}
      {!room && (
        <div className="space-y-3">
          <h2 className="font-semibold">Choose your accommodation</h2>
          {rooms.map((r) => {
            const cv = customerView(r, bizTypes);
            return (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <p className="font-medium">{cv.kind.emoji} {r.room_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {cv.monthly ? `₹${cv.monthly.toLocaleString()} / month` : ""}{cv.monthly && cv.weekly ? " · " : ""}
                    {cv.weekly ? `₹${cv.weekly.toLocaleString()} / week` : ""}
                  </p>
                </div>
                <Button size="sm" onClick={() => setSearchParams({ room: r.id })}>Book</Button>
              </div>
            );
          })}
          {rooms.length === 0 && <p className="text-sm text-muted-foreground">No long-stay accommodations published yet.</p>}
        </div>
      )}

      {room && (
        <>
          {/* Stay configuration */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Stay details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ls-movein">Move-in date</Label>
                <Input id="ls-movein" type="date" min={today()} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ls-occupants">{unitBed ? "Beds needed" : "Occupants"}</Label>
                <Input id="ls-occupants" type="number" min={1} max={unitBed ? 10 : Math.max(1, room.max_occupancy || 1)} value={occupants}
                  onChange={(e) => setOccupants(Math.max(1, Number(e.target.value) || 1))} />
              </div>
            </div>
            <div>
              <Label>Rental plan</Label>
              <div className="mt-1 flex gap-2">
                {hasMonthly && <Button type="button" size="sm" variant={plan === "monthly" ? "default" : "outline"} aria-pressed={plan === "monthly"} onClick={() => { setPlan("monthly"); setDuration(minMonths); }}>Monthly</Button>}
                {hasWeekly && <Button type="button" size="sm" variant={plan === "weekly" ? "default" : "outline"} aria-pressed={plan === "weekly"} onClick={() => { setPlan("weekly"); setDuration(1); }}>Weekly</Button>}
              </div>
            </div>
            <div>
              <Label htmlFor="ls-duration">Duration ({per}s)</Label>
              <Input id="ls-duration" type="number" min={plan === "monthly" ? minMonths : 1} max={60} value={duration}
                onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))} />
              {plan === "monthly" && minMonths > 1 && <p className="mt-1 text-xs text-muted-foreground">Minimum {minMonths} months.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <div><p className="text-xs text-muted-foreground">From (move-in)</p><p className="font-semibold">{fmtDate(moveIn)}</p></div>
              <div><p className="text-xs text-muted-foreground">To (move-out)</p><p className="font-semibold">{fmtDate(moveOut)}</p></div>
              <p className="col-span-2 text-xs text-muted-foreground">
                {duration} {per}{duration > 1 ? "s" : ""}{moveIn ? " · move-out date is set automatically" : " · pick a move-in date"}
              </p>
              {unavailable && <p className="col-span-2 text-xs font-medium text-destructive">
                {free === 0 ? "Not available for these dates." : `Only ${free} available for these dates.`} Try another move-in date.
              </p>}
            </div>
          </section>

          {/* Price breakdown */}
          <section className="rounded-2xl border border-border bg-card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Price breakdown</h2>
            {qErr ? <p className="text-destructive">{qErr}</p> : !quote ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="space-y-1">
                <Row l={`Rent (first ${per})`} v={quote.period_rent} />
                {quote.extras > 0 && <Row l="Utilities / food / services" v={quote.extras} />}
                {quote.one_time_fees > 0 && <Row l="One-time fees" v={quote.one_time_fees} />}
                {quote.tax > 0 && <Row l={`Tax (${quote.tax_percent}%)`} v={quote.tax} />}
                {quote.advance > 0 && <Row l="Advance rent (adjusted later)" v={quote.advance} />}
                {quote.deposit > 0 && <Row l={room.attributes?.deposit_refundable === false ? "Security deposit" : "Security deposit (refundable)"} v={quote.deposit} />}
                <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Pay now</span><span>{inr(quote.due_at_booking)}</span></div>
                {quote.duration > 1 && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Then {inr(quote.recurring)} per {per} for {quote.duration - 1} more {per}{quote.duration > 2 ? "s" : ""} ({inr(quote.recurring * (quote.duration - 1))} total), paid to the property.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Full accommodation details & policies */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Accommodation details & rental policies</h2>
            <LongStayDetails room={room} businessTypes={bizTypes} compact />
          </section>

          {/* Guest details */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Tenant details</h2>
            <div>
              <Label htmlFor="ls-name">Tenant name</Label>
              <Input id="ls-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label htmlFor="ls-phone">Phone</Label><Input id="ls-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label htmlFor="ls-email">Email</Label><Input id="ls-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div>
              <Label htmlFor="ls-requests">Special requests</Label>
              <Textarea id="ls-requests" rows={2} maxLength={1000} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="e.g. lower bunk, vegetarian food" />
              <p className="mt-1 text-xs text-muted-foreground">The property will confirm requests; they aren't guaranteed.</p>
            </div>
            <Button className="w-full" disabled={busy || !quote || !!qErr || unavailable || !moveIn} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${quote ? inr(quote.due_at_booking) : ""} & book`}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Your bed/room is held for 20 minutes while you pay.</p>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ l, v }: { l: string; v: number }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{inr(v)}</span></div>;
}
