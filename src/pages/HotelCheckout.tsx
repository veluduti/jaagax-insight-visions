import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ShieldCheck, CalendarDays, Users, BedDouble, CreditCard, Lock, ArrowRight, Sparkles, User, FileText } from "lucide-react";
import { BookingStepper, HotelHeroHeader, WhyBookCard, TrustStrip, PaymentBadges, useHotelReviewStats } from "@/components/hotels/booking/BookingFlowChrome";
import { toast } from "sonner";
import { resolveHotelImages } from "@/lib/hotelImage";
import { useHotelPricingConfig, useLivePrice } from "@/hooks/useHotelPricing";
import { MealSelector, ExtraBedSelector, PriceBreakdown } from "@/components/hotels/BookingPricingControls";
import type { MealType } from "@/lib/hotelPricing";
import { useRequireAuth } from "@/components/auth/RequireAuthProvider";
import RateDetailsPanel from "@/components/hotels/RateDetailsPanel";

/** Turn backend booking errors into clear guest-facing messages. */
function friendlyBookingError(raw?: string | null) {
  const m = (raw || "").toLowerCase();
  if (/just booked|not available|no availability|sold out|stop.?sell|inventory/.test(m)) return "Sorry, this room is no longer available for your dates. Please pick another room or dates.";
  if (/price.*chang|expired|rate.*(no longer|invalid)/.test(m)) return "The price for this room has changed or expired. Please go back and review the latest price.";
  if (/timeout|timed out|network|fetch/.test(m)) return "The hotel took too long to respond. Please try again — you won't be charged twice.";
  if (/min.*night/.test(m)) return raw || "Please check the minimum stay.";
  return raw || "Could not start payment. Please try again.";
}


declare global {
  interface Window { Razorpay?: any }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const razorpayCheckoutConfig = {
  method: {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
    emi: true,
    paylater: true,
  },
  config: {
    display: {
      blocks: {
        allMethods: {
          name: "All payment options",
          instruments: [
            { method: "card" },
            { method: "netbanking" },
            { method: "wallet" },
            { method: "emi" },
            { method: "paylater" },
            { method: "upi" },
          ],
        },
      },
      sequence: ["block.allMethods"],
      preferences: { show_default_blocks: true },
    },
  },
};

type Step = "guest" | "pay";

interface RoomRow {
  id: string; room_type: string; base_price: number;
  photos: string[] | null; bed_type: string | null; max_occupancy: number;
}
interface HotelRow {
  id: string; name: string; city: string; locality: string;
  images: string[] | null; address: string | null;
  star_rating?: number | null; total_rooms?: number | null; amenities?: string[] | null;
  check_in_time?: string | null; check_out_time?: string | null;
}

const HotelCheckout = () => {
  const { id: hotelId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const roomId = params.get("room") || "";
  const checkIn = params.get("checkin") || "";
  const checkOut = params.get("checkout") || "";
  const adults = Math.max(1, Number(params.get("adults") || 2));
  const children = Math.max(0, Number(params.get("children") || 0));
  const numRooms = Math.max(1, Number(params.get("rooms") || 1));
  const ratePlanId = params.get("rate_plan") || null;

  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [step, setStep] = useState<Step>("guest");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState<string>("upi");

  const { isAuthenticated, openAuthPopup } = useRequireAuth();
  const reviewStats = useHotelReviewStats(hotelId);

  // Only signed-in users may reach checkout: bounce guests with a sign-in prompt.
  useEffect(() => {
    if (isAuthenticated) return;
    toast.error("Please sign in to continue booking");
    openAuthPopup({
      title: "Sign in to book",
      message: "You need to sign in to complete your hotel booking.",
    });
    navigate(hotelId ? `/hotels/${hotelId}` : "/hotels", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const childAgeList = (params.get("childAges") || "").split(",").filter(Boolean).map(Number);
  // Companion guests (everyone except the lead), spread across rooms.
  const companionSlots = useMemo(() => {
    const slots: { type: "adult" | "child"; room: number; age?: number }[] = [];
    for (let i = 1; i < adults; i++) slots.push({ type: "adult", room: (i % numRooms) + 1 });
    for (let i = 0; i < children; i++) slots.push({ type: "child", room: (i % numRooms) + 1, age: childAgeList[i] });
    return slots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults, children, numRooms]);
  const [companions, setCompanions] = useState<{ first_name: string; last_name: string }[]>([]);
  useEffect(() => { setCompanions((c) => companionSlots.map((_, i) => c[i] || { first_name: "", last_name: "" })); }, [companionSlots]);
  useEffect(() => { setGuestName(`${firstName} ${lastName}`.trim()); }, [firstName, lastName]);
  const [rateIssue, setRateIssue] = useState<string | null>("Checking your selected rate…");

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(1, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86400000));
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!hotelId || !roomId || !checkIn || !checkOut) {
      toast.error("Missing booking details");
      navigate(`/hotels/${hotelId || ""}`);
      return;
    }
    (async () => {
      setLoading(true);
      const [{ data: h }, { data: r }] = await Promise.all([
        supabase.from("partner_hotels").select("id,name,city,locality,images,address,star_rating,total_rooms,amenities,check_in_time,check_out_time").eq("id", hotelId).maybeSingle(),
        supabase.from("hotel_rooms").select("id,room_type,base_price,photos,bed_type,max_occupancy").eq("id", roomId).maybeSingle(),
      ]);
      const resolvedHotel = h ? { ...h, images: await resolveHotelImages((h as any).images) } : null;
      setHotel(resolvedHotel as any); setRoom(r as any);

      // Occupancy guard — never allow a booking the room type cannot host.
      const capacity = (Number((r as any)?.max_occupancy) || 0) * numRooms;
      if (r && capacity > 0 && capacity < adults + children) {
        toast.error("This room type cannot accommodate the selected number of guests.");
        navigate(`/hotels/${hotelId}`);
        return;
      }


      const { data: q } = await supabase.functions.invoke("booking-engine-quote", {
        body: { hotel_id: hotelId, room_id: roomId, rate_plan_id: ratePlanId, check_in: checkIn, check_out: checkOut, guests: adults + children },
      });
      setQuote(q);

      // Prefill from URL params first (from HotelBookingModal), then user profile
      const qName = params.get("name") || "";
      const qEmail = params.get("email") || "";
      const qPhone = params.get("phone") || "";
      const qNotes = params.get("notes") || "";
      const splitName = (n: string) => { const [f, ...r] = n.trim().split(/\s+/); setFirstName(f || ""); setLastName(r.join(" ")); };
      if (qName) splitName(qName);
      if (qEmail) setGuestEmail(qEmail);
      if (qPhone) setGuestPhone(qPhone);
      if (qNotes) setSpecialRequests(qNotes);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (!qEmail) setGuestEmail(user.email || "");
        const { data: p } = await supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle();
        if (!qName && p?.full_name) splitName(p.full_name);
        if (!qPhone && (p as any)?.phone) setGuestPhone((p as any).phone);
      }
      setLoading(false);
    })();
  }, [hotelId, roomId, checkIn, checkOut, adults, children, navigate]);

  // Hotel meal / extra-bed / rate configuration for this room.
  const config = useHotelPricingConfig(hotelId, roomId);
  // Selections carried over from the booking modal (never a hard-coded default).
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(
    (params.get("meals") || "").split(",").filter(Boolean) as MealType[],
  );
  const [extraBeds, setExtraBeds] = useState(Math.max(0, Number(params.get("beds") || 0)));

  const { price: livePrice, error: liveError } = useLivePrice({
    room: config.room,
    meals: config.meals,
    rateCalendar: config.rateCalendar,
    gstRate: config.gstRate,
    checkIn, checkOut, adults, children, numRooms, extraBeds,
    selectedMeals,
    addons: [],
    discount: 0,
  });

  const toggleMeal = (m: MealType) =>
    setSelectedMeals((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  // Re-quote from the server whenever the selection changes — backend stays authoritative.
  useEffect(() => {
    if (!hotelId || !roomId || !checkIn || !checkOut) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("booking-engine-quote", {
        body: {
          hotel_id: hotelId, room_id: roomId, rate_plan_id: ratePlanId, check_in: checkIn, check_out: checkOut,
          adults, children, guests: adults + children, num_rooms: numRooms,
          extra_beds: extraBeds, meals: selectedMeals,
        },
      });
      if (!cancelled && data && !(data as any).error) setQuote(data);
    })();
    return () => { cancelled = true; };
  }, [hotelId, roomId, ratePlanId, checkIn, checkOut, adults, children, numRooms, extraBeds, selectedMeals.join(",")]);

  const total = Number(quote?.grand_total ?? livePrice?.grandTotal ?? 0);

  // Server quote wins; the local engine only fills the gap while it is in flight.
  const displayPrice = useMemo(() => {
    if (quote?.grand_total != null) {
      return {
        nights: quote.nights ?? nights,
        nightly: quote.nightly ?? [],
        perNight: quote.per_night ?? 0,
        roomCharges: quote.room_charges ?? quote.room_total ?? 0,
        mealBreakdown: quote.meals ?? [],
        mealTotal: quote.meal_total ?? 0,
        extraBedTotal: quote.extra_bed_total ?? 0,
        addonTotal: quote.addon_total ?? 0,
        discount: quote.discount ?? 0,
        taxableSubtotal: quote.taxable_subtotal ?? 0,
        gstRate: quote.gst_rate ?? 0,
        taxAmount: quote.tax_amount ?? 0,
        grandTotal: quote.grand_total ?? 0,
        lineItems: quote.line_items ?? [],
        freeChildren: 0,
      } as any;
    }
    return livePrice;
  }, [quote, livePrice, nights]);



  const validateGuest = () => {
    if (!firstName.trim()) return "Please enter the guest's first name";
    if (!lastName.trim()) return "Please enter the guest's last name";
    if (firstName.length > 60 || lastName.length > 60) return "Names must be under 60 characters";
    if (!/^\S+@\S+\.\S+$/.test(guestEmail.trim())) return "Please enter a valid email";
    if (!/^[+\d][\d\s-]{7,}$/.test(guestPhone.trim())) return "Please enter a valid phone number";
    return null;
  };

  const handlePay = async () => {
    if (liveError) return toast.error(liveError);
    setSubmitting(true);

    try {
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load payment gateway"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      // If the logged-in user is an agent, tag the booking with their agent id
      // so it appears in the agent's dashboard.
      let bookedByAgentId: string | null = null;
      if (user?.id) {
        const { data: agentRow } = await supabase
          .from("agents").select("id").eq("user_id", user.id).maybeSingle();
        if (agentRow?.id) bookedByAgentId = agentRow.id;
      }

      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: {
          hotel_id: hotelId, room_id: roomId, rate_plan_id: ratePlanId,
          check_in: checkIn, check_out: checkOut,
          adults, children, num_rooms: numRooms,
          extra_beds: extraBeds, meals: selectedMeals,

          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim(),
          special_requests: [arrivalTime ? `Expected arrival: ${arrivalTime}` : "", specialRequests.trim()].filter(Boolean).join("\n") || null,
          lead_first_name: firstName.trim(),
          lead_last_name: lastName.trim(),
          guests: companionSlots.map((slot, i) => ({ ...slot, ...companions[i] })).filter((g) => g.first_name?.trim()),
          user_id: user?.id || null,
          booked_by_agent_id: bookedByAgentId,
        },
      });
      if (data?.already_booked && data?.booking_id) {
        toast.info("You already have a confirmed booking for this stay.");
        navigate(`/hotels/booking/${data.booking_id}/confirmed`);
        return;
      }
      if (error || !data?.order_id) {
        let msg = data?.error || "";
        if (!msg && (error as any)?.context?.json) { try { msg = (await (error as any).context.json())?.error || ""; } catch { /* ignore */ } }
        toast.error(friendlyBookingError(msg || error?.message));
        return;
      }

      const rzp = new window.Razorpay({
        ...razorpayCheckoutConfig,
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: hotel?.name || "JAAGA X",
        description: `Booking ${data.booking_reference}`,
        order_id: data.order_id,
        prefill: { name: guestName, email: guestEmail, contact: guestPhone, method: payMethod },
        theme: { color: "#10b981" },
        handler: async (response: any) => {
          const { data: verify, error: vErr } = await supabase.functions.invoke("razorpay-verify-payment", {
            body: {
              booking_id: data.booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
          if (vErr || !verify?.success) {
            toast.error(verify?.error || vErr?.message || "Payment verification failed");
            return;
          }
          navigate(`/hotels/booking/${data.booking_id}/confirmed`);
        },
        modal: {
          ondismiss: () => toast.info("Payment cancelled"),
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        toast.error(resp?.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const fmtDay = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(+d) ? "—" : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); };
  const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
  const perNight = Number(displayPrice?.perNight || 0);
  const roomCharges = Number(displayPrice?.roomCharges || 0);
  const taxAmount = Number(displayPrice?.taxAmount || 0);
  const roomImg = room?.photos?.[0] || hotel?.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400";

  const FALLBACK_ROOM = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400";
  const StayOverview = () => (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-extrabold"><CalendarDays className="h-5 w-5 text-primary" /> Your Stay</h3>
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <Info label="Check-in" value={`${fmtDay(checkIn)}${hotel?.check_in_time ? ` · ${hotel.check_in_time}` : ""}`} />
        <Info label="Check-out" value={`${fmtDay(checkOut)}${hotel?.check_out_time ? ` · ${hotel.check_out_time}` : ""}`} />
        <Info label="Guests" value={`${adults} Adult${adults > 1 ? "s" : ""}${children ? `, ${children} Child${children > 1 ? "ren" : ""}` : ""} · ${numRooms} Room${numRooms > 1 ? "s" : ""}`} />
        <Info label="Duration" value={`${nights} Night${nights > 1 ? "s" : ""}`} />
      </div>
      <div className="mt-3 flex gap-3 border-t border-border pt-3">
        <img src={roomImg} onError={(e) => { e.currentTarget.src = FALLBACK_ROOM; }} alt={room?.room_type || "Room"} className="h-16 w-20 rounded-lg object-cover" />
        <div className="text-sm">
          <p className="font-bold">{room?.room_type}</p>
          {room?.bed_type && <p className="text-muted-foreground">{room.bed_type}{room?.max_occupancy ? ` · Up to ${room.max_occupancy} guests` : ""}</p>}
          {selectedMeals.length > 0 && <p className="text-muted-foreground">With {selectedMeals.join(", ")}</p>}
          {perNight > 0 && <p><b>{inr(perNight)}</b> per night</p>}
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto max-w-7xl px-4 py-4">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate("/")}>Home</button><span>›</span>
          <button onClick={() => navigate("/hotels")}>Jaaga Stays</button><span>›</span>
          <button onClick={() => navigate(`/hotels/${hotelId}?${params}`)}>{hotel?.name}</button><span>›</span>
          <span className="font-semibold text-foreground">Book Your Stay</span>
        </nav>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <HotelHeroHeader name={hotel?.name || ""} image={hotel?.images?.[0] || roomImg} photoCount={hotel?.images?.length || 0} star={Number(hotel?.star_rating) || 0} rooms={Number(hotel?.total_rooms) || 0} amenities={hotel?.amenities || []} address={hotel?.address || [hotel?.locality, hotel?.city].filter(Boolean).join(", ")} verified reviews={reviewStats} />
            <BookingStepper current={step === "guest" ? 1 : 2} />
            <Button variant="ghost" size="sm" onClick={() => navigate(`/hotels/${hotelId}?${params}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Change room or dates
            </Button>

            {step === "guest" && (<>
              {(config.meals.length > 0 || config.room?.extra_bed_allowed) && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-primary"><Sparkles className="h-5 w-5 text-primary" /> Enhance Your Stay (Optional)</h2>
                  <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                    <MealSelector meals={config.meals} selected={selectedMeals} onToggle={toggleMeal} />
                    <ExtraBedSelector room={config.room} value={extraBeds} onChange={setExtraBeds} numRooms={numRooms} />
                  </div>
                </section>
              )}
              <StayOverview />
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-primary"><User className="h-5 w-5 text-primary" /> Guest Details</h2>
                <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="mb-3 font-bold text-foreground">Primary Guest (Room 1)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><Label>First Name <span className="text-destructive">*</span></Label><Input maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="As per ID" /></div>
                      <div><Label>Last Name <span className="text-destructive">*</span></Label><Input maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="As per ID" /></div>
                      <div><Label>Mobile Number <span className="text-destructive">*</span></Label><Input maxLength={20} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+91 98xxxxxxxx" /></div>
                      <div><Label>Email ID <span className="text-destructive">*</span></Label><Input maxLength={255} type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" /></div>
                      <div><Label>Expected Arrival Time (Optional)</Label><Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} /></div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Booking confirmation and voucher will be sent to this email and mobile.</p>
                  </div>
                  {companionSlots.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="mb-1 font-bold text-foreground">Other Guests (Optional)</p>
                      <p className="mb-3 text-xs text-muted-foreground">Add names as on ID so the hotel has your full guest list.</p>
                      <div className="space-y-3">
                        {companionSlots.map((slot, i) => (
                          <div key={i} className="grid items-end gap-3 sm:grid-cols-[150px_1fr_1fr]">
                            <p className="text-sm font-semibold">Room {slot.room} · {slot.type === "child" ? `Child${Number.isFinite(slot.age) ? ` (${slot.age} yrs)` : ""}` : `Adult ${i + 2}`}</p>
                            <Input maxLength={60} placeholder="First name" value={companions[i]?.first_name || ""} onChange={(e) => setCompanions((c) => c.map((g, j) => j === i ? { ...g, first_name: e.target.value } : g))} />
                            <Input maxLength={60} placeholder="Last name" value={companions[i]?.last_name || ""} onChange={(e) => setCompanions((c) => c.map((g, j) => j === i ? { ...g, last_name: e.target.value } : g))} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-primary"><FileText className="h-5 w-5 text-primary" /> Special Requests (Optional)</h2>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <Textarea rows={3} maxLength={300} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="e.g., Early check-in, high floor, extra pillows, anniversary setup, etc." className="border-0 shadow-none focus-visible:ring-0" />
                  <p className="text-right text-xs text-muted-foreground">{specialRequests.length}/300</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Special requests are sent to the hotel and are subject to hotel confirmation.</p>
              </section>
            </>)}

            {step === "pay" && (<>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Pay &amp; Confirm Your Booking</h1>
                  <p className="text-sm text-muted-foreground">You're almost done! Complete your payment to confirm your stay at {hotel?.name}.</p>
                </div>
                <div className="flex items-center gap-2"><Lock className="h-7 w-7 text-primary" /><div><p className="text-sm font-bold">Secure &amp; Encrypted</p><p className="text-[11px] text-muted-foreground">Your payment is 100% safe with Jaaga.</p></div></div>
              </div>
              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-primary"><CalendarDays className="h-5 w-5" /> Your Stay Details</h3>
                <div className="grid gap-2 text-sm sm:grid-cols-5">
                  <PayTile label="Check-in" value={fmtDay(checkIn)} sub={hotel?.check_in_time ? `From ${hotel.check_in_time}` : undefined} />
                  <PayTile label="Check-out" value={fmtDay(checkOut)} sub={hotel?.check_out_time ? `By ${hotel.check_out_time}` : undefined} />
                  <PayTile label="Guests" value={`${adults} Adult${adults > 1 ? "s" : ""}${children ? `, ${children} Child${children > 1 ? "ren" : ""}` : ""}`} />
                  <PayTile label="Room" value={`${numRooms} Room${numRooms > 1 ? "s" : ""}`} />
                  <PayTile label="Nights" value={`${nights} Night${nights > 1 ? "s" : ""}`} />
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-primary"><BedDouble className="h-5 w-5" /> Room &amp; Rate Plan</h3>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <img src={roomImg} onError={(e) => { e.currentTarget.src = FALLBACK_ROOM; }} alt={room?.room_type || "Room"} className="h-28 w-full rounded-xl object-cover sm:w-40" />
                  <div className="flex-1 text-sm">
                    <p className="text-lg font-extrabold text-primary">{room?.room_type}</p>
                    <p className="text-muted-foreground">{[room?.bed_type, room?.max_occupancy ? `Up to ${room.max_occupancy} guests` : ""].filter(Boolean).join(" · ")}</p>
                    <div className="mt-2 inline-block rounded-lg bg-primary/10 px-3 py-2"><p className="font-bold">{selectedMeals.length ? `With ${selectedMeals.join(", ")}` : "Room Only"}</p></div>
                  </div>
                  {perNight > 0 && <div className="text-right"><p className="text-xl font-extrabold">{inr(perNight)}</p><p className="text-xs text-muted-foreground">per night</p></div>}
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-extrabold text-primary"><User className="h-5 w-5" /> Guest Details</h3>
                  <button className="text-sm font-semibold text-primary" onClick={() => setStep("guest")}>Edit</button></div>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <Info label="Primary guest" value={guestName} />
                  <Info label="Mobile" value={guestPhone} />
                  <Info label="Email" value={guestEmail} />
                  {arrivalTime && <Info label="Expected arrival" value={arrivalTime} />}
                  {companions.filter((g) => g.first_name.trim()).length > 0 && <Info label="Other guests" value={companions.filter((g) => g.first_name.trim()).map((g) => `${g.first_name} ${g.last_name}`.trim()).join(", ")} />}
                </div>
                {specialRequests.trim() && <p className="mt-3 rounded-lg bg-muted p-3 text-sm"><b>Special requests:</b> {specialRequests}</p>}
              </section>
              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-primary"><CreditCard className="h-5 w-5" /> Choose Payment Method</h3>
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="bg-primary p-3 text-primary-foreground"><p className="font-bold">Pay Online</p><p className="text-xs opacity-90">(Recommended)</p></div>
                    {PAY_METHODS.map((m) => (
                      <button key={m.id} onClick={() => setPayMethod(m.id)} className={`block w-full border-t border-border p-3 text-left text-sm ${payMethod === m.id ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"}`}>{m.label}</button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="flex items-center gap-2 font-extrabold"><Lock className="h-5 w-5 text-primary" /> Pay Online – Secure &amp; Instant</p>
                    <p className="mb-3 text-xs text-muted-foreground">Complete your booking with your preferred payment method.</p>
                    <div className="space-y-2">
                      {PAY_METHODS.map((m) => (
                        <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${payMethod === m.id ? "border-2 border-primary bg-primary/5" : "border-border"}`}>
                          <input type="radio" name="paymethod" className="accent-primary" checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} />
                          <div><p className="text-sm font-bold">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              <section className="flex flex-col gap-3 rounded-2xl border border-border bg-primary/5 p-4 sm:flex-row sm:items-center">
                <Lock className="h-8 w-8 text-primary" />
                <div className="flex-1"><p className="font-extrabold">Secure Payment</p><p className="text-xs text-muted-foreground">Your payment is protected by SSL encryption and processed by Razorpay (PCI-DSS compliant).</p></div>
                <PaymentBadges />
              </section>
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                <div className="sm:border-r sm:border-border sm:pr-5"><p className="text-xs text-muted-foreground">Amount to Pay</p><p className="text-3xl font-extrabold text-primary">{inr(total)}</p></div>
                <p className="flex-1 text-xs text-muted-foreground">By proceeding, you agree to Jaaga's <a href="/terms" target="_blank" className="text-primary underline">Terms &amp; Conditions</a> and <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>, and the cancellation policy shown for this rate.</p>
                <Button size="lg" className="h-12 font-bold" onClick={handlePay} disabled={submitting || !!rateIssue}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : <><Lock className="mr-1 h-4 w-4" /> Pay {inr(total)} &amp; Confirm Booking <ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </div>
            </>)}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-xl font-extrabold">Your Booking Summary</h3>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                <div><p className="text-[11px] text-muted-foreground">Check-in</p><p className="font-bold">{fmtDay(checkIn)}</p></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-[11px] text-muted-foreground">Check-out</p><p className="font-bold">{fmtDay(checkOut)}</p></div>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />{adults} Adult{adults > 1 ? "s" : ""}{children ? `, ${children} Child${children > 1 ? "ren" : ""}` : ""} · {numRooms} Room{numRooms > 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between"><h3 className="font-extrabold">Selected Room &amp; Rate Plan</h3>
                <button className="text-sm font-semibold text-primary" onClick={() => navigate(`/hotels/${hotelId}?${params}`)}>Change</button></div>
              <div className="flex gap-3">
                <img src={roomImg} onError={(e) => { e.currentTarget.src = FALLBACK_ROOM; }} alt={room?.room_type || "Room"} className="h-16 w-20 rounded-lg object-cover" />
                <div className="text-sm">
                  <p className="font-bold">{room?.room_type}</p>
                  {selectedMeals.length > 0 && <p className="text-muted-foreground">With {selectedMeals.join(", ")}</p>}
                  {perNight > 0 && <p><b>{inr(perNight)}</b> per night</p>}
                  <p className="text-muted-foreground">× {nights} Night{nights > 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-2 text-lg font-extrabold">Price Details</h3>
              {roomCharges > 0 && <div className="flex justify-between text-sm"><span>Room Charges{perNight ? ` (${inr(perNight)} × ${nights} nights)` : ""}</span><span>{inr(roomCharges)}</span></div>}
              <details className="my-2"><summary className="cursor-pointer text-xs text-primary">Full breakdown</summary><PriceBreakdown price={displayPrice} /></details>
              <div className="flex justify-between text-sm"><span>Taxes &amp; Fees{displayPrice?.gstRate ? ` (${displayPrice.gstRate}% GST)` : ""}</span><span>{inr(taxAmount)}</span></div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2"><span className="font-bold">Total Amount</span><span className="text-xl font-extrabold text-primary">{inr(total)}</span></div>
              {liveError && <p className="mt-2 text-xs text-destructive">{liveError}</p>}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5 text-primary" /> Cancellation, Payment &amp; Hotel Policies</h3>
              {hotelId && <div className="mt-2"><RateDetailsPanel hotelId={hotelId} roomId={roomId} ratePlanId={ratePlanId} checkIn={checkIn} checkOut={checkOut} adults={adults} children={children} rooms={numRooms} onResolved={({ error }) => setRateIssue(error)} /></div>}
              {(hotel?.check_in_time || hotel?.check_out_time) && <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {hotel?.check_in_time && <li>Check-in: From {hotel.check_in_time}</li>}
                {hotel?.check_out_time && <li>Check-out: By {hotel.check_out_time}</li>}
              </ul>}
              {rateIssue && <p role="alert" className="mt-2 text-xs text-destructive">{rateIssue}</p>}
            </div>
            {step === "guest" ? (
              <Button size="lg" className="h-12 w-full text-base font-bold" disabled={!!rateIssue} onClick={() => { const err = validateGuest(); if (err) return toast.error(err); setStep("pay"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                Continue to Payment <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            ) : (
              <Button size="lg" className="h-12 w-full text-base font-bold" onClick={handlePay} disabled={submitting || !!rateIssue}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${inr(total)}`}
              </Button>
            )}
            <div className="flex items-center justify-center gap-1 text-sm font-semibold"><Lock className="h-4 w-4 text-primary" /> Secure &amp; Safe Payment</div>
            <PaymentBadges />
            {step === "pay" && <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h3 className="mb-2 font-extrabold text-primary">Important Information</h3><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground"><li>Your booking is confirmed instantly after successful payment.</li><li>Confirmation details are sent to your email and mobile.</li><li>Please carry a valid government ID at check-in.</li></ul></div>}
            <WhyBookCard />
          </aside>
        </div>
        <div className="mt-8"><TrustStrip /></div>
      </div>
      <Footer />
    </div>
  );
};

const PAY_METHODS = [
  { id: "upi", label: "UPI", sub: "Google Pay, PhonePe, Paytm, BHIM UPI" },
  { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay, Amex" },
  { id: "netbanking", label: "Net Banking", sub: "All major banks supported" },
  { id: "wallet", label: "Wallets", sub: "Paytm, Amazon Pay, Mobikwik, etc." },
];
const PayTile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
);
const Info = ({ label, value }: { label: string; value: string }) => (
  <div><div className="text-muted-foreground text-xs">{label}</div><div className="font-medium">{value}</div></div>
);
const Row = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
    <span>{value}</span>
  </div>
);

export default HotelCheckout;
