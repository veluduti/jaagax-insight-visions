import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, IndianRupee, BedDouble, Check } from "lucide-react";
import { toast } from "sonner";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import { useHotelPricingConfig, useLivePrice } from "@/hooks/useHotelPricing";
import { MealSelector, ExtraBedSelector, PriceBreakdown } from "@/components/hotels/BookingPricingControls";
import type { MealType } from "@/lib/hotelPricing";

type Hotel = any;
type Room = any;

const nightsBetween = (a: string, b: string) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 86400000));
};

export default function BookingEngine() {
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tmr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [numRooms, setNumRooms] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>([]);
  const [extraBeds, setExtraBeds] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [promo, setPromo] = useState("");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [quote, setQuote] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<any>(null);

  const guests = adults + children;

  useEffect(() => {
    (async () => {
      if (!hotelId) return;
      setLoading(true);
      const [h, r, a] = await Promise.all([
        (supabase as any).from("partner_hotels").select("*").eq("id", hotelId).maybeSingle(),
        (supabase as any).from("hotel_rooms").select("*").eq("hotel_id", hotelId).eq("is_active", true),
        (supabase as any).from("hotel_addons").select("*").eq("hotel_id", hotelId).eq("is_active", true),
      ]);
      setHotel(h.data); setRooms(r.data || []); setAddons(a.data || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  // Hotel meal / extra-bed / rate configuration for the selected room.
  const config = useHotelPricingConfig(hotelId, selectedRoom?.id);

  // Reset meal / extra-bed selection when the room changes.
  useEffect(() => { setSelectedMeals([]); setExtraBeds(0); }, [selectedRoom?.id]);

  const addonSelections = useMemo(
    () => Object.entries(selectedAddons)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => {
        const row = addons.find((a) => a.id === id);
        const units = row?.unit === "per_night" ? nights : row?.unit === "per_guest" ? guests : 1;
        return { addon_id: id, title: row?.title || "Add-on", unit_price: Number(row?.price) || 0, quantity: q, units };
      }),
    [selectedAddons, addons, nights, guests],
  );

  const { price: livePrice, error: liveError } = useLivePrice({
    room: config.room,
    meals: config.meals,
    rateCalendar: config.rateCalendar,
    gstRate: config.gstRate,
    checkIn, checkOut,
    adults, children,
    numRooms, extraBeds,
    selectedMeals,
    addons: addonSelections,
    discount: Number(quote?.discount || 0),
  });

  const toggleMeal = (m: MealType) =>
    setSelectedMeals((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const orderPayload = () => ({
    hotel_id: hotelId, room_id: selectedRoom?.id,
    check_in: checkIn, check_out: checkOut,
    adults, children, guests, num_rooms: numRooms,
    extra_beds: extraBeds, meals: selectedMeals,
    addons: Object.entries(selectedAddons).filter(([, q]) => q > 0).map(([id, q]) => ({ addon_id: id, quantity: q })),
    promo_code: promo || null,
  });

  const getQuote = async () => {
    if (!selectedRoom || nights < 1) return;
    const { data, error } = await supabase.functions.invoke("booking-engine-quote", { body: orderPayload() });
    if (error) return toast.error(error.message);
    if ((data as any)?.error) { setQuote(null); return toast.error((data as any).error); }
    setQuote(data);
  };

  useEffect(() => { if (selectedRoom) getQuote(); /* eslint-disable-next-line */ },
    [selectedRoom, checkIn, checkOut, selectedAddons, promo, adults, children, numRooms, extraBeds, selectedMeals.join(",")]);


  const confirm = async () => {
    if (!quote || !guest.name || !guest.email || !guest.phone) return toast.error("Please fill guest details");
    if (liveError) return toast.error(liveError);
    setConfirming(true);
    const { data, error } = await supabase.functions.invoke("booking-engine-confirm", {
      body: {
        ...orderPayload(),
        guest_name: guest.name, guest_email: guest.email, guest_phone: guest.phone,
        source: "direct",
      },
    });
    setConfirming(false);
    if (error) return toast.error(error.message);
    if ((data as any)?.error) return toast.error((data as any).error);
    setConfirmed(data);
  };


  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (!hotel) return <div className="p-8 text-center">Hotel not found.</div>;

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">Booking confirmed</h2>
            <p className="text-sm text-muted-foreground">A confirmation and guest portal link has been sent to {guest.email}.</p>
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="font-mono">Ref: {confirmed.booking?.id?.slice(0, 8)}</div>
              {confirmed.portal_url && <a className="text-emerald-400 underline break-all text-xs" href={confirmed.portal_url}>Open guest portal</a>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold">{hotel.name}</h1>
          <p className="text-xs text-muted-foreground">{hotel.locality}, {hotel.city} · Direct booking · commission-free</p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div><Label>Check-in</Label><Input type="date" min={new Date().toISOString().slice(0,10)} value={checkIn} onChange={e => { const v = e.target.value; setCheckIn(v); if (v && checkOut && new Date(checkOut) <= new Date(v)) setCheckOut(nextDayISO(v)); }} /></div>
              <div><Label>Check-out</Label><Input type="date" min={nextDayISO(checkIn)} value={checkOut} onChange={e => { const v = e.target.value; if (v && checkIn && !isValidDateRangeISO(checkIn, v)) { toast.error(CHECKOUT_AFTER_CHECKIN_MSG); return; } setCheckOut(v); }} /></div>
              <div><Label>Adults</Label><Input type="number" min={1} value={adults} onChange={e => setAdults(Math.max(1, Number(e.target.value) || 1))} /></div>
              <div><Label>Children</Label><Input type="number" min={0} value={children} onChange={e => setChildren(Math.max(0, Number(e.target.value) || 0))} /></div>
              <div><Label>Rooms</Label><Input type="number" min={1} value={numRooms} onChange={e => setNumRooms(Math.max(1, Number(e.target.value) || 1))} /></div>
            </CardContent>
          </Card>


          <div className="space-y-3">
            {rooms.map(r => (
              <Card key={r.id} className={selectedRoom?.id === r.id ? "ring-2 ring-emerald-500/40" : ""}>
                <CardContent className="p-4 flex gap-4">
                  <div className="h-24 w-32 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                    {r.photos?.[0] ? <img src={r.photos[0]} className="w-full h-full object-cover" alt={r.room_type} /> : <BedDouble className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{r.room_type}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                    <div className="mt-1 flex gap-2 flex-wrap text-xs">
                      <Badge variant="secondary">Sleeps {r.max_occupancy}</Badge>
                      {r.breakfast_included && <Badge>Breakfast</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold flex items-center justify-end"><IndianRupee className="h-4 w-4" />{Number(r.base_price).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">per night from</div>
                    <Button size="sm" className="mt-2" onClick={() => setSelectedRoom(r)}>{selectedRoom?.id === r.id ? "Selected" : "Select"}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rooms.length === 0 && <p className="text-sm text-muted-foreground">No rooms available.</p>}
          </div>

          {addons.length > 0 && selectedRoom && (
            <Card>
              <CardContent className="p-4">
                <div className="font-medium mb-2">Enhance your stay</div>
                <div className="grid gap-2">
                  {addons.map(a => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border/40 py-2 last:border-b-0">
                      <div>
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{a.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">₹{a.price}</span>
                        <Input type="number" min={0} className="w-16" value={selectedAddons[a.id] || 0} onChange={e => setSelectedAddons({ ...selectedAddons, [a.id]: Number(e.target.value) })} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-4">
            <CardContent className="p-4 space-y-3">
              <div className="font-medium">Booking summary</div>
              <div className="text-xs text-muted-foreground">{nights} night{nights !== 1 && "s"} · {guests} guest{guests !== 1 && "s"}</div>
              {selectedRoom && quote && (
                <>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Room ({nights} × ₹{quote.per_night})</span><span>₹{quote.room_total}</span></div>
                    {quote.addon_total > 0 && <div className="flex justify-between"><span>Add-ons</span><span>₹{quote.addon_total}</span></div>}
                    {quote.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Discount</span><span>−₹{quote.discount}</span></div>}
                    <div className="flex justify-between font-semibold border-t border-border/60 pt-2"><span>Total</span><span>₹{quote.total}</span></div>
                  </div>
                </>
              )}
              <div><Label>Promo code</Label><Input value={promo} onChange={e => setPromo(e.target.value.toUpperCase())} placeholder="MONSOON10" /></div>
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div><Label>Full name</Label><Input value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} /></div>
              </div>
              <Button className="w-full" disabled={!selectedRoom || !quote || confirming} onClick={confirm}>
                {confirming ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Confirm booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
