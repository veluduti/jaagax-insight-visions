import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquare, Star, XCircle, LifeBuoy, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadMyTrips, tripStage, holdMinutesLeft, sendTripMessage, submitReview, cancelTrip, type Trip, type TripStage,
} from "@/services/hospitality/tripsService";

const STAGE: Record<TripStage, { label: string; hint: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  awaiting_payment: { label: "Awaiting payment", hint: "Complete payment to keep this room.", variant: "destructive" },
  upcoming: { label: "Upcoming", hint: "You're all set. Message the property if you need anything.", variant: "default" },
  staying: { label: "Staying now", hint: "Need help during your stay? Message the property.", variant: "default" },
  completed: { label: "Completed", hint: "Thanks for staying. Tell others how it was.", variant: "secondary" },
  cancelled: { label: "Cancelled", hint: "This booking was cancelled.", variant: "outline" },
};
const inr = (n: number | null) => (n ? `₹${Math.round(n).toLocaleString("en-IN")}` : "N/A");

export default function MyTrips() {
  const [data, setData] = useState<{ trips: Trip[]; reviewed: Set<string> } | null>(null);
  const [dialog, setDialog] = useState<{ mode: "message" | "review" | "cancel"; trip: Trip } | null>(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user)); }, []);
  const load = useCallback(() => loadMyTrips().then(setData).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!dialog) return;
    if (dialog.mode !== "review" && !text.trim()) return toast.error("Please write a few words");
    setBusy(true);
    try {
      if (dialog.mode === "message") { await sendTripMessage(dialog.trip, text.trim()); toast.success("Message sent to the property"); }
      if (dialog.mode === "review") { await submitReview(dialog.trip, rating, text.trim()); toast.success("Thanks for your review"); }
      if (dialog.mode === "cancel") { await cancelTrip(dialog.trip, text.trim()); toast.success("Booking cancelled"); }
      setDialog(null); setText(""); setRating(5); load();
    } catch (e: any) { toast.error(e.message || "Something went wrong"); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navigation />
      <main className="container mx-auto max-w-3xl px-3 pt-24">
        <h1 className="text-2xl font-bold">My trips</h1>
        <p className="mb-4 text-sm text-muted-foreground">Every stay you've booked, what's next and how to get help.</p>
        {signedIn === false ? (
          <Card><CardContent className="p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Please sign in to see your trips.</p>
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          </CardContent></Card>
        ) : !data ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> :
          data.trips.length === 0 ? (
            <Card><CardContent className="p-6 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="mb-3 text-sm text-muted-foreground">No trips yet.</p>
              <Button asChild><Link to="/hotels">Find a stay</Link></Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {data.trips.map((t) => {
                const stage = tripStage(t); const s = STAGE[stage];
                return (
                  <Card key={t.id}><CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{t.hotel_name || "Your stay"}</div>
                        <div className="text-xs text-muted-foreground">{t.room_type || "Room"} · {t.check_in} → {t.check_out} · {t.num_guests || 1} guest(s)</div>
                        {t.booking_reference && <div className="text-xs text-muted-foreground">Ref {t.booking_reference}</div>}
                      </div>
                      <div className="text-right">
                        <Badge variant={s.variant}>{s.label}</Badge>
                        <div className="mt-1 text-sm font-medium">{inr(t.total_amount)}</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stage === "awaiting_payment"
                        ? holdMinutesLeft(t) > 0 ? `Room held for ${holdMinutesLeft(t)} more minute(s). Complete payment to keep it.` : "The hold has ended. The room may be released shortly."
                        : stage === "cancelled" && t.cancellation_reason ? `Cancelled: ${t.cancellation_reason}` : s.hint}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stage !== "cancelled" && <Button size="sm" variant="outline" onClick={() => setDialog({ mode: "message", trip: t })}><MessageSquare className="mr-1 h-4 w-4" />Message property</Button>}
                      {stage === "completed" && !data.reviewed.has(t.id) && <Button size="sm" onClick={() => setDialog({ mode: "review", trip: t })}><Star className="mr-1 h-4 w-4" />Write a review</Button>}
                      {(stage === "upcoming" || stage === "awaiting_payment") && <Button size="sm" variant="ghost" onClick={() => setDialog({ mode: "cancel", trip: t })}><XCircle className="mr-1 h-4 w-4" />Cancel</Button>}
                      <Button asChild size="sm" variant="ghost"><a href={`mailto:support@jaagax.com?subject=Help with booking ${t.booking_reference || t.id}`}><LifeBuoy className="mr-1 h-4 w-4" />JAAGA support</a></Button>
                    </div>
                  </CardContent></Card>
                );
              })}
            </div>
          )}
      </main>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>
            {dialog?.mode === "message" ? "Message the property" : dialog?.mode === "review" ? "How was your stay?" : "Cancel this booking?"}
          </DialogTitle></DialogHeader>
          {dialog?.mode === "review" && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)}>
                  <Star className={`h-7 w-7 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          )}
          {dialog?.mode === "cancel" && <p className="text-sm text-muted-foreground">Refunds follow the property's cancellation policy.</p>}
          <Textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder={dialog?.mode === "message" ? "e.g. We'll arrive late, around 11 pm" : dialog?.mode === "review" ? "What did you like? (optional)" : "Reason for cancelling"} />
          <Button disabled={busy} onClick={submit} variant={dialog?.mode === "cancel" ? "destructive" : "default"}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {dialog?.mode === "message" ? "Send" : dialog?.mode === "review" ? "Submit review" : "Cancel booking"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
