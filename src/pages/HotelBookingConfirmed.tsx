import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2, CalendarDays, MapPin, Loader2, Download, Mail, Share2, Copy, Phone, Navigation as NavIcon,
  Users, Moon, BedDouble, QrCode, IdCard, Clock, UserCheck, PencilLine, XCircle, FileText, Headphones,
  ChevronRight, Sparkles, Wallet, Camera, CreditCard, Ticket, Building2, TrendingUp, Palmtree,
} from "lucide-react";
import { BookingStepper, StarRow, TrustStrip, useHotelReviewStats } from "@/components/hotels/booking/BookingFlowChrome";
import { resolveHotelImages } from "@/lib/hotelImage";

const inr = (n: any) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDay = (iso?: string | null) => { if (!iso) return "—"; const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso); return Number.isNaN(+d) ? "—" : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); };
const fmtDateTime = (iso?: string | null) => { if (!iso) return "—"; const d = new Date(iso); return Number.isNaN(+d) ? "—" : `${fmtDay(iso)}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`; };
const FALLBACK = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=70";

const HotelBookingConfirmed = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [hotel, setHotel] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const reviews = useHotelReviewStats(booking?.hotel_id);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      const [{ data }, { data: li }] = await Promise.all([
        supabase.from("hotel_bookings").select("*").eq("id", bookingId).maybeSingle(),
        (supabase as any).from("hotel_booking_items").select("*").eq("booking_id", bookingId),
      ]);
      setBooking(data);
      setItems(li || []);
      if (data?.hotel_id) {
        const [{ data: h }, { data: r }] = await Promise.all([
          supabase.from("partner_hotels").select("id,name,address,locality,city,star_rating,images,contact_phone,latitude,longitude,check_in_time,check_out_time,amenities").eq("id", data.hotel_id).maybeSingle(),
          data.room_id ? supabase.from("hotel_rooms").select("*").eq("id", data.room_id).maybeSingle() : Promise.resolve({ data: null } as any),
        ]);
        if (h) setHotel({ ...h, images: await resolveHotelImages((h as any).images) });
        setRoom(r);
      }
      setLoading(false);
    })();
  }, [bookingId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!booking) {
    return <div className="min-h-screen bg-background"><Navigation />
      <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Booking not found</h1>
        <Button className="mt-6" onClick={() => navigate("/hotels")}>Back to hotels</Button></div><Footer /></div>;
  }

  const isPaid = booking.payment_status === "paid" && booking.status === "confirmed";
  const cancelled = booking.status === "cancelled";
  const ref = booking.booking_reference || booking.id.slice(0, 8).toUpperCase();
  const nights = Math.max(1, Math.round((+new Date(booking.check_out) - +new Date(booking.check_in)) / 86400000));
  const adults = Number(booking.adults) || Number(booking.num_guests) || 1;
  const children = Number(booking.children) || 0;
  const hotelName = hotel?.name || booking.hotel_name;
  const hotelImg = hotel?.images?.[0] || FALLBACK;
  const roomImg = room?.photos?.[0] || hotelImg;
  const address = booking.hotel_address || hotel?.address || [hotel?.locality, hotel?.city].filter(Boolean).join(", ");
  const meals: string[] = Array.isArray(booking.meals) ? booking.meals : [];
  const policy = booking.cancellation_policy_snapshot;
  const policyText = typeof policy === "string" ? policy : policy?.summary || policy?.text || null;
  const checkin = booking.checkin_info || {};
  const preSteps = [
    { label: "Add Guest Details (ID Proof)", done: !!checkin.id_number, icon: UserCheck },
    { label: "Upload ID Proof (Aadhaar / Passport / DL)", done: !!(checkin.id_url || checkin.id_document || checkin.id_number), icon: IdCard },
    { label: "Provide Expected Arrival Time", done: !!checkin.eta, icon: Clock },
  ];
  const preDone = preSteps.every((s) => s.done);
  const roomCharges = Number(booking.room_charges) || items.filter((i) => i.item_type === "room").reduce((a, i) => a + Number(i.subtotal || 0), 0);
  const tax = Number(booking.tax_amount) || 0;
  const perNight = roomCharges && nights ? roomCharges / nights / Math.max(1, Number(booking.num_rooms) || 1) : 0;
  const mapUrl = hotel?.latitude && hotel?.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotelName} ${address}`)}`;
  const portal = booking.guest_portal_token ? `/stay/${booking.guest_portal_token}` : null;
  const shareText = `My stay at ${hotelName} is confirmed. Booking ID ${ref}, ${fmtDay(booking.check_in)} – ${fmtDay(booking.check_out)}.`;

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: "Booking confirmed", text: shareText, url: window.location.href }); else copy(`${shareText} ${window.location.href}`); } catch { /* dismissed */ } };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-4">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground print:hidden">
          <Link to="/">Home</Link><span>›</span><Link to="/hotels">Jaaga Stays</Link><span>›</span>
          {booking.hotel_id && <><Link to={`/hotels/${booking.hotel_id}`}>{hotelName}</Link><span>›</span></>}
          <span className="font-semibold text-foreground">Booking Confirmed</span>
        </nav>
        <BookingStepper current={isPaid ? 4 : 3} />

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 md:p-8">
          <div className="flex items-center gap-5">
            <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${cancelled ? "bg-destructive" : "bg-primary"} text-primary-foreground shadow-lg`}>
              {cancelled ? <XCircle className="h-11 w-11" /> : <CheckCircle2 className="h-11 w-11" />}
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-primary md:text-4xl">{cancelled ? "Booking Cancelled" : isPaid ? "Booking Confirmed!" : "Booking Received"}</h1>
              <p className="mt-1 text-lg font-semibold text-foreground">Your stay at {hotelName} is {cancelled ? "cancelled" : isPaid ? "confirmed" : "awaiting payment confirmation"}.</p>
              <p className="text-sm text-muted-foreground">A confirmation has been sent to <b className="text-foreground">{booking.guest_email}</b>{booking.guest_phone ? <> and <b className="text-foreground">{booking.guest_phone}</b></> : null}.</p>
            </div>
          </div>
          <img src={hotelImg} alt="" className="absolute right-0 top-0 hidden h-full w-1/3 object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_40%)] lg:block" />
        </section>

        {/* Ref strip */}
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
          <div className="flex items-center gap-3"><Camera className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Booking ID</p>
              <p className="flex items-center gap-2 font-extrabold">{ref}<button onClick={() => copy(ref)} aria-label="Copy booking ID"><Copy className="h-4 w-4 text-muted-foreground" /></button>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold capitalize text-primary">{booking.status}</span></p></div></div>
          <div className="flex items-center gap-3 md:border-l md:border-border md:pl-4"><Wallet className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Payment Status</p><p className="font-extrabold capitalize">{booking.payment_status || "pending"}</p></div></div>
          <div className="flex items-center gap-3 md:border-l md:border-border md:pl-4"><CalendarDays className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Booking Date</p><p className="font-extrabold">{fmtDateTime(booking.created_at)}</p></div></div>
        </section>

        {/* Pre check-in */}
        {!cancelled && (
          <section className="grid gap-5 rounded-2xl bg-primary/5 p-5 lg:grid-cols-[minmax(0,1fr)_200px_220px]">
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary"><IdCard className="h-6 w-6 text-primary" /> Pre Check-In (Before Arrival)</h2>
              <p className="text-sm text-muted-foreground">Save time at the hotel by completing your check-in details online.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[["Booking", "Confirmed", true], ["Pre Check-In", preDone ? "Completed" : "(Recommended)", preDone], ["Hotel Check-In", "(At Front Desk)", !!booking.actual_check_in_at], ["Enjoy", "Your Stay", !!booking.actual_check_in_at]].map(([a, b, d], i) => (
                  <div key={String(a)} className={`flex items-center gap-2 rounded-xl border p-2 text-xs ${d ? "border-primary/40 bg-card" : "border-border bg-card/60"}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${d ? "bg-primary text-primary-foreground" : "border border-border"}`}>{d ? "✓" : i + 1}</span>
                    <span><b className="block">{a}</b>{b}</span>
                  </div>
                ))}
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {preSteps.map((s) => (
                  <li key={s.label} className="flex items-center gap-3 px-3 py-2 text-sm"><s.icon className="h-5 w-5 text-primary" /><span className="flex-1 font-medium">{s.label}</span>
                    {s.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <span className="text-xs text-muted-foreground">Pending</span>}</li>
                ))}
              </ul>
              {portal && (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild className="font-bold"><Link to={portal}>{preDone ? "Pre Check-In Completed" : "Complete Pre Check-In"}</Link></Button>
                  <Button asChild variant="outline"><Link to={portal}><PencilLine className="mr-2 h-4 w-4" /> Edit Details</Link></Button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center">
              <span className="mb-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"><QrCode className="mr-1 inline h-3.5 w-3.5" />Check-In QR (Show at Hotel)</span>
              <QRCodeSVG value={ref} size={128} />
              <p className="mt-2 font-extrabold">{ref}</p>
              <p className="text-xs text-muted-foreground">Show this QR at the hotel front desk for a faster, hassle-free check-in.</p>
            </div>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <h3 className="font-extrabold">Your Check-In Summary</h3>
              <p><span className="text-xs text-muted-foreground">Check-in</span><br /><b>{fmtDay(booking.check_in)}</b>{hotel?.check_in_time && <><br />From {hotel.check_in_time}</>}</p>
              <p><span className="text-xs text-muted-foreground">Check-out</span><br /><b>{fmtDay(booking.check_out)}</b>{hotel?.check_out_time && <><br />By {hotel.check_out_time}</>}</p>
              <p><span className="text-xs text-muted-foreground">Guests</span><br /><b>{adults} Adult{adults > 1 ? "s" : ""}{children ? `, ${children} Child${children > 1 ? "ren" : ""}` : ""}</b></p>
              <p><span className="text-xs text-muted-foreground">Room</span><br /><b>{booking.room_type}{meals.length ? ` (With ${meals.join(", ")})` : ""}</b></p>
            </div>
          </section>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
              <div className="relative h-32 overflow-hidden rounded-xl"><img src={hotelImg} alt="" className="h-full w-full object-cover" />
                {hotel?.images?.length ? <span className="absolute bottom-2 left-2 rounded bg-foreground/70 px-2 text-xs text-background">{hotel.images.length} Photos</span> : null}</div>
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold">{hotelName}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {reviews ? <><StarRow value={reviews.avg} /> {reviews.avg.toFixed(1)} ({reviews.count} Reviews)</> : hotel?.star_rating ? <StarRow value={hotel.star_rating} /> : null}
                </div>
                {address && <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 text-primary" />{address}</p>}
              </div>
              <div className="flex gap-2">
                {hotel?.contact_phone && <a href={`tel:${hotel.contact_phone}`} className="flex w-20 flex-col items-center gap-1 rounded-xl border border-border p-2 text-xs"><Phone className="h-5 w-5 text-primary" />Call Hotel</a>}
                <a href={mapUrl} target="_blank" rel="noreferrer" className="flex w-20 flex-col items-center gap-1 rounded-xl border border-border p-2 text-xs"><NavIcon className="h-5 w-5 text-primary" />Get Directions</a>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><BedDouble className="h-5 w-5 text-primary" /> Your Booking Details</h3>
              <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                <img src={roomImg} alt="" className="h-28 w-full rounded-xl object-cover" />
                <div>
                  <p className="text-lg font-extrabold">{booking.room_type}</p>
                  <p className="text-xs text-muted-foreground">{[(room?.size_sqft || room?.room_size) && `${room.size_sqft || room.room_size} ${room.room_size_unit || "sq.ft"}`, room?.bed_type, room?.view_type].filter(Boolean).join(" | ")}</p>
                  {(meals.length > 0 || policyText) && (
                    <div className="mt-2 rounded-xl bg-primary/10 p-2 text-xs">
                      {meals.length > 0 && <p className="font-bold">With {meals.join(", ")}</p>}
                      {policyText && <p>{policyText}</p>}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border p-3 text-sm sm:grid-cols-5">
                <div><p className="text-xs text-muted-foreground">Check-in</p><b>{fmtDay(booking.check_in)}</b></div>
                <div><p className="text-xs text-muted-foreground">Check-out</p><b>{fmtDay(booking.check_out)}</b></div>
                <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Guests</p><b>{adults + children}</b></div></div>
                <div className="flex items-center gap-2"><Moon className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Nights</p><b>{nights}</b></div></div>
                <div className="flex items-center gap-2"><BedDouble className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Rooms</p><b>{booking.num_rooms}</b></div></div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><CreditCard className="h-5 w-5 text-primary" /> Payment Details</h3>
              <div className="space-y-1 text-sm">
                {roomCharges > 0 && <div className="flex justify-between"><span>Room Charges{perNight ? ` (${inr(perNight)} × ${nights} Nights${booking.num_rooms > 1 ? ` × ${booking.num_rooms} Rooms` : ""})` : ""}</span><span>{inr(roomCharges)}</span></div>}
                {items.filter((i) => !["room", "tax"].includes(i.item_type)).map((i) => <div key={i.id} className="flex justify-between"><span>{i.item_name}</span><span>{inr(i.subtotal)}</span></div>)}
                {Number(booking.discount_total) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>− {inr(booking.discount_total)}</span></div>}
                <div className="flex justify-between"><span>Taxes &amp; Fees{booking.gst_rate ? ` (${booking.gst_rate}% GST)` : ""}</span><span>{inr(tax)}</span></div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2"><span className="font-extrabold">{isPaid ? "Total Paid Amount" : "Grand Total"}</span><span className="text-2xl font-extrabold text-primary">{inr(booking.total_amount)}</span></div>
              {(booking.razorpay_payment_id || booking.payment_method) && (
                <div className="mt-3 grid gap-3 rounded-xl border border-border p-3 text-sm sm:grid-cols-2">
                  <div><p className="font-semibold capitalize">Paid via {booking.payment_method || "Razorpay"}</p>{booking.razorpay_payment_id && <p className="flex items-center gap-1 text-xs text-muted-foreground">Transaction ID: {booking.razorpay_payment_id}<button onClick={() => copy(booking.razorpay_payment_id)}><Copy className="h-3 w-3" /></button></p>}</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Payment Time</p><b>{fmtDateTime(booking.payment_attempted_at || booking.updated_at)}</b></div></div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4 print:hidden">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><Ticket className="h-5 w-5 text-primary" /> Your Booking Voucher</h3>
              <p className="mb-3 text-xs text-muted-foreground">Download your booking confirmation and present it at the hotel during check-in.</p>
              <Button className="mb-2 w-full font-bold" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Download Voucher (PDF)</Button>
              <Button variant="outline" className="mb-2 w-full" asChild><a href={`mailto:${booking.guest_email}?subject=${encodeURIComponent(`Booking ${ref} – ${hotelName}`)}&body=${encodeURIComponent(`${shareText}\n${window.location.href}`)}`}><Mail className="mr-2 h-4 w-4" /> Email Voucher</a></Button>
              <Button variant="outline" className="w-full" onClick={share}><Share2 className="mr-2 h-4 w-4" /> Share Booking</Button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><CalendarDays className="h-5 w-5 text-primary" /> Manage Your Booking</h3>
              {[
                { icon: CalendarDays, label: "Modify Booking", to: "/dashboard/buyer?tab=bookings" },
                { icon: XCircle, label: "Cancel Booking", to: "/dashboard/buyer?tab=bookings", danger: true },
                { icon: FileText, label: "Request Invoice (GST)", href: booking.invoice_url },
                { icon: Headphones, label: "Contact Support", to: "/contact" },
              ].map((m) => {
                const inner = <><m.icon className={`h-5 w-5 ${m.danger ? "text-destructive" : "text-primary"}`} /><span className="flex-1 font-semibold">{m.label}</span><ChevronRight className="h-4 w-4" /></>;
                const cls = "flex items-center gap-3 border-b border-border py-3 text-sm last:border-0";
                if (m.href) return <a key={m.label} href={m.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
                if (!m.to) return <button key={m.label} onClick={() => window.print()} className={`${cls} w-full text-left`}>{inner}</button>;
                return <Link key={m.label} to={m.to} className={cls}>{inner}</Link>;
              })}
            </div>
          </aside>
        </div>

        <section className="print:hidden">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold"><Sparkles className="h-5 w-5 text-primary" /> What's Next?</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Receive Confirmation", "Email & SMS sent", true],
              ["Pre Check-In", preDone ? "Completed" : "Recommended", preDone],
              ["Check-in at Hotel", "Show your QR & ID", !!booking.actual_check_in_at],
              ["Enjoy Your Stay", meals.length ? `${meals.join(", ")} included` : "Relax and unwind", !!booking.actual_check_in_at],
              ["Check-out", `${hotel?.check_out_time ? `By ${hotel.check_out_time}, ` : ""}${fmtDay(booking.check_out)}`, !!booking.actual_check_out_at],
            ].map(([t, s, d], i) => (
              <div key={String(t)} className={`rounded-xl border p-3 ${d ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <p className="text-sm font-bold">{t}</p><p className="text-xs text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="print:hidden">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold"><Building2 className="h-5 w-5 text-primary" /> Explore More with Jaaga</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: Palmtree, t: "Plan Your Next Trip", s: "Discover destinations, packages and experiences", cta: "Explore Packages", to: "/smart-stays" },
              { icon: TrendingUp, t: "Invest in Properties", s: "Buy, sell or invest in high-potential properties", cta: "Explore Investments", to: "/search" },
              { icon: BedDouble, t: "Find Another Stay", s: "Hotels, resorts and long stays near you", cta: "Explore Hotels", to: "/hotels" },
            ].map((c) => (
              <div key={c.t} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <c.icon className="h-10 w-10 shrink-0 text-primary" />
                <div><p className="font-bold">{c.t}</p><p className="text-xs text-muted-foreground">{c.s}</p>
                  <Button asChild size="sm" variant="outline" className="mt-2 border-primary text-primary"><Link to={c.to}>{c.cta} →</Link></Button></div>
              </div>
            ))}
          </div>
        </section>

        <div className="print:hidden"><TrustStrip /></div>
      </div>
      <Footer />
    </div>
  );
};

export default HotelBookingConfirmed;
