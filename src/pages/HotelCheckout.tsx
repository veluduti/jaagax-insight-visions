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
import { Loader2, ArrowLeft, ShieldCheck, CalendarDays, Users, BedDouble, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { resolveHotelImages } from "@/lib/hotelImage";
import { useHotelPricingConfig, useLivePrice } from "@/hooks/useHotelPricing";
import { MealSelector, ExtraBedSelector, PriceBreakdown } from "@/components/hotels/BookingPricingControls";
import type { MealType } from "@/lib/hotelPricing";


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

type Step = "guest" | "summary" | "pay";

interface RoomRow {
  id: string; room_type: string; base_price: number;
  photos: string[] | null; bed_type: string | null; max_occupancy: number;
}
interface HotelRow {
  id: string; name: string; city: string; locality: string;
  images: string[] | null; address: string | null;
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

  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [step, setStep] = useState<Step>("guest");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

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
        supabase.from("partner_hotels").select("id,name,city,locality,images,address").eq("id", hotelId).maybeSingle(),
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
        body: { hotel_id: hotelId, room_id: roomId, check_in: checkIn, check_out: checkOut, guests: adults + children },
      });
      setQuote(q);

      // Prefill from URL params first (from HotelBookingModal), then user profile
      const qName = params.get("name") || "";
      const qEmail = params.get("email") || "";
      const qPhone = params.get("phone") || "";
      const qNotes = params.get("notes") || "";
      if (qName) setGuestName(qName);
      if (qEmail) setGuestEmail(qEmail);
      if (qPhone) setGuestPhone(qPhone);
      if (qNotes) setSpecialRequests(qNotes);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (!qEmail) setGuestEmail(user.email || "");
        const { data: p } = await supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle();
        if (!qName && p?.full_name) setGuestName(p.full_name);
        if (!qPhone && (p as any)?.phone) setGuestPhone((p as any).phone);
      }
      setLoading(false);
    })();
  }, [hotelId, roomId, checkIn, checkOut, adults, children, navigate]);

  // Hotel meal / extra-bed / rate configuration for this room.
  const config = useHotelPricingConfig(hotelId, roomId);
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>([]);
  const [extraBeds, setExtraBeds] = useState(0);

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
          hotel_id: hotelId, room_id: roomId, check_in: checkIn, check_out: checkOut,
          adults, children, guests: adults + children, num_rooms: numRooms,
          extra_beds: extraBeds, meals: selectedMeals,
        },
      });
      if (!cancelled && data && !(data as any).error) setQuote(data);
    })();
    return () => { cancelled = true; };
  }, [hotelId, roomId, checkIn, checkOut, adults, children, numRooms, extraBeds, selectedMeals.join(",")]);

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
    if (!guestName.trim() || guestName.trim().length < 2) return "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(guestEmail.trim())) return "Please enter a valid email";
    if (!/^[+\d][\d\s-]{7,}$/.test(guestPhone.trim())) return "Please enter a valid phone number";
    return null;
  };

  const handlePay = async () => {
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
          hotel_id: hotelId, room_id: roomId,
          check_in: checkIn, check_out: checkOut,
          adults, children, num_rooms: numRooms,
          extra_beds: extraBeds, meals: selectedMeals,

          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim(),
          special_requests: specialRequests.trim() || null,
          user_id: user?.id || null,
          booked_by_agent_id: bookedByAgentId,
        },
      });
      if (error || !data?.order_id) {
        toast.error(data?.error || error?.message || "Could not start payment");
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
        prefill: { name: guestName, email: guestEmail, contact: guestPhone },
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          {(["guest", "summary", "pay"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                ${step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={step === s ? "font-medium" : "text-muted-foreground"}>
                {s === "guest" ? "Guest details" : s === "summary" ? "Review" : "Payment"}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {step === "guest" && (
              <Card><CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Guest details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Full name *</Label>
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="As per ID" /></div>
                  <div><Label>Phone *</Label>
                    <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+91 98xxxxxxxx" /></div>
                  <div className="sm:col-span-2"><Label>Email *</Label>
                    <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" /></div>
                  <div className="sm:col-span-2"><Label>Special requests</Label>
                    <Textarea rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Early check-in, high floor, etc. (subject to availability)" /></div>
                </div>

                {(config.meals.length > 0 || config.room?.extra_bed_allowed) && (
                  <div className="space-y-4 rounded-lg border border-border/60 p-4">
                    <h3 className="text-sm font-semibold">Meals & extra beds</h3>
                    <MealSelector meals={config.meals} selected={selectedMeals} onToggle={toggleMeal} />
                    <ExtraBedSelector room={config.room} value={extraBeds} onChange={setExtraBeds} numRooms={numRooms} />
                  </div>
                )}

                <Button className="w-full" onClick={() => {
                  const err = validateGuest();
                  if (err) return toast.error(err);
                  setStep("summary");
                }}>Continue to review</Button>
              </CardContent></Card>
            )}

            {step === "summary" && (
              <Card><CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Review your booking</h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Info label="Guest" value={guestName} />
                  <Info label="Contact" value={`${guestEmail} · ${guestPhone}`} />
                  <Info label="Check-in" value={checkIn} />
                  <Info label="Check-out" value={checkOut} />
                  <Info label="Guests" value={`${adults} adult${adults>1?"s":""}${children?`, ${children} child`:""}`} />
                  <Info label="Rooms" value={String(numRooms)} />
                </div>
                {specialRequests && (
                  <div className="text-sm">
                    <div className="text-muted-foreground">Special requests</div>
                    <div>{specialRequests}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("guest")}>Back</Button>
                  <Button className="flex-1" onClick={() => setStep("pay")}>Continue to payment</Button>
                </div>
              </CardContent></Card>
            )}

            {step === "pay" && (
              <Card><CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Payment
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Secure payment via Razorpay · UPI, Cards, Netbanking
                </p>
                <div className="rounded-lg bg-muted p-4 text-sm">
                  You'll be charged <b>₹{total.toLocaleString()}</b> for {nights} night{nights>1?"s":""} × {numRooms} room{numRooms>1?"s":""}.
                  Free cancellation policies (if any) apply per hotel rules.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("summary")} disabled={submitting}>Back</Button>
                  <Button className="flex-1" onClick={handlePay} disabled={submitting}>
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : `Pay ₹${total.toLocaleString()}`}
                  </Button>
                </div>
              </CardContent></Card>
            )}
          </div>

          {/* Summary sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24"><CardContent className="p-5 space-y-4">
              <div className="flex gap-3">
                <img src={hotel?.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200"}
                  className="w-20 h-20 object-cover rounded-md" alt="" />
                <div>
                  <div className="font-semibold leading-tight">{hotel?.name}</div>
                  <div className="text-xs text-muted-foreground">{hotel?.locality}, {hotel?.city}</div>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    <BedDouble className="w-3 h-3 mr-1" />{room?.room_type}
                  </Badge>
                </div>
              </div>
              <Separator />
              {liveError && <p className="text-xs text-destructive">{liveError}</p>}
              <PriceBreakdown price={displayPrice} />

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Instant confirmation on successful payment
              </div>
            </CardContent></Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

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
