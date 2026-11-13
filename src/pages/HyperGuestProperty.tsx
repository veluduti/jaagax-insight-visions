import { customerPrice, publicRate, hotelLocalInstant, policyDeadline, supplierDisclosures } from "@/lib/supplierTravel";
import { useEffect, useMemo, useRef, useState } from "react";
import { readHotelSearchContext, hotelSearchParams } from "@/lib/hotelSearchContext";
import { isValidDateRangeISO, CHECKOUT_AFTER_CHECKIN_MSG } from "@/lib/dateRange";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, MapPin, Star, Plus, Trash2, Info, RefreshCw, CreditCard, Lock, CheckCircle2, ArrowLeft, CalendarDays, Users, BedDouble, Images, User, FileText, ArrowRight } from "lucide-react";

const luhn = (n: string) => {
  if (!/^\d{13,19}$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < n.length; i++) { let d = +n[n.length - 1 - i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; }
  return s % 10 === 0;
};

const BOARD: Record<string, string> = { RO: "Room only", BB: "Bed & breakfast", HB: "Half board", FB: "Full board", AI: "All inclusive" };
const NATIONALITIES = ["IN", "GB", "US", "JP", "IL", "AE", "DE", "FR"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const USD_RATE: Record<string, number> = { USD: 1, EUR: 1.12, GBP: 1.3, BRL: 0.19, MUR: 0.023, INR: 0.012, AED: 0.273 };
const toUsd = (a: number, c: string) => USD_RATE[String(c).toUpperCase()] != null ? a * USD_RATE[String(c).toUpperCase()] : NaN;
const TESTS = ["", "#1 Pre-book 1 room 1 adult", "#2 1 room 1 adult", "#3 1 room 2A+1C+1I", "#4 2 rooms 2A / 1A", "#5 2 rooms 1A1C / 2A1I", "#6 2 rooms different types/rates", "#7 Same-day 2 adults", "#8 Currency conversion", "#9 Nationality", "#10 Cancel refundable", "#11 Cancel non-refundable", "#12 Package rate"];

type RoomReq = { adults: number; children: number[]; infants: number };
let LIVE_MODE = false;
const addMonthsISO = (m: number) => { const x = new Date(); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };
const call = async (body: any) => {
  const { data, error } = await supabase.functions.invoke("hyperguest", { body: { ...body, live: LIVE_MODE } });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json(); msg = j?.error ?? msg; return { error: msg, data: j }; } catch { /* */ }
    return { error: msg, data: null };
  }
  return { data, error: null as string | null };
};
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ages = (r: RoomReq) => [...r.children, ...Array(r.infants).fill(1)];
const paxKey = (adults: number, kids: number[]) => `${adults}|${[...kids].sort((a, b) => a - b).join(",")}`;
const birth = (age: number) => { const d = new Date(); d.setFullYear(d.getFullYear() - age); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };
const money = (v: any, c: string) => v == null ? "—" : `${c} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function cancelInfo(rp: any, checkIn: string, timezone?: string, checkInTime?: string) {
  const pols: any[] = rp.cancellationPolicies ?? [];
  const active = pols.filter(p => { const deadline = policyDeadline(p, checkIn, timezone, checkInTime); return deadline != null && Date.now() >= deadline; });
  const unknown = pols.some(p => policyDeadline(p, checkIn, timezone, checkInTime) == null);
  const nonRef = active.some(p => p.penaltyType === "percent" && Number(p.amount) >= 100);
  return { pols, nonRef, nowPenalty: active.find(p => Number(p.amount) > 0), unknown };
}
const polText = (p: any) => {
  const setting = p.timeSetting ?? p;
  return `From ${setting.timeFromCheckIn ?? p.daysBefore} ${setting.timeFromCheckInType ?? "days"} before check-in${p.cancellationDeadlineHour ? ` (pivot ${p.cancellationDeadlineHour}, hotel local time)` : " (hotel local time)"}: ${p.amount}${p.penaltyType === "percent" ? "%" : p.penaltyType === "nights" ? " night(s)" : ""} charge`;
};
function BookingPolicy({ b, timezone }: { b: any; timezone?: string }) {
  const wins = (Array.isArray(b?.cancellation) ? b.cancellation : []).flat().filter(Boolean);
  if (!wins.length) return <p className="text-xs text-muted-foreground">Cancellation policy not returned. Refresh this booking.</p>;
  const paid = wins.filter((w: any) => Number(w?.price?.amount) > 0);
  const deadlines = paid.map((w: any) => hotelLocalInstant(String(w.startDate), timezone));
  const known = deadlines.length > 0 && deadlines.every((n: any) => n != null);
  const free = known ? Math.min(...deadlines.filter((n: any): n is number => n != null)) : null;
  return <div className="text-xs mt-1 space-y-1">
    <p className="font-medium">Cancellation policy{timezone ? ` · ${timezone}` : " · hotel local time"}: {free != null ? Date.now() < free ? `Free cancellation until ${new Date(free).toLocaleString(undefined, { timeZone: timezone })}` : "Cancellation charges apply" : "Review supplier policy below"}</p>
    <ul className="list-disc pl-4 text-muted-foreground">{wins.map((w: any, i: number) => <li key={i}>{String(w.startDate)} → {String(w.endDate)}: {money(w.price?.amount, w.price?.currency ?? b.total_currency)}</li>)}</ul>
  </div>;
}

function TaxLines({ node, cur }: { node: any; cur: string }) {
  const items = [...(node?.taxes ?? []).map((t: any) => ({ ...t, kind: "Tax" })), ...(node?.fees ?? []).map((t: any) => ({ ...t, kind: "Fee" }))];
  if (!items.length) return <p className="text-xs text-muted-foreground">No taxes or fees returned for this rate.</p>;
  return (
    <ul className="text-xs space-y-1">
      {items.map((t: any, i: number) => (
        <li key={i} className="flex justify-between gap-2">
          <span>{t.kind}: {t.description ?? t.name} <Badge variant="outline" className="ml-1 text-[10px]">{t.relation === "display" ? "Pay at hotel / not included" : t.relation === "included" ? "Included" : t.relation === "add" ? "Added to price" : t.relation}</Badge></span>
          <span className="whitespace-nowrap">{money(t.searchCurrency ?? t.amount, t.searchCurrency != null ? cur : t.currency)}</span>
        </li>
      ))}
    </ul>
  );
}

import { BookingStepper, TrustStrip, PaymentBadges, WhyBookCard } from "@/components/hotels/booking/BookingFlowChrome";
import { Label } from "@/components/ui/label";
import { englishDescription, hotelCoordinates, roomOccupancy, roomBeds, hotelPolicies } from "@/lib/hyperguestDisplay";
import RoomDetailsDialog from "@/components/hotels/RoomDetailsDialog";
import { hyperguestRoomDetails, hasRoomDetails, type RoomDetails } from "@/lib/roomDetails";

export default function HyperGuestProperty() {
  const { propertyId = "19912" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const marketplace = params.get("marketplace") === "1";
  const live = params.get("live") === "1" || marketplace;
  const certification = live && !marketplace;
  const initialSearch = readHotelSearchContext(params, certification ? addDays(addMonthsISO(6), 1) : addDays(today(), 1));
  LIVE_MODE = live;
  const liveMinCheckIn = addMonthsISO(6);
  const { user } = useAuth();
  const [stat, setStat] = useState<any>(null);
  const [checkIn, setCheckIn] = useState(initialSearch.checkIn);
  const [nights, setNights] = useState(Math.round((Date.parse(initialSearch.checkOut) - Date.parse(initialSearch.checkIn)) / 86400000));
  const [nationality, setNationality] = useState(params.get("nationality") ?? "IN");
  const [currency, setCurrency] = useState(params.get("currency") ?? (certification ? "USD" : "INR"));
  const [rooms, setRooms] = useState<RoomReq[]>(() => { const count = initialSearch.rooms; const adults = Math.max(count, initialSearch.adults); return Array.from({ length: count }, (_, i) => ({ adults: Math.floor(adults / count) + (i < adults % count ? 1 : 0), children: i === 0 ? initialSearch.childAges : [], infants: 0 })); });
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Record<number, { room: any; rp: any }>>({});
  const [prebook, setPrebook] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [lead, setLead] = useState(certification ? { first: "Test", last: "Test", email: "", phone: "" } : { first: "", last: "", email: "", phone: "" });
  const [guests, setGuests] = useState<Record<string, { first: string; last: string }>>({});
  const [special, setSpecial] = useState("");
  const [testLabel, setTestLabel] = useState("");
  const [ref, setRef] = useState("");
  const [confirmed, setConfirmed] = useState<any>(null);
  const [mine, setMine] = useState<any[]>([]);
  const [step, setStep] = useState<"guests" | "payment">("guests");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [editSearch, setEditSearch] = useState(!marketplace);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const searchRequest = useRef(0);

  const [statError, setStatError] = useState<string | null>(null);
  useEffect(() => {
    setStat(null); setStatError(null);
    call({ action: "static", propertyId: Number(propertyId) }).then((r) => {
      if (r.error || !r.data || r.data.error) setStatError(`Hotel ${propertyId} could not be loaded${live ? " with the live token" : ""}. Check the hotel ID or pick a hotel from the HyperGuest Hotels list.`);
      else setStat(r.data);
    });
  }, [propertyId]);
  useEffect(() => {
    if (!user) return;
    setLead((l) => ({ ...l, email: l.email || user.email || "", phone: l.phone || (user as any).phone || "" }));
    loadMine();
  }, [user]);
  const loadMine = async () => {
    const { data } = await (supabase as any).from("hyperguest_bookings").select("*").eq("property_id", Number(propertyId)).order("created_at", { ascending: false }).limit(30);
    setMine(data ?? []);
    setConfirmed((current: any) => current ? (data ?? []).find((b: any) => b.id === current.id) ?? current : null);
  };

  useEffect(() => {
    const pending = mine.filter(b => ["pending", "partial"].includes(b.status));
    if (!pending.length) return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      await Promise.all(pending.map(b => call({ action: "refresh", id: b.id })));
      if (!stopped) await loadMine();
    }, 20000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [mine.map(b => `${b.id}:${b.status}`).join("|")]);

  const prop = result?.results?.[0];
  const staticRooms: Record<string, any> = useMemo(() => Object.fromEntries((stat?.rooms ?? []).map((r: any) => [String(r.id), r])), [stat]);
  const desc = stat?.descriptions?.find((d: any) => d.language === "en_US" && d.type === "general")?.description;
  const coords = hotelCoordinates(stat);
  const staticPolicies = hotelPolicies(stat);
  const placeLine = [stat?.location?.region, stat?.location?.countryCode].filter((v: any) => typeof v === "string" && v.trim()).join(", ");
  const hotelFacilities = (stat?.facilities ?? []).filter((f: any) => f.type !== "room");
  const photos = [...(stat?.images ?? []), ...(stat?.rooms ?? []).flatMap((r: any) => r.images ?? [])].map((i: any) => i.uri).filter(Boolean);

  const search = async () => {
    if (!isValidDateRangeISO(checkIn, addDays(checkIn, nights)) || checkIn < today()) return toast.error(CHECKOUT_AFTER_CHECKIN_MSG);
    if (certification && checkIn < liveMinCheckIn) return toast.error(`Check-in must be on or after ${liveMinCheckIn} (6 months from today).`);
    const request = ++searchRequest.current;
    setAvailabilityError(null); setResult(null);
    setSearching(true); setPicked({}); setPrebook(null); setConfirmed(null);
    const r = await call({ action: "search", propertyId: Number(propertyId), checkIn, nights, nationality, currency, rooms: rooms.map((x) => ({ adults: x.adults, childAges: ages(x) })) });
    if (request !== searchRequest.current) return;
    setSearching(false);
    if (r.error || r.data?.error) { setAvailabilityError(r.error || r.data.error); return; }
    setResult(r.data);
    setEditSearch(false);
    const query = hotelSearchParams({ checkIn, checkOut: addDays(checkIn, nights), adults: rooms.reduce((sum, r) => sum + r.adults, 0), rooms: rooms.length, childAges: rooms.flatMap(ages) });
    if (marketplace) query.set("marketplace", "1");
    if (live) query.set("live", "1");
    query.set("nationality", nationality); query.set("currency", currency);
    nav(`${loc.pathname}?${query}`, { replace: true });
  };

  useEffect(() => {
    searchRequest.current += 1;
    setSearching(false); setResult(null); setPicked({}); setPrebook(null); setAvailabilityError(null);
  }, [checkIn, nights, rooms, nationality, currency]);

  useEffect(() => {
    if (marketplace) void search();
    return () => { searchRequest.current += 1; };
  }, [propertyId]);

  const roomsFor = (i: number) => {
    const k = paxKey(rooms[i].adults, ages(rooms[i]));
    return (prop?.rooms ?? []).filter((r: any) => paxKey(r.searchedPax?.adults ?? 0, r.searchedPax?.children ?? []) === k);
  };

  const requireLogin = () => {
    toast.warning("Please sign in to book this hotel");
    nav(`/auth?redirect=${encodeURIComponent(loc.pathname + loc.search)}`);
  };

  const doPrebook = async () => {
    if (!user) return requireLogin();
    if (certification) {
      const sel0 = rooms.map((_, i) => picked[i]);
      if (sel0.some((s) => !isFullyRefundable(s.rp))) return toast.error("Please choose a fully refundable rate only.");
      const tot = sel0.reduce((a, s) => a + toUsd(Number(s.rp.payment?.chargeAmount?.price ?? 0), s.rp.payment?.chargeAmount?.currency), 0);
      if (!(tot <= 500)) return toast.error(Number.isNaN(tot) ? "This rate currency is not supported." : `Booking total must be USD 500 or less (about USD ${tot.toFixed(2)}).`);
    }
    setBusy(true);
    const sel = rooms.map((_, i) => picked[i]);
    const r = await call({
      action: "prebook", currency,
      search: { dates: { from: checkIn, to: addDays(checkIn, nights) }, propertyId: Number(propertyId), nationality, pax: rooms.map((x) => ({ adults: x.adults, children: ages(x) })) },
      rooms: sel.map((s) => ({ roomCode: s.room.roomTypeCode, rateCode: s.rp.ratePlanCode, expectedPrice: { amount: s.rp.payment?.chargeAmount?.price, currency: s.rp.payment?.chargeAmount?.currency } })),
    });
    setBusy(false);
    if (r.error) return toast.error(r.error);
    setCard({ number: "", expiry: "", cvv: "", name: "" }); setPrebook(r.data); setStep("guests");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setRef(`JX-${crypto.randomUUID().slice(0, 18)}`);
    if (r.data.rooms?.some((x: any) => x.priceChange)) toast.warning("The price changed since your search. Please review the new price before booking.");
  };

  const doBook = async () => {
    if (!user) return requireLogin();
    if (!lead.first || !lead.last || !lead.email) return toast.error("Lead guest name and email are required");
    setBusy(true);
    const sel = rooms.map((_, i) => picked[i]);
    const payload = {
      dates: { from: checkIn, to: addDays(checkIn, nights) }, propertyId: Number(propertyId),
      leadGuest: { birthDate: "1990-01-01", title: "MR", name: { first: lead.first, last: lead.last }, contact: { address: "N/A", city: "N/A", country: nationality, email: lead.email, phone: lead.phone || "N/A", state: "N/A", zip: "N/A" } },
      rooms: rooms.map((rq, i) => {
        const pr = prebook.rooms?.[i];
        const amount = pr?.priceChange?.toAmount ?? { amount: pr?.payment?.chargeAmount?.price ?? sel[i].rp.payment?.chargeAmount?.price, currency: pr?.payment?.chargeAmount?.currency ?? sel[i].rp.payment?.chargeAmount?.currency };
        const list = [
          ...Array.from({ length: rq.adults }, (_, a) => ({ age: 30, k: `${i}-a${a}` })),
          ...ages(rq).map((age, c) => ({ age, k: `${i}-c${c}` })),
        ];
        return {
          roomCode: sel[i].room.roomTypeCode, rateCode: sel[i].rp.ratePlanCode, expectedPrice: amount,
          guests: list.map((g, gi) => ({ age: g.age, title: g.age >= 18 ? "MR" : "C", name: { first: guests[g.k]?.first || (gi === 0 && i === 0 ? lead.first : `Guest${gi + 1}`), last: guests[g.k]?.last || lead.last } })),
          specialRequests: special.trim() ? [special.trim()] : [],
        };
      }),
    };
    const r = await call({
      action: "book", agencyReference: ref, quoteId: prebook.quoteId, payload, card: live ? { number: card.number.replace(/\s/g, ""), expiry: card.expiry, cvv: card.cvv, name: card.name } : undefined, refundable: live ? rooms.every((_, i) => isFullyRefundable(sel[i].rp)) : undefined, nationality, currency, testLabel: testLabel || null, specialRequests: special || null,
      roomsSummary: rooms.map((rq, i) => ({ room: sel[i].room.roomName, rate: sel[i].rp.ratePlanName, board: sel[i].rp.board, adults: rq.adults, children: rq.children, infants: rq.infants })),
    });
    setBusy(false);
    if (r.error) return toast.error(r.error);
    if (r.data?.pending) { toast.info(r.data.message); loadMine(); return; }
    setConfirmed(r.data.booking);
    setCard({ number: "", expiry: "", cvv: "", name: "" });
    if (r.data.booking?.status === "confirmed") toast.success("All rooms confirmed by the hotel");
    else toast.info(`Reservation status: ${r.data.booking?.status ?? "pending"}. Review each room below.`);
    loadMine();
  };

  const cancel = async (b: any) => {
    const p = await call({ action: "cancel", id: b.id });
    if (p.error) return toast.error(p.error);
    if (!confirm(`Cancel booking ${b.hg_booking_id}? Under this booking's cancellation policy, the charge right now is ${money(p.data.charge, p.data.currency ?? "")}${Number(p.data.charge) === 0 ? " (free cancellation)" : ""}.`)) return;
    const r = await call({ action: "cancel", id: b.id, confirm: true, acceptedCharge: p.data.charge, acceptedCurrency: p.data.currency });
    if (r.error) return toast.error(r.error);
    if (r.data.cancelled) toast.success("Booking cancelled by the hotel"); else toast.info("Cancellation is awaiting verification. Refresh the booking."); loadMine();
  };
  const refresh = async (b: any) => { await call({ action: "refresh", id: b.id }); loadMine(); };

  const isFullyRefundable = (rp: any) => { const ci = cancelInfo(rp, checkIn, stat?.settings?.timezone, stat?.settings?.checkIn); return !ci.unknown && !ci.nonRef && !ci.nowPenalty; };
  const allPicked = rooms.every((_, i) => picked[i]);
  const remarks: string[] = prop?.remarks ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-6 pb-16 max-w-7xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => { if (prebook && !confirmed) { setPrebook(null); } else { nav(`/hotels${loc.search}`); } }}><ArrowLeft className="mr-2 h-4 w-4" />{prebook && !confirmed ? "Back to rooms" : "Back to hotels"}</Button>
        {statError ? <div className="py-20 text-center text-muted-foreground">{statError}</div> : !stat ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : (
          <>
            {certification && <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">Free cancellation rates only · check-in from {liveMinCheckIn} · guest name Test Test · cancel from My Bookings within 7 days.</p>}
            {!prebook && !confirmed && (() => {
              const pickedList = rooms.map((_, i) => picked[i]).filter(Boolean) as { room: any; rp: any }[];
              const pickedTotal = pickedList.reduce((s, p) => s + Number(customerPrice(p.rp, currency)?.amount ?? 0), 0);
              const pickedCur = pickedList[0] ? customerPrice(pickedList[0].rp, currency)?.currency ?? currency : currency;
              const first = pickedList[0];
              const firstImg = first ? staticRooms[String(first.room.roomId)]?.images?.[0]?.uri : null;
              const totalAdults = rooms.reduce((sum, r) => sum + r.adults, 0);
              const totalKids = rooms.flatMap(ages).length;
              const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
              return (
              <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
                <div className="space-y-6 min-w-0">
                  <div className="grid md:grid-cols-[300px_minmax(0,1fr)] gap-5">
                    <button type="button" className="relative h-52 overflow-hidden rounded-xl bg-muted" onClick={() => photos.length && setGalleryOpen(true)}>
                      {photos[0] && <img src={photos[0]} alt={stat.name} className="h-full w-full object-cover" />}
                      {photos.length > 1 && <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-foreground/70 px-2 py-1 text-xs text-background"><Images className="h-3 w-3" />{photos.length} Photos</span>}
                    </button>
                    <div className="min-w-0 space-y-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-primary">{stat.name}</h1>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {Number(stat.rating) > 0 && <span className="flex items-center gap-0.5">{Array.from({ length: Math.round(Number(stat.rating)) }, (_, k) => <Star key={k} className="h-4 w-4 fill-current text-amber-500" />)}</span>}
                        <Badge variant="outline" className="border-primary/40 text-primary"><CheckCircle2 className="mr-1 h-3 w-3" />Verified Hotel</Badge>
                      </div>
                      <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 text-primary" />{[stat.location?.address, stat.location?.city?.name].filter(Boolean).join(", ")}{coords && <a className="ml-2 font-medium text-primary hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`} target="_blank" rel="noopener noreferrer">View on Map</a>}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Number(stat.rating) > 0 && <div className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border p-2 text-xs"><Star className="h-5 w-5 text-primary" />{stat.rating} Star</div>}
                        {(stat.rooms?.length ?? 0) > 0 && <div className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border p-2 text-xs"><BedDouble className="h-5 w-5 text-primary" />{stat.rooms.length} Rooms</div>}
                        {hotelFacilities.slice(0, 4).map((f: any) => <div key={f.id} className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border p-2 text-center text-xs"><CheckCircle2 className="h-5 w-5 text-primary" /><span className="line-clamp-1">{f.name}</span></div>)}
                      </div>
                    </div>
                  </div>
                  <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}><DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto"><DialogTitle>{stat.name} · Photos</DialogTitle><div className="grid sm:grid-cols-2 gap-3">{photos.map((u, i) => <img key={i} src={u} alt={`${stat.name} photo ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-md" />)}</div></DialogContent></Dialog>
                  <RoomDetailsDialog details={roomDetails} open={!!roomDetails} onOpenChange={(v) => { if (!v) setRoomDetails(null); }} />

                  <BookingStepper current={0} />

                  <section id="supplier-rooms" className="scroll-mt-24 space-y-4">
                    <div><h2 className="text-2xl font-bold text-primary">Check Availability & Select Room</h2><p className="text-sm text-muted-foreground">Choose your stay dates, guests and preferred room with a rate plan.</p></div>
                    <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1.2fr_auto]">
                      <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"><CalendarDays className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-xs text-muted-foreground">Check-in</span><input type="date" className="w-full bg-transparent text-sm font-semibold outline-none" min={certification ? liveMinCheckIn : today()} value={checkIn} onChange={(e) => e.target.value && setCheckIn(e.target.value)} /></span></label>
                      <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"><CalendarDays className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-xs text-muted-foreground">Check-out</span><input type="date" className="w-full bg-transparent text-sm font-semibold outline-none" min={addDays(checkIn, 1)} value={addDays(checkIn, nights)} onChange={(e) => { if (!isValidDateRangeISO(checkIn, e.target.value)) return toast.error(CHECKOUT_AFTER_CHECKIN_MSG); setNights(Math.round((Date.parse(e.target.value) - Date.parse(checkIn)) / 86400000)); }} /></span></label>
                      <button type="button" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left" onClick={() => setEditSearch(!editSearch)}><Users className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-xs text-muted-foreground">Guests & Rooms</span><span className="text-sm font-semibold">{totalAdults} Adults{totalKids ? `, ${totalKids} Children` : ""}, {rooms.length} Room{rooms.length > 1 ? "s" : ""}</span></span></button>
                      <Button size="lg" className="h-auto" onClick={search} disabled={searching}>{searching && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Check Availability</Button>
                    </div>
                    {editSearch && <div className="border border-border rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 md:max-w-md">
                        <label className="text-xs">Guest nationality<select className="w-full h-10 rounded-md border bg-background px-2" value={nationality} onChange={(e) => setNationality(e.target.value)}>{NATIONALITIES.map((n) => <option key={n}>{n}</option>)}</select></label>
                        <label className="text-xs">Currency<select className="w-full h-10 rounded-md border bg-background px-2" value={currency} disabled={certification} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((n) => <option key={n}>{n}</option>)}</select></label>
                      </div>
                      {rooms.map((r, i) => (
                        <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-2">
                          <span className="text-sm font-medium w-16">Room {i + 1}</span>
                          <label className="text-xs">Adults<Input className="w-20" type="number" min={1} max={4} value={r.adults} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, adults: Math.max(1, +e.target.value) } : x))} /></label>
                          <label className="text-xs">Child ages (0–17, comma)<Input className="w-36" value={r.children.join(",")} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, children: e.target.value.split(",").map((s) => parseInt(s)).filter((n) => n >= 0 && n <= 17) } : x))} /></label>
                          <label className="text-xs">Infants (0–3)<Input className="w-20" type="number" min={0} max={2} value={r.infants} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, infants: Math.max(0, +e.target.value) } : x))} /></label>
                          {rooms.length > 1 && <Button size="icon" variant="ghost" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      ))}
                      {rooms.length < 4 && <Button variant="outline" size="sm" onClick={() => setRooms([...rooms, { adults: 1, children: [], infants: 0 }])}><Plus className="h-4 w-4 mr-1" />Add room</Button>}
                    </div>}
                    {searching && <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Checking available rooms…</div>}
                    {availabilityError && <div className="py-6 text-center space-y-3"><p className="text-sm text-destructive">{availabilityError}</p><Button variant="outline" onClick={search}>Try again</Button></div>}
                    {!searching && result && !prop?.rooms?.length && <div className="py-8 text-center space-y-3"><h2 className="font-semibold">No rooms available for your stay</h2><p className="text-sm text-muted-foreground">Try different dates or guest numbers.</p></div>}
                    {!searching && !result && !availabilityError && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Choose your dates and tap Check Availability to see live rooms and prices.</p>}

                    {prop && rooms.map((rq, i) => (
                      <div key={i} className="space-y-3">
                        <h2 className="text-xl font-bold text-primary">Available Rooms ({roomsFor(i).length}){rooms.length > 1 && <span className="ml-2 text-sm font-normal text-muted-foreground">Room {i + 1} · {rq.adults} adult(s){rq.children.length ? `, ${rq.children.length} child(ren)` : ""}</span>}</h2>
                        {roomsFor(i).length === 0 && <p className="text-sm text-muted-foreground">No rooms fit these guests.</p>}
                        {roomsFor(i).map((room: any) => {
                          const st = staticRooms[String(room.roomId)];
                          const isPicked = picked[i]?.room === room;
                          const size = room.settings?.roomSize || st?.settings?.roomSize;
                          const occ = roomOccupancy({ ...(st?.settings ?? {}), ...(room.settings ?? {}) });
                          const rdesc = englishDescription(st?.descriptions);
                          const rd = hyperguestRoomDetails(st, room);
                          return (
                            <div key={room.roomId} className={`grid gap-4 rounded-xl border p-3 md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1.3fr)] ${isPicked ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                              <div className="relative h-32 overflow-hidden rounded-lg bg-muted">
                                {st?.images?.[0]?.uri && <img src={st.images[0].uri} alt={room.roomName} loading="lazy" className="h-full w-full object-cover" />}
                                {st?.images?.length > 0 && <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] text-background"><Images className="h-3 w-3" />{st.images.length} Photos</span>}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <h3 className="text-lg font-bold text-primary">{room.roomName}</h3>
                                <p className="text-xs text-muted-foreground">{[size ? `${size} m²` : null, roomBeds(st, room), Number(room.numberOfAvailableRooms) > 0 ? `${room.numberOfAvailableRooms} left` : null].filter(Boolean).join(" · ")}</p>
                                {occ.length > 0 && <p className="text-xs text-muted-foreground">{occ.map(o => `${o.label}: ${o.value}`).join(" · ")}</p>}
                                {rdesc && <p className="line-clamp-2 text-xs">{rdesc}</p>}
                                {hasRoomDetails(rd) && <Button type="button" variant="outline" size="sm" className="mt-1 h-8 gap-1.5 text-xs" onClick={() => setRoomDetails(rd)}><Info className="h-3.5 w-3.5" />Room Details &amp; Amenities</Button>}
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-semibold">Choose a Rate Plan</p>
                                {room.ratePlans.filter(publicRate).map((rp: any) => {
                                  const sell = rp.prices?.sell;
                                  const retail = customerPrice(rp, currency);
                                  const ci = cancelInfo(rp, checkIn, stat?.settings?.timezone, stat?.settings?.checkIn);
                                  const sel = picked[i]?.rp === rp && isPicked;
                                  const disabled = !retail || (certification && !isFullyRefundable(rp));
                                  return (
                                    <div key={`${rp.ratePlanId}-${rp.ratePlanCode}`} className={`rounded-lg border p-2.5 ${sel ? "border-primary bg-primary/5" : "border-border"}`}>
                                      <label className={`flex gap-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                                        <input type="radio" className="mt-1 accent-primary" name={`rate-${i}`} checked={sel} disabled={disabled} onChange={() => { setPicked({ ...picked, [i]: { room, rp } }); setPrebook(null); }} />
                                        <span className="flex-1 min-w-0">
                                          <span className="block text-sm font-semibold">{rp.ratePlanName}</span>
                                          <span className="block text-[11px] text-muted-foreground">{BOARD[rp.board] ?? rp.board} | {ci.nonRef ? "Non-refundable" : ci.unknown ? "See cancellation policy" : ci.nowPenalty ? "Cancellation charges apply" : "Free cancellation"}{rp.ratePlanInfo?.isPromotion ? " | Promotion" : ""}</span>
                                        </span>
                                        <span className="text-right"><span className="block font-bold">{money(retail?.amount, retail?.currency ?? currency)}</span><span className="text-[10px] text-muted-foreground">{nights} night(s)</span></span>
                                      </label>
                                      <div className="mt-1 flex gap-3 pl-6 text-[11px]">
                                        <details><summary className="cursor-pointer text-primary">Cancellation</summary>{ci.pols.length ? <ul className="list-disc pl-4 mt-1">{ci.pols.map((p: any, k: number) => <li key={k}>{polText(p)}</li>)}</ul> : <p>No penalties returned.</p>}</details>
                                        <details><summary className="cursor-pointer text-primary">Taxes & fees</summary><div className="mt-1"><TaxLines node={{ taxes: sell?.taxes, fees: sell?.fees ?? rp.prices?.fees ?? rp.fees }} cur={currency} /></div></details>
                                        {rp.remarks?.length > 0 && <details><summary className="cursor-pointer text-primary">Remarks</summary><ul className="list-disc pl-4 mt-1">{rp.remarks.map((r: any, k: number) => <li key={k} className="whitespace-pre-line">{typeof r === "string" ? r : r.remark ?? JSON.stringify(r)}</li>)}</ul></details>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </section>

                  {hotelFacilities.length > 0 && <div id="supplier-amenities" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-primary/5 p-4 text-sm"><span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" />What's Included in Your Stay?</span>{hotelFacilities.slice(0, 8).map((f: any) => <span key={f.id} className="flex items-center gap-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{f.name}</span>)}</div>}
                  {desc && <details className="rounded-xl border border-border p-4 text-sm"><summary className="cursor-pointer font-semibold">About this hotel</summary><p className="mt-2 whitespace-pre-line text-muted-foreground">{desc}</p></details>}
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24">
                  <Card><CardContent className="space-y-3 p-4">
                    <h3 className="text-xl font-bold text-primary">Your Booking Summary</h3>
                    <div className="flex gap-3">{photos[0] && <img src={photos[0]} alt={stat.name} className="h-16 w-20 shrink-0 rounded-md object-cover" />}<div className="min-w-0"><p className="font-bold text-primary">{stat.name}</p><p className="text-xs text-muted-foreground">{Number(stat.rating) > 0 ? `${stat.rating} Star · ` : ""}{stat.location?.city?.name}</p></div></div>
                    <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs"><div><p className="text-muted-foreground">Check-in</p><p className="font-semibold">{fmtDay(checkIn)}</p></div><div><p className="text-muted-foreground">Check-out</p><p className="font-semibold">{fmtDay(addDays(checkIn, nights))}</p></div></div>
                    <div className="text-xs"><p className="text-muted-foreground">Guests</p><p className="font-semibold">{totalAdults} Adults{totalKids ? `, ${totalKids} Children` : ""} · {rooms.length} Room{rooms.length > 1 ? "s" : ""}</p></div>
                  </CardContent></Card>
                  {first && <Card><CardContent className="space-y-3 p-4">
                    <h3 className="font-bold text-primary">Selected Room & Rate Plan</h3>
                    <div className="flex gap-3">{firstImg && <img src={firstImg} alt="" className="h-16 w-20 shrink-0 rounded-md object-cover" />}<div className="text-sm"><p className="font-semibold">{first.room.roomName}</p><p className="text-xs text-muted-foreground">{first.rp.ratePlanName}</p><p className="text-xs">× {nights} Night{nights > 1 ? "s" : ""}{pickedList.length > 1 ? ` · ${pickedList.length} rooms` : ""}</p></div></div>
                    <div className="space-y-1 border-t pt-3 text-sm">
                      <h4 className="font-bold text-primary">Price Details</h4>
                      {pickedList.map((p, k) => <div key={k} className="flex justify-between text-xs"><span>{p.room.roomName}</span><span>{money(customerPrice(p.rp, currency)?.amount, customerPrice(p.rp, currency)?.currency ?? currency)}</span></div>)}
                      <div className="mt-2 flex justify-between rounded-lg bg-primary/10 p-2 font-bold"><span>Total Amount</span><span className="text-primary">{money(pickedTotal, pickedCur)}</span></div>
                      <p className="text-[10px] text-muted-foreground">Taxes and fees as shown on each rate.</p>
                    </div>
                  </CardContent></Card>}
                  {(remarks.length > 0 || staticPolicies.length > 0 || stat.settings?.checkIn) && <Card id="supplier-policies"><CardContent className="space-y-2 p-4 text-sm">
                    <h3 className="font-bold text-primary">Hotel Policies</h3>
                    <ul className="list-disc space-y-1 pl-5 text-xs">
                      {stat.settings?.checkIn && <li>Check-in: From {stat.settings.checkIn}</li>}
                      {stat.settings?.checkOut && <li>Check-out: By {stat.settings.checkOut}</li>}
                    </ul>
                    {(staticPolicies.length > 0 || remarks.length > 0) && <details className="text-xs"><summary className="cursor-pointer font-medium text-primary">View All Policies</summary>
                      {staticPolicies.map((p, k) => <div key={k} className="mt-1"><p className="font-medium">{p.title}</p><p className="whitespace-pre-line text-muted-foreground">{p.body}</p></div>)}
                      {remarks.map((r, k) => <p key={k} className="mt-1 whitespace-pre-line">{r}</p>)}
                    </details>}
                  </CardContent></Card>}
                  <Button size="lg" className="w-full" onClick={doPrebook} disabled={!prop || !allPicked || busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Continue to Payment</Button>
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Secure & Safe Payment</p>
                  <Card className="bg-primary/5"><CardContent className="space-y-2 p-4 text-sm">
                    <h3 className="font-bold text-primary">Why Book with Jaaga?</h3>
                    {["Verified Hotels", "Best Price Guarantee", "Flexible Cancellation", "24×7 Customer Support", "Secure Payments"].map(t => <p key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</p>)}
                  </CardContent></Card>
                  {coords && <iframe title={`${stat.name} map`} loading="lazy" className="h-48 w-full rounded-xl border border-border" src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.006},${coords.lng + 0.01},${coords.lat + 0.006}&layer=mapnik&marker=${coords.lat},${coords.lng}`} />}
                </aside>
              </div>
              );
            })()}

            {prebook && !confirmed && (() => {
              const lines = prebook.rooms.map((r: any, i: number) => {
                const a = prebook.customerRooms?.[i]?.retail ?? customerPrice(picked[i]?.rp ?? {}, currency) ?? { amount: null, currency };
                return { label: `${picked[i]?.room.roomName} – ${picked[i]?.rp.ratePlanName}`, amount: Number(a.amount ?? 0), cur: a.currency ?? currency };
              });
              const total = prebook.customerTotal ?? lines.reduce((s: number, l: any) => s + l.amount, 0);
              const settlementRequired = marketplace && prebook.customerRooms?.some((r: any) => r.disclosures?.payment?.charge !== "customer");
              const cur = lines[0]?.cur ?? currency;
              const goPay = () => {
                if (!lead.first.trim() || !lead.last.trim()) return toast.error("Enter the lead guest's first and last name");
                if (!/^\S+@\S+\.\S+$/.test(lead.email)) return toast.error("Enter a valid email");
                setStep("payment"); window.scrollTo({ top: 0, behavior: "smooth" });
              };
              const pay = () => {
                const num = card.number.replace(/\s/g, "");
                if (!luhn(num)) return toast.error("Card number is not valid");
                if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return toast.error("Expiry must be MM/YY");
                if (!/^\d{3,4}$/.test(card.cvv)) return toast.error("CVV must be 3–4 digits");
                if (!card.name.trim()) return toast.error("Enter the name on the card");
                doBook();
              };
              const fmtD = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
              const tAdults = rooms.reduce((s, r) => s + r.adults, 0);
              const tKids = rooms.flatMap(ages).length;
              const allPols = prebook.rooms.flatMap((r: any, i: number) => { const a = cancelInfo(r, checkIn).pols; return a.length ? a : cancelInfo(picked[i]?.rp ?? {}, checkIn).pols; });
              const freeCancel = prebook.rooms.every((_: any, i: number) => picked[i] && isFullyRefundable(picked[i].rp));
              const tile = "flex items-center gap-3 rounded-xl border border-border bg-card p-3";
              return (
              <div className="space-y-5">
                <BookingStepper current={step === "guests" ? 1 : 2} />
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-primary">{step === "guests" ? "Guest Details" : "Pay & Confirm Your Booking"}</h1>
                    <p className="text-sm text-muted-foreground">{step === "guests" ? `Tell us who's staying at ${stat.name}.` : `You're almost done! Complete your payment to confirm your stay at ${stat.name}.`}</p>
                  </div>
                  <div className="flex items-center gap-3"><Lock className="h-8 w-8 text-primary" /><div><p className="font-bold">Secure & Encrypted</p><p className="text-xs text-muted-foreground">Your details are sent securely.</p></div></div>
                </div>
                <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
                  <div className="space-y-4">
                    <Card><CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                      {photos[0] && <div className="relative shrink-0"><img src={photos[0]} alt={stat.name} className="h-40 w-full rounded-xl object-cover sm:w-64" /><span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-foreground/70 px-2 py-1 text-xs text-background"><Images className="h-3 w-3" />{photos.length} Photos</span></div>}
                      <div className="min-w-0 space-y-2">
                        <h2 className="text-2xl font-bold text-primary">{stat.name}</h2>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {Number(stat.rating) > 0 && <span className="flex">{Array.from({ length: Math.round(Number(stat.rating)) }, (_, k) => <Star key={k} className="h-4 w-4 fill-accent text-accent" />)}</span>}
                          <Badge variant="outline" className="border-primary/40 text-primary"><CheckCircle2 className="mr-1 h-3 w-3" />Verified Hotel</Badge>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-primary" />{[stat.location?.address, stat.location?.city?.name, placeLine].filter(Boolean).join(", ")}</p>
                        {hotelFacilities.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{hotelFacilities.slice(0, 5).map((f: any) => <span key={f.id} className="rounded-lg border border-border px-3 py-1.5 text-xs">{f.name}</span>)}</div>}
                      </div>
                    </CardContent></Card>

                    <Card><CardContent className="space-y-3 p-4">
                      <h3 className="flex items-center gap-2 text-xl font-bold text-primary"><CalendarDays className="h-5 w-5" />Your Stay Details</h3>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        <div className={tile}><CalendarDays className="h-6 w-6 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Check-in</p><p className="text-sm font-bold">{fmtD(checkIn)}</p>{stat.settings?.checkIn && <p className="text-xs">From {stat.settings.checkIn}</p>}</div></div>
                        <div className={tile}><CalendarDays className="h-6 w-6 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Check-out</p><p className="text-sm font-bold">{fmtD(addDays(checkIn, nights))}</p>{stat.settings?.checkOut && <p className="text-xs">By {stat.settings.checkOut}</p>}</div></div>
                        <div className={tile}><Users className="h-6 w-6 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Guests</p><p className="text-sm font-bold">{tAdults} Adult{tAdults > 1 ? "s" : ""}{tKids ? `, ${tKids} Child` : ""}</p></div></div>
                        <div className={tile}><BedDouble className="h-6 w-6 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Room</p><p className="text-sm font-bold">{rooms.length} Room{rooms.length > 1 ? "s" : ""}</p></div></div>
                        <div className={tile}><CalendarDays className="h-6 w-6 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Nights</p><p className="text-sm font-bold">{nights} Night{nights > 1 ? "s" : ""}</p></div></div>
                      </div>
                    </CardContent></Card>

                    <Card><CardContent className="space-y-3 p-4">
                      <h3 className="flex items-center gap-2 text-xl font-bold text-primary"><BedDouble className="h-5 w-5" />Room & Rate Plan</h3>
                      {prebook.rooms.map((r: any, i: number) => {
                        const img = staticRooms[String(picked[i]?.room.roomId)]?.images?.[0]?.uri;
                        return <div key={i} className="flex flex-col gap-3 border-t border-border pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center">
                          {img && <img src={img} alt="" className="h-28 w-full rounded-xl object-cover sm:w-40" />}
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-lg font-bold text-primary">{picked[i]?.room.roomName}</p>
                            <p className="text-xs text-muted-foreground">{rooms[i].adults} adult(s){ages(rooms[i]).length ? ` + ${ages(rooms[i]).length} child/infant` : ""}</p>
                            <div className="inline-block rounded-lg bg-primary/10 px-3 py-2 text-xs"><p className="font-semibold">{picked[i]?.rp.ratePlanName}</p><p>{BOARD[picked[i]?.rp.board] ?? picked[i]?.rp.board}{picked[i] && isFullyRefundable(picked[i].rp) ? " | Free cancellation" : ""}</p></div>
                            {r.priceChange && <p className="text-xs text-destructive">Price changed: {money(r.priceChange.fromAmount.amount, r.priceChange.fromAmount.currency)} → {money(r.priceChange.toAmount.amount, r.priceChange.toAmount.currency)}</p>}
                          </div>
                          <div className="text-right"><p className="text-xl font-bold">{money(lines[i].amount, lines[i].cur)}</p><p className="text-xs text-muted-foreground">for {nights} night{nights > 1 ? "s" : ""}</p></div>
                        </div>;
                      })}
                    </CardContent></Card>

                    {step === "guests" ? (<>
                      <section>
                        <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-primary"><User className="h-5 w-5 text-primary" /> Guest Details</h2>
                        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                          <div>
                            <p className="mb-3 font-bold text-foreground">Primary Guest (Room 1)</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div><Label>First Name <span className="text-destructive">*</span></Label><Input value={lead.first} readOnly={certification} placeholder="As per ID" onChange={(e) => setLead({ ...lead, first: e.target.value })} /></div>
                              <div><Label>Last Name <span className="text-destructive">*</span></Label><Input value={lead.last} readOnly={certification} placeholder="As per ID" onChange={(e) => setLead({ ...lead, last: e.target.value })} /></div>
                              <div><Label>Mobile Number</Label><Input value={lead.phone} placeholder="+91 98xxxxxxxx" onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></div>
                              <div><Label>Email ID <span className="text-destructive">*</span></Label><Input type="email" value={lead.email} placeholder="you@example.com" onChange={(e) => setLead({ ...lead, email: e.target.value })} /></div>
                            </div>
                          </div>
                          {rooms.map((rq, i) => (
                            <div key={i} className="space-y-2 border-t border-border pt-3">
                              <p className="font-bold text-foreground">Room {i + 1} Guests</p>
                              {[...Array.from({ length: rq.adults }, (_, a) => ({ k: `${i}-a${a}`, l: `Adult ${a + 1}` })), ...ages(rq).map((age, c) => ({ k: `${i}-c${c}`, l: age <= 3 ? `Infant (${age})` : `Child (${age})` }))].map((g) => (
                                <div key={g.k} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)]">
                                  <span className="col-span-2 pb-2 text-sm text-muted-foreground sm:col-span-1">{g.l}</span>
                                  <div><Label className="text-xs">First Name</Label><Input value={guests[g.k]?.first ?? ""} onChange={(e) => setGuests({ ...guests, [g.k]: { ...guests[g.k], first: e.target.value } as any })} /></div>
                                  <div><Label className="text-xs">Last Name</Label><Input value={guests[g.k]?.last ?? ""} onChange={(e) => setGuests({ ...guests, [g.k]: { ...guests[g.k], last: e.target.value } as any })} /></div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </section>
                      <section>
                        <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-primary"><FileText className="h-5 w-5 text-primary" /> Special Requests (Optional)</h2>
                        <div className="rounded-2xl border border-border bg-card p-3">
                          <Textarea rows={3} maxLength={256} value={special} onChange={(e) => setSpecial(e.target.value)} placeholder="e.g., Early check-in, high floor, extra pillows, anniversary setup, etc." className="border-0 shadow-none focus-visible:ring-0" />
                          <p className="text-right text-xs text-muted-foreground">{special.length}/256</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Special requests are sent to the hotel and are subject to hotel confirmation.</p>
                      </section>
                    </>) : (<Card className="border-primary/40"><CardContent className="space-y-3 p-4">
                      <h3 className="flex items-center gap-2 text-xl font-bold text-primary"><CreditCard className="h-5 w-5" />Choose Payment Method</h3>
                      <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
                        <div className="rounded-xl bg-primary p-3 text-primary-foreground"><p className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" />Credit / Debit Card</p><p className="text-xs opacity-90">Visa, Mastercard, RuPay, Amex</p></div>
                        <div className="space-y-2 rounded-xl border border-primary/40 p-3">
                          <p className="flex items-center gap-2 font-bold"><Lock className="h-4 w-4 text-primary" />Card — Secure & Instant</p>
                          {live ? <p className="text-xs text-muted-foreground">Your card guarantees the reservation. The hotel collects payment according to the selected rate; JaagaX does not charge this card now.</p> : <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                            <p className="font-medium">Sample payment — no money is charged.</p>
                            <p>Use test card <b>4111 1111 1111 1111</b>, any future expiry (e.g. 12/30), CVV 123.</p>
                            <Button size="sm" variant="secondary" onClick={() => setCard({ number: "4111 1111 1111 1111", expiry: "12/30", cvv: "123", name: `${lead.first} ${lead.last}`.trim() })}>Fill test card</Button>
                          </div>}
                          {settlementRequired && <p role="alert" className="text-sm text-destructive">This rate requires JaagaX supplier settlement, which is not enabled. Booking is unavailable until that payment arrangement is configured. No payment has been taken.</p>}
                          <Input placeholder="Card number" inputMode="numeric" maxLength={23} disabled={settlementRequired} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ") })} />
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="MM/YY" disabled={settlementRequired} maxLength={5} value={card.expiry} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }); }} />
                            <Input placeholder="CVV" disabled={settlementRequired} type="password" inputMode="numeric" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
                          </div>
                          <Input placeholder="Name on card" disabled={settlementRequired} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" />{live ? "Your card is sent securely to the hotel and is not stored." : "Card details stay in your browser; the booking uses HyperGuest's test payment."}</p>
                        </div>
                      </div>
                    </CardContent></Card>)}
                  </div>

                  <aside className="space-y-4 lg:sticky lg:top-24">
                    <Card><CardContent className="space-y-3 p-4 text-sm">
                      <h3 className="text-xl font-bold text-primary">Booking Summary</h3>
                      <div className="flex gap-3">{photos[0] && <img src={photos[0]} alt={stat.name} className="h-16 w-20 shrink-0 rounded-md object-cover" />}<div><p className="font-bold text-primary">{stat.name}</p><p className="text-xs text-muted-foreground">{stat.location?.city?.name}</p></div></div>
                      {prebook.rooms.map((_: any, i: number) => (
                        <div key={i} className="space-y-1 border-t border-border pt-2">
                          <p className="flex justify-between gap-2"><span className="font-semibold">{picked[i]?.room.roomName}</span><span className="whitespace-nowrap">{money(lines[i].amount, lines[i].cur)}</span></p>
                          <p className="text-xs text-muted-foreground">{picked[i]?.rp.ratePlanName} · {nights} night(s)</p>
                          <TaxLines node={prebook.customerRooms?.[i]?.disclosures ?? supplierDisclosures(picked[i]?.rp ?? {})} cur={currency} />
                          {(prebook.customerRooms?.[i]?.disclosures?.remarks ?? picked[i]?.rp.remarks ?? []).map((remark: any, k: number) => <p key={k} className="text-xs">{typeof remark === "string" ? remark : remark.remark ?? ""}</p>)}
                          {prebook.customerRooms?.[i]?.disclosures?.immediate === false && <p className="text-xs text-muted-foreground">On request — this room needs hotel approval.</p>}
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3 font-bold"><span>Total Payable Amount</span><span className="text-xl text-primary">{money(total, cur)}</span></div>
                    </CardContent></Card>
                    <Card><CardContent className="space-y-2 p-4 text-sm">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-primary"><CheckCircle2 className="h-5 w-5" />Cancellation & Policies</h3>
                      <ul className="space-y-1.5">
                        {freeCancel && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />Free cancellation available on this rate</li>}
                        {allPols.slice(0, 4).map((p: any, k: number) => <li key={k} className="flex gap-2 text-xs"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{polText(p)}</li>)}
                        {stat.settings?.checkIn && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />Check-in: From {stat.settings.checkIn}</li>}
                        {stat.settings?.checkOut && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />Check-out: By {stat.settings.checkOut}</li>}
                      </ul>
                      {(staticPolicies.length > 0 || remarks.length > 0) && <details className="text-xs"><summary className="cursor-pointer font-semibold text-primary">View All Policies →</summary>
                        {staticPolicies.map((p, k) => <div key={k} className="mt-1"><p className="font-medium">{p.title}</p><p className="whitespace-pre-line text-muted-foreground">{p.body}</p></div>)}
                        {remarks.map((r, k) => <p key={k} className="mt-1 whitespace-pre-line">{r}</p>)}
                      </details>}
                    </CardContent></Card>
                    <Card><CardContent className="space-y-2 p-4 text-sm">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-primary"><Info className="h-5 w-5" />Important Information</h3>
                      <ul className="list-disc space-y-1 pl-5 text-xs">
                        <li>Your booking is confirmed once the hotel accepts it.</li>
                        <li>Booking details appear in My Bookings on this page.</li>
                        <li>Please carry a valid government ID at check-in.</li>
                      </ul>
                    </CardContent></Card>
                    {step === "guests" && <Button size="lg" className="h-12 w-full text-base font-bold" onClick={goPay}>Continue to Payment <ArrowRight className="ml-1 h-5 w-5" /></Button>}
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold"><Lock className="h-4 w-4 text-primary" /> Secure &amp; Safe Payment</div>
                    <PaymentBadges />
                    <WhyBookCard />
                  </aside>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-primary/5 p-4">
                  <div className="flex items-center gap-3"><Lock className="h-8 w-8 text-primary" /><div><p className="font-bold">Secure Payment</p><p className="text-xs text-muted-foreground">Your details are protected with encrypted connections.</p></div></div>
                </div>
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center">
                  <div className="md:border-r md:border-border md:pr-6"><p className="text-sm">Amount to Pay</p><p className="text-3xl font-extrabold text-primary">{money(total, cur)}</p></div>
                  <p className="flex-1 text-xs text-muted-foreground">By proceeding, you agree to Jaaga's Terms & Conditions and Privacy Policy.</p>
                  {step === "guests"
                    ? <Button size="lg" className="md:min-w-80" onClick={goPay}>Continue to Payment</Button>
                    : <div className="flex gap-2"><Button variant="outline" size="lg" onClick={() => setStep("guests")} disabled={busy}>Back</Button><Button size="lg" className="md:min-w-80" onClick={pay} disabled={busy || settlementRequired}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}{busy ? "Confirming with hotel…" : `Pay ${money(total, cur)} & Confirm Booking`}</Button></div>}
                </div>
              </div>
              );
            })()}

            {confirmed && (
              <Card className="border-primary"><CardContent className="p-6 space-y-3 text-center">
                {confirmed.status === "confirmed" ? <CheckCircle2 className="h-12 w-12 text-primary mx-auto" /> : <Info className="h-12 w-12 text-muted-foreground mx-auto" />}
                <h2 className="text-xl font-semibold">Booking {confirmed.status}</h2>
                {!live && <p className="text-sm text-muted-foreground">Sample payment accepted — no money was charged.</p>}
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-left max-w-md mx-auto border rounded-md p-3">
                  <span className="text-muted-foreground">Hotel</span><span>{stat.name}</span>
                  <span className="text-muted-foreground">Booking ID</span><b>{confirmed.hg_booking_id}</b>
                  <span className="text-muted-foreground">Reference</span><span>{confirmed.agency_reference}</span>
                  <span className="text-muted-foreground">Dates</span><span>{confirmed.check_in} → {confirmed.check_out}</span>
                  <span className="text-muted-foreground">Lead guest</span><span>{lead.first} {lead.last}</span>
                  <span className="text-muted-foreground">Customer stay total</span><b>{money(confirmed.customer_total ?? confirmed.total_amount, confirmed.customer_currency ?? confirmed.total_currency)}</b>
                </div>
                <div className="text-left space-y-2">{(confirmed.raw?.rooms ?? []).map((r: any, i: number) => <p key={i} className="text-sm">Room {i + 1}: {r.status ?? confirmed.status}</p>)}{(confirmed.customer_disclosures?.rooms ?? []).map((r: any, i: number) => <div key={i}><TaxLines node={r} cur={confirmed.customer_currency} />{(r.remarks ?? []).map((remark: any, k: number) => <p key={k} className="text-xs">{typeof remark === "string" ? remark : remark.remark ?? ""}</p>)}</div>)}<BookingPolicy b={confirmed} timezone={stat?.settings?.timezone} /></div>
                {remarks.length > 0 && <ul className="list-disc pl-5 text-xs text-left">{remarks.map((r, i) => <li key={i} className="whitespace-pre-line">{r}</li>)}</ul>}
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => window.print()}>Print voucher</Button>
                  <Button onClick={() => { setConfirmed(null); setPrebook(null); setPicked({}); setStep("guests"); setCard({ number: "", expiry: "", cvv: "", name: "" }); }}>Book another</Button>
                </div>
              </CardContent></Card>
            )}

            {user && mine.length > 0 && (
              <Card><CardContent className="p-4 space-y-2">
                <h2 className="font-semibold">My bookings at this hotel</h2>
                {mine.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-2 text-sm">
                    <div>
                      <p className="font-medium">#{b.hg_booking_id ?? "pending"} · {b.check_in} → {b.check_out}</p>
                      {b.environment === "live" && b.test_label && b.status !== "cancelled" && <p className="text-xs text-destructive font-medium">Cancel by {new Date(new Date(b.created_at).getTime() + 7 * 86400000).toLocaleString()}</p>}
                      <p className="text-xs text-muted-foreground">{(b.rooms ?? []).map((r: any) => `${r.room} / ${r.rate}`).join(" + ")} · {money(b.customer_total ?? b.total_amount, b.customer_currency ?? b.total_currency ?? "")}</p>
                      {b.status !== "cancelled" ? <BookingPolicy b={b} timezone={stat?.settings?.timezone} /> : <p className="text-xs text-muted-foreground">Cancelled{b.cancelled_at ? ` on ${new Date(b.cancelled_at).toLocaleString()}` : ""}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "secondary" : "outline"}>{b.status}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => refresh(b)}><RefreshCw className="h-4 w-4" /></Button>
                      {["confirmed", "pending", "partial"].includes(b.status) && <Button size="sm" variant="outline" onClick={() => cancel(b)}>Cancel</Button>}
                    </div>
                  </div>
                ))}
              </CardContent></Card>
            )}
          </>
        )}
        <div className="mt-8"><TrustStrip /></div>
      </div>
      <Footer />
    </div>
  );
}
