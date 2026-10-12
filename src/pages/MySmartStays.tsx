import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hotel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listMyBookings, statusText, inr, payForBooking, errMsg } from "@/services/smartStayService";
import { toast } from "sonner";
import FamousPlaces from "@/components/smartstays/FamousPlaces";

export default function MySmartStays() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const load = (u: string) => listMyBookings(u).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) { setUid(data.user.id); load(data.user.id); } else setRows([]); });
  }, []);

  const pay = async (b: any) => {
    try { await payForBooking(b.id, { name: b.guest_name, email: b.guest_email, contact: b.guest_phone }, b.snapshot?.title); toast.success("Payment received"); }
    catch (e) { toast.error(errMsg(e)); }
    if (uid) load(uid);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-3"><Link to="/smart-stays"><ArrowLeft className="h-4 w-4 mr-1" />Smart Stays</Link></Button>
        <h1 className="text-2xl font-bold mb-5">My Smart Stays</h1>
        {rows === null ? <p className="text-muted-foreground">Loading…</p> : !uid ? <p>Please sign in to see your bookings.</p> : rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No Smart Stay bookings yet.</Card>
        ) : rows.map((b) => (
          <Card key={b.id} className="p-5 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-lg">{b.snapshot?.title}</h2>
                <p className="text-xs text-muted-foreground">Ref {b.booking_ref} · {inr(b.total)}</p>
              </div>
              <Badge variant={b.status === "CONFIRMED" ? "default" : b.status === "MANUAL_REVIEW" ? "destructive" : "secondary"}>{statusText[b.status] ?? b.status}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {(b.reservations ?? []).sort((x: any, y: any) => x.check_in.localeCompare(y.check_in)).map((r: any) => (
                <div key={r.id} className="flex items-start gap-2 text-sm bg-muted/50 rounded-md p-2">
                  <Hotel className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">{r.destination} · {r.hotel_name}</div>
                    <div className="text-muted-foreground">{r.room_name} × {r.num_rooms} · {r.check_in} → {r.check_out}</div>
                    {r.confirmation_ref && <div className="text-xs">Hotel ref: {r.confirmation_ref}</div>}
                  </div>
                  <Badge variant="outline">{statusText[r.status] ?? r.status}</Badge>
                </div>
              ))}
            </div>
            {["PENDING_PAYMENT", "PAYMENT_PROCESSING"].includes(b.status) && <Button size="sm" className="mt-3" onClick={() => pay(b)}>Complete payment</Button>}
            {b.status !== "CANCELLED" && <FamousPlaces destinations={(b.reservations ?? []).map((r: any) => r.destination)} />}
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Timeline</summary>
              <ul className="mt-2 space-y-1">
                {(b.events ?? []).sort((x: any, y: any) => x.created_at.localeCompare(y.created_at)).map((e: any, i: number) => (
                  <li key={i}>{new Date(e.created_at).toLocaleString("en-IN")} — {statusText[e.event] ?? e.event}</li>
                ))}
              </ul>
            </details>
          </Card>
        ))}
      </main>
    </div>
  );
}
