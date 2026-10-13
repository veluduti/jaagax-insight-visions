import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, MapPin, Star, Plus, Trash2, Info, RefreshCw } from "lucide-react";

const BOARD: Record<string, string> = { RO: "Room only", BB: "Bed & breakfast", HB: "Half board", FB: "Full board", AI: "All inclusive" };
const NATIONALITIES = ["IN", "GB", "US", "JP", "IL", "AE", "DE", "FR"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const TESTS = ["", "#1 Pre-book 1 room 1 adult", "#2 1 room 1 adult", "#3 1 room 2A+1C+1I", "#4 2 rooms 2A / 1A", "#5 2 rooms 1A1C / 2A1I", "#6 2 rooms different types/rates", "#7 Same-day 2 adults", "#8 Currency conversion", "#9 Nationality", "#10 Cancel refundable", "#11 Cancel non-refundable", "#12 Package rate"];

type RoomReq = { adults: number; children: number[]; infants: number };
const call = async (body: any) => {
  const { data, error } = await supabase.functions.invoke("hyperguest", { body });
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

function cancelInfo(rp: any, checkIn: string) {
  const pols: any[] = rp.cancellationPolicies ?? [];
  const daysUntil = Math.floor((Date.parse(checkIn) - Date.parse(today())) / 86400000);
  const nowPenalty = pols.filter((p) => Number(p.daysBefore) >= daysUntil).sort((a, b) => b.amount - a.amount)[0];
  const nonRef = pols.some((p) => p.penaltyType === "percent" && Number(p.amount) >= 100 && Number(p.daysBefore) >= daysUntil);
  return { pols, nonRef, nowPenalty };
}
const polText = (p: any) =>
  `${Number(p.daysBefore) === 0 ? "On arrival day" : `From ${p.daysBefore} day(s) before check-in`}${p.cancellationDeadlineHour ? ` (${p.cancellationDeadlineHour})` : ""}: ${p.penaltyType === "percent" ? `${p.amount}% charge` : p.penaltyType === "nights" ? `${p.amount} night(s) charge` : `${p.amount} charge`}`;

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

export default function HyperGuestProperty() {
  const { propertyId = "19912" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const [stat, setStat] = useState<any>(null);
  const [checkIn, setCheckIn] = useState(addDays(today(), 30));
  const [nights, setNights] = useState(1);
  const [nationality, setNationality] = useState("IN");
  const [currency, setCurrency] = useState("INR");
  const [rooms, setRooms] = useState<RoomReq[]>([{ adults: 1, children: [], infants: 0 }]);
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Record<number, { room: any; rp: any }>>({});
  const [prebook, setPrebook] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [lead, setLead] = useState({ first: "", last: "", email: "", phone: "" });
  const [guests, setGuests] = useState<Record<string, { first: string; last: string }>>({});
  const [special, setSpecial] = useState("");
  const [testLabel, setTestLabel] = useState("");
  const [ref, setRef] = useState("");
  const [confirmed, setConfirmed] = useState<any>(null);
  const [mine, setMine] = useState<any[]>([]);

  useEffect(() => { call({ action: "static", propertyId: Number(propertyId) }).then((r) => setStat(r.data)); }, [propertyId]);
  useEffect(() => {
    if (!user) return;
    setLead((l) => ({ ...l, email: l.email || user.email || "", phone: l.phone || (user as any).phone || "" }));
    loadMine();
  }, [user]);
  const loadMine = async () => {
    const { data } = await (supabase as any).from("hyperguest_bookings").select("*").eq("property_id", Number(propertyId)).order("created_at", { ascending: false }).limit(30);
    setMine(data ?? []);
  };

  const prop = result?.results?.[0];
  const staticRooms: Record<string, any> = useMemo(() => Object.fromEntries((stat?.rooms ?? []).map((r: any) => [String(r.id), r])), [stat]);
  const desc = stat?.descriptions?.find((d: any) => d.language === "en_US" && d.type === "general")?.description;
  const hotelFacilities = (stat?.facilities ?? []).filter((f: any) => f.type !== "room");
  const photos = [...(stat?.images ?? []), ...(stat?.rooms ?? []).flatMap((r: any) => r.images ?? [])].map((i: any) => i.uri).filter(Boolean);

  const search = async () => {
    setSearching(true); setPicked({}); setPrebook(null); setConfirmed(null);
    const r = await call({ action: "search", propertyId: Number(propertyId), checkIn, nights, nationality, currency, rooms: rooms.map((x) => ({ adults: x.adults, childAges: ages(x) })) });
    setSearching(false);
    if (r.error) return toast.error(r.error);
    setResult(r.data);
    if (!r.data?.results?.length) toast.info("No rooms available for these dates and guests.");
  };

  const roomsFor = (i: number) => {
    const k = paxKey(rooms[i].adults, ages(rooms[i]));
    return (prop?.rooms ?? []).filter((r: any) => paxKey(r.searchedPax?.adults ?? 0, r.searchedPax?.children ?? []) === k);
  };

  const requireLogin = () => {
    toast.warning("Please sign in to book this hotel");
    nav(`/auth?redirect=${encodeURIComponent(loc.pathname)}`);
  };

  const doPrebook = async () => {
    if (!user) return requireLogin();
    setBusy(true);
    const sel = rooms.map((_, i) => picked[i]);
    const r = await call({
      action: "prebook",
      search: { dates: { from: checkIn, to: addDays(checkIn, nights) }, propertyId: Number(propertyId), nationality, pax: rooms.map((x) => ({ adults: x.adults, children: ages(x) })) },
      rooms: sel.map((s) => ({ roomCode: s.room.roomTypeCode, rateCode: s.rp.ratePlanCode, expectedPrice: { amount: s.rp.payment?.chargeAmount?.price, currency: s.rp.payment?.chargeAmount?.currency } })),
    });
    setBusy(false);
    if (r.error) return toast.error(r.error);
    setPrebook(r.data);
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
          guests: list.map((g, gi) => ({ birthDate: g.age >= 18 ? "1990-01-01" : birth(g.age), title: g.age >= 18 ? "MR" : "C", name: { first: guests[g.k]?.first || (gi === 0 && i === 0 ? lead.first : `Guest${gi + 1}`), last: guests[g.k]?.last || lead.last } })),
          specialRequests: special.trim() ? [special.trim()] : [],
        };
      }),
    };
    const r = await call({
      action: "book", agencyReference: ref, payload, nationality, currency, testLabel: testLabel || null, specialRequests: special || null,
      roomsSummary: rooms.map((rq, i) => ({ room: sel[i].room.roomName, rate: sel[i].rp.ratePlanName, board: sel[i].rp.board, adults: rq.adults, children: rq.children, infants: rq.infants })),
    });
    setBusy(false);
    if (r.error) return toast.error(r.error);
    if (r.data?.pending) { toast.info(r.data.message); loadMine(); return; }
    setConfirmed(r.data.booking);
    toast.success(r.data.duplicate ? "This booking was already made — showing it." : "Booking confirmed by HyperGuest");
    loadMine();
  };

  const cancel = async (b: any) => {
    const p = await call({ action: "cancel", id: b.id });
    if (p.error) return toast.error(p.error);
    if (!confirm(`Cancel booking ${b.hg_booking_id}? Cancellation charge now: ${money(p.data.charge, p.data.currency ?? "")}`)) return;
    const r = await call({ action: "cancel", id: b.id, confirm: true });
    if (r.error) return toast.error(r.error);
    toast.success("Booking cancelled"); loadMine();
  };
  const refresh = async (b: any) => { await call({ action: "refresh", id: b.id }); loadMine(); };

  const allPicked = rooms.every((_, i) => picked[i]);
  const remarks: string[] = prop?.remarks ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-5xl space-y-6">
        {!stat ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : (
          <>
            <div>
              <Badge variant="secondary" className="mb-2">HyperGuest property #{stat.id}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold">{stat.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-4 w-4" />{stat.location?.address}, {stat.location?.city?.name} · <Star className="h-4 w-4" />{stat.rating}</p>
              <p className="text-xs text-muted-foreground mt-1">Check-in {stat.settings?.checkIn} · Check-out {stat.settings?.checkOut}</p>
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto snap-x pb-2">
                {photos.map((u, i) => <img key={i} src={u} alt="" loading="lazy" className="h-44 w-64 object-cover rounded-lg snap-start flex-shrink-0 bg-muted" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />)}
              </div>
            )}
            {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
            {hotelFacilities.length > 0 && (
              <Card><CardContent className="p-4"><h2 className="font-semibold mb-2">Hotel facilities</h2>
                <div className="flex flex-wrap gap-1.5">{hotelFacilities.map((f: any) => <Badge key={f.id} variant="outline">{f.name}</Badge>)}</div>
              </CardContent></Card>
            )}

            <Card><CardContent className="p-4 space-y-3">
              <h2 className="font-semibold">Search rooms</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="text-xs">Check-in<Input type="date" min={today()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label>
                <label className="text-xs">Nights<Input type="number" min={1} max={30} value={nights} onChange={(e) => setNights(Math.max(1, +e.target.value))} /></label>
                <label className="text-xs">Guest nationality<select className="w-full h-10 rounded-md border bg-background px-2" value={nationality} onChange={(e) => setNationality(e.target.value)}>{NATIONALITIES.map((n) => <option key={n}>{n}</option>)}</select></label>
                <label className="text-xs">Currency<select className="w-full h-10 rounded-md border bg-background px-2" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((n) => <option key={n}>{n}</option>)}</select></label>
              </div>
              {rooms.map((r, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-2">
                  <span className="text-sm font-medium w-16">Room {i + 1}</span>
                  <label className="text-xs">Adults<Input className="w-20" type="number" min={1} max={4} value={r.adults} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, adults: Math.max(1, +e.target.value) } : x))} /></label>
                  <label className="text-xs">Child ages (4–17, comma)<Input className="w-36" value={r.children.join(",")} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, children: e.target.value.split(",").map((s) => parseInt(s)).filter((n) => n >= 4 && n <= 17) } : x))} /></label>
                  <label className="text-xs">Infants (0–3)<Input className="w-20" type="number" min={0} max={2} value={r.infants} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, infants: Math.max(0, +e.target.value) } : x))} /></label>
                  {rooms.length > 1 && <Button size="icon" variant="ghost" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <div className="flex gap-2">
                {rooms.length < 4 && <Button variant="outline" size="sm" onClick={() => setRooms([...rooms, { adults: 1, children: [], infants: 0 }])}><Plus className="h-4 w-4 mr-1" />Add room</Button>}
                <Button onClick={search} disabled={searching}>{searching && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Search</Button>
              </div>
            </CardContent></Card>

            {remarks.length > 0 && (
              <Card className="border-primary/40"><CardContent className="p-4"><h2 className="font-semibold flex items-center gap-1 mb-2"><Info className="h-4 w-4" />Hotel remarks</h2>
                <ul className="list-disc pl-5 text-sm space-y-1">{remarks.map((r, i) => <li key={i} className="whitespace-pre-line">{r}</li>)}</ul>
              </CardContent></Card>
            )}

            {prop && rooms.map((rq, i) => (
              <div key={i} className="space-y-3">
                <h2 className="font-semibold">Room {i + 1}: {rq.adults} adult(s){rq.children.length ? `, ${rq.children.length} child(ren)` : ""}{rq.infants ? `, ${rq.infants} infant(s)` : ""}</h2>
                {roomsFor(i).length === 0 && <p className="text-sm text-muted-foreground">No rooms fit these guests.</p>}
                {roomsFor(i).map((room: any) => {
                  const st = staticRooms[String(room.roomId)];
                  return (
                    <Card key={room.roomId}><CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        {st?.images?.[0]?.uri && <img src={st.images[0].uri} alt="" className="h-20 w-28 object-cover rounded-md bg-muted" />}
                        <div>
                          <h3 className="font-semibold">{room.roomName}</h3>
                          <p className="text-xs text-muted-foreground">{room.settings?.roomSize ? `${room.settings.roomSize} m² · ` : ""}Max {room.settings?.maxOccupancy} guests · {(room.settings?.beddingConfigurations ?? []).map((b: any) => `${b.quantity} ${b.type}`).join(", ")} · {room.numberOfAvailableRooms} left</p>
                          {st?.facilities?.length > 0 && <p className="text-xs mt-1"><span className="font-medium">Room facilities:</span> {st.facilities.map((f: any) => f.name).join(", ")}</p>}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        {room.ratePlans.map((rp: any) => {
                          const sell = rp.prices?.sell, bar = rp.prices?.bar;
                          const shown = bar?.searchCurrency ?? bar?.price ?? sell?.searchCurrency ?? sell?.price;
                          const shownCur = (bar?.searchCurrency ?? sell?.searchCurrency) != null ? currency : (bar ?? sell)?.currency;
                          const ci = cancelInfo(rp, checkIn);
                          const sel = picked[i]?.rp === rp && picked[i]?.room === room;
                          return (
                            <div key={`${rp.ratePlanId}-${rp.ratePlanCode}`} className={`rounded-lg border p-3 space-y-2 ${sel ? "border-primary ring-1 ring-primary" : ""}`}>
                              <div className="flex justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm">{rp.ratePlanName}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <Badge variant="secondary">{BOARD[rp.board] ?? rp.board}</Badge>
                                    <Badge variant={ci.nonRef ? "destructive" : "default"}>{ci.nonRef ? "Non-refundable" : "Refundable"}</Badge>
                                    {rp.ratePlanInfo?.isPackageRate && <Badge variant="outline">Package rate</Badge>}
                                    {rp.ratePlanInfo?.isPromotion && <Badge variant="outline">Promotion</Badge>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{money(shown, shownCur)}</p>
                                  <p className="text-[10px] text-muted-foreground">{nights} night(s){(bar ?? sell)?.currency !== shownCur ? ` · ${money((bar ?? sell)?.price, (bar ?? sell)?.currency)}` : ""}</p>
                                </div>
                              </div>
                              <details className="text-xs"><summary className="cursor-pointer font-medium">Cancellation policy</summary>
                                {ci.pols.length ? <ul className="list-disc pl-4 mt-1">{ci.pols.map((p: any, k: number) => <li key={k}>{polText(p)}</li>)}</ul> : <p>No penalties returned.</p>}
                              </details>
                              <details className="text-xs"><summary className="cursor-pointer font-medium">Taxes & fees</summary><div className="mt-1"><TaxLines node={{ taxes: sell?.taxes, fees: sell?.fees ?? rp.prices?.fees ?? rp.fees }} cur={currency} /></div></details>
                              {rp.remarks?.length > 0 && <details className="text-xs" open><summary className="cursor-pointer font-medium">Rate remarks</summary><ul className="list-disc pl-4 mt-1">{rp.remarks.map((r: any, k: number) => <li key={k} className="whitespace-pre-line">{typeof r === "string" ? r : r.remark ?? JSON.stringify(r)}</li>)}</ul></details>}
                              <Button size="sm" className="w-full" variant={sel ? "default" : "outline"} onClick={() => { setPicked({ ...picked, [i]: { room, rp } }); setPrebook(null); }}>{sel ? "Selected" : "Select"}</Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent></Card>
                  );
                })}
              </div>
            ))}

            {prop && allPicked && !prebook && !confirmed && (
              <Button size="lg" className="w-full" onClick={doPrebook} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Check final price</Button>
            )}

            {prebook && !confirmed && (
              <Card className="border-primary"><CardContent className="p-4 space-y-3">
                <h2 className="font-semibold">Review & guest details</h2>
                {prebook.rooms.map((r: any, i: number) => (
                  <div key={i} className="text-sm border rounded-md p-2 space-y-1">
                    <p className="font-medium">Room {i + 1}: {picked[i]?.room.roomName} – {picked[i]?.rp.ratePlanName} ({BOARD[picked[i]?.rp.board] ?? picked[i]?.rp.board})</p>
                    {r.priceChange && <p className="text-destructive text-xs">Price changed: {money(r.priceChange.fromAmount.amount, r.priceChange.fromAmount.currency)} → {money(r.priceChange.toAmount.amount, r.priceChange.toAmount.currency)}</p>}
                    <p className="text-xs">Room price (BAR): {money(r.prices?.bar?.price ?? r.prices?.sell?.price, (r.prices?.bar ?? r.prices?.sell)?.currency)}</p>
                    <TaxLines node={{ taxes: r.prices?.sell?.taxes, fees: r.prices?.fees ?? r.prices?.sell?.fees }} cur={(r.prices?.sell)?.currency} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Lead first name" value={lead.first} onChange={(e) => setLead({ ...lead, first: e.target.value })} />
                  <Input placeholder="Lead last name" value={lead.last} onChange={(e) => setLead({ ...lead, last: e.target.value })} />
                  <Input placeholder="Email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
                  <Input placeholder="Phone" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
                </div>
                {rooms.map((rq, i) => (
                  <div key={i} className="space-y-1"><p className="text-xs font-medium">Room {i + 1} guests</p>
                    {[...Array.from({ length: rq.adults }, (_, a) => ({ k: `${i}-a${a}`, l: `Adult ${a + 1}` })), ...ages(rq).map((age, c) => ({ k: `${i}-c${c}`, l: age <= 3 ? `Infant (${age})` : `Child (${age})` }))].map((g) => (
                      <div key={g.k} className="grid grid-cols-[90px_1fr_1fr] gap-2 items-center">
                        <span className="text-xs text-muted-foreground">{g.l}</span>
                        <Input placeholder="First name" value={guests[g.k]?.first ?? ""} onChange={(e) => setGuests({ ...guests, [g.k]: { ...guests[g.k], first: e.target.value } as any })} />
                        <Input placeholder="Last name" value={guests[g.k]?.last ?? ""} onChange={(e) => setGuests({ ...guests, [g.k]: { ...guests[g.k], last: e.target.value } as any })} />
                      </div>
                    ))}
                  </div>
                ))}
                <div>
                  <Textarea rows={2} maxLength={500} placeholder="Special requests (e.g. late check-in, high floor)" value={special} onChange={(e) => setSpecial(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Special requests are sent to the hotel and are subject to the hotel's confirmation — they are not guaranteed.</p>
                </div>
                <label className="text-xs block">Certification test (optional, for logs)
                  <select className="w-full h-10 rounded-md border bg-background px-2" value={testLabel} onChange={(e) => setTestLabel(e.target.value)}>{TESTS.map((t) => <option key={t} value={t}>{t || "—"}</option>)}</select>
                </label>
                <p className="text-xs text-muted-foreground">Test environment: no money is charged. HyperGuest's test payment is used.</p>
                <Button size="lg" className="w-full" onClick={doBook} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{busy ? "Confirming with hotel (can take a few minutes)…" : "Confirm booking"}</Button>
              </CardContent></Card>
            )}

            {confirmed && (
              <Card className="border-primary"><CardContent className="p-4 space-y-1">
                <h2 className="font-semibold">Booking {confirmed.status}</h2>
                <p className="text-sm">HyperGuest booking ID: <b>{confirmed.hg_booking_id}</b> · Reference {confirmed.agency_reference}</p>
                <p className="text-sm">Total: {money(confirmed.total_amount, confirmed.total_currency)}</p>
                {remarks.length > 0 && <ul className="list-disc pl-5 text-xs mt-2">{remarks.map((r, i) => <li key={i} className="whitespace-pre-line">{r}</li>)}</ul>}
              </CardContent></Card>
            )}

            {user && mine.length > 0 && (
              <Card><CardContent className="p-4 space-y-2">
                <h2 className="font-semibold">My bookings at this hotel</h2>
                {mine.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-2 text-sm">
                    <div>
                      <p className="font-medium">#{b.hg_booking_id ?? "pending"} · {b.check_in} → {b.check_out} {b.test_label && <Badge variant="outline" className="ml-1">{b.test_label}</Badge>}</p>
                      <p className="text-xs text-muted-foreground">{(b.rooms ?? []).map((r: any) => `${r.room} / ${r.rate}`).join(" + ")} · {money(b.total_amount, b.total_currency ?? "")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "secondary" : "outline"}>{b.status}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => refresh(b)}><RefreshCw className="h-4 w-4" /></Button>
                      {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => cancel(b)}>Cancel</Button>}
                    </div>
                  </div>
                ))}
              </CardContent></Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
