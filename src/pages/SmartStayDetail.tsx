import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, Hotel, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPublished, getQuote, createBooking, payForBooking, errMsg, inr } from "@/services/smartStayService";
import FamousPlaces from "@/components/smartstays/FamousPlaces";

export default function SmartStayDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [guest, setGuest] = useState({ name: "", phone: "", email: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPublished(id!).then((p) => { setPkg(p); setLoading(false); });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) setGuest((g) => ({ ...g, email: data.user!.email ?? "", name: (data.user!.user_metadata as any)?.full_name ?? "" }));
    });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [id]);

  const snap = pkg?.revision?.snapshot ?? {};
  const itinerary = (snap.itinerary ?? []) as any[];
  const stays = (snap.stays ?? []) as any[];
  const expired = quote && new Date(quote.expires_at).getTime() < now;
  const secsLeft = quote ? Math.max(0, Math.round((new Date(quote.expires_at).getTime() - now) / 1000)) : 0;

  const fetchQuote = async () => {
    if (!user) { toast.error("Please sign in to check prices and book"); nav("/auth?redirect=" + encodeURIComponent(location.pathname)); return; }
    setBusy(true);
    try { setQuote(await getQuote(id!)); setAgree(false); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const book = async () => {
    if (!guest.name.trim() || !/^\+?\d{10,13}$/.test(guest.phone.replace(/\s/g, ""))) { toast.error("Enter your name and a valid phone number"); return; }
    setBusy(true);
    try {
      const bid = await createBooking(quote.id, guest);
      await payForBooking(bid, { name: guest.name, email: guest.email, contact: guest.phone }, snap.title);
      toast.success("Payment received. Your hotels are being confirmed.");
      nav("/my-smart-stays");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navigation /><p className="pt-28 text-center text-muted-foreground">Loading…</p></div>;
  if (!pkg?.revision) return <div className="min-h-screen bg-background"><Navigation /><p className="pt-28 text-center text-muted-foreground">This package is not available.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-3"><Link to="/smart-stays"><ArrowLeft className="h-4 w-4 mr-1" />All Smart Stays</Link></Button>
        {snap.images?.[0] && <img src={snap.images[0]} alt={snap.title} className="w-full h-56 md:h-72 object-cover rounded-xl mb-5" />}
        <h1 className="text-3xl font-bold">{snap.title}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-4 w-4" />{itinerary.map((s) => s.destination).join(" → ")}</p>
        {snap.description && <p className="mt-4 whitespace-pre-line">{snap.description}</p>}
        {snap.inclusions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">{snap.inclusions.map((x: string) => <Badge key={x} variant="secondary">{x}</Badge>)}</div>
        )}

        <div className="grid md:grid-cols-[1fr_340px] gap-6 mt-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Itinerary</h2>
            {itinerary.map((s, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{i + 1}. {s.destination}</h3>
                  <span className="text-sm text-muted-foreground">{s.arrival} → {s.departure}</span>
                </div>
                {s.notes && <p className="text-sm text-muted-foreground mt-1">{s.notes}</p>}
                <div className="mt-3 space-y-2">
                  {stays.filter((x) => x.stop === i + 1).map((x, j) => {
                    const q = quote?.breakdown?.stays?.find((y: any) => y.room_id === x.room_id && y.check_in === x.check_in);
                    return (
                      <div key={j} className="flex items-start gap-2 text-sm rounded-md bg-muted/50 p-2">
                        <Hotel className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <div className="font-medium">{x.hotel_name}</div>
                          <div className="text-muted-foreground">{x.room_name} · {x.num_rooms} room(s) · {x.adults} adult(s){x.children ? `, ${x.children} child(ren)` : ""} · {x.nights} night(s){x.meal_plan ? ` · ${x.meal_plan}` : ""}</div>
                          <div className="text-muted-foreground">{x.check_in} → {x.check_out}</div>
                        </div>
                        {q && (q.available ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />)}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
            <FamousPlaces destinations={itinerary.map(s => s.destination)} />
            {snap.cancellation_policy && <Card className="p-4"><h3 className="font-semibold mb-1">Cancellation terms</h3><p className="text-sm text-muted-foreground whitespace-pre-line">{snap.cancellation_policy}</p></Card>}
          </div>

          <Card className="p-5 h-fit md:sticky md:top-24 space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Package price</div>
              <div className="text-3xl font-bold text-primary">{inr(quote?.total ?? pkg.revision.selling_price)}</div>
              <div className="text-xs text-muted-foreground">Includes all hotels and taxes. One payment.</div>
            </div>
            {!quote || expired ? (
              <Button className="w-full" onClick={fetchQuote} disabled={busy}>{expired ? "Quote expired — refresh price" : "Check availability & price"}</Button>
            ) : !quote.all_available ? (
              <div className="text-sm text-destructive">Some hotels are sold out for these dates, so this package can't be booked right now.</div>
            ) : (
              <>
                <div className="text-sm space-y-1 border-t pt-3">
                  {quote.breakdown.stays.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between gap-2"><span className="truncate">{s.hotel_name}</span><span>{inr(s.amount)}</span></div>
                  ))}
                  <div className="flex justify-between text-muted-foreground"><span>Taxes</span><span>{inr(quote.taxes)}</span></div>
                  {Number(quote.breakdown.markup) > 0 && <div className="flex justify-between text-muted-foreground"><span>Package services</span><span>{inr(quote.breakdown.markup)}</span></div>}
                  <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{inr(quote.total)}</span></div>
                  {quote.breakdown.price_changed && <p className="text-xs text-amber-500">Hotel rates changed since this package was published — the total above is the current price.</p>}
                  <p className="text-xs text-muted-foreground">Price held for {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, "0")}</p>
                </div>
                <Input placeholder="Full name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
                <Input placeholder="Mobile number" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
                <Input placeholder="Email (for confirmation)" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
                <label className="flex items-start gap-2 text-xs"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} /> I accept the price and the cancellation terms.</label>
                <Button className="w-full" disabled={!agree || busy} onClick={book}>{busy ? "Please wait…" : `Pay ${inr(quote.total)}`}</Button>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
