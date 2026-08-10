import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import { Loader2, Plus, Search, CalendarRange, Phone, Mail, IndianRupee, LogIn, LogOut, XCircle, Save } from "lucide-react";
import { addDays, differenceInDays, format, isAfter, isBefore } from "date-fns";

type Booking = {
  id: string; hotel_id: string; guest_name: string; guest_email: string | null;
  guest_phone: string | null; check_in: string; check_out: string; num_rooms: number;
  num_guests: number | null; total_amount: number; status: string; payment_status: string;
  booking_reference: string | null; room_type: string | null; special_requests: string | null;
  booking_type: string | null;
};

type Note = { id: string; note: string; author_id: string | null; created_at: string };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-400" },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-400" },
  checked_in: { label: "Checked in", cls: "bg-blue-500/15 text-blue-400" },
  checked_out: { label: "Checked out", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400" },
};

export default function PartnerReservations() {
  const { loading: gate, hotelId, userId } = usePartnerHotel();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState("upcoming");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  useEffect(() => {
    if (!hotelId) return;
    const load = async () => {
      const { data } = await (supabase as any).from("hotel_bookings")
        .select("*").eq("hotel_id", hotelId).order("check_in", { ascending: true });
      setBookings(data || []);
      setLoading(false);
    };
    load();

    // Live-update the list as new bookings/payments come in
    const channel = supabase
      .channel(`reservations-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_bookings", filter: `hotel_id=eq.${hotelId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);


  const filtered = useMemo(() => {
    const today = new Date();
    const term = q.trim().toLowerCase();
    return bookings.filter(b => {
      if (term) {
        const hay = `${b.guest_name} ${b.guest_email} ${b.guest_phone} ${b.booking_reference || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      const ci = new Date(b.check_in), co = new Date(b.check_out);
      if (tab === "upcoming") return b.status !== "cancelled" && isAfter(ci, today);
      if (tab === "inhouse") return b.status !== "cancelled" && !isAfter(ci, today) && isAfter(co, today);
      if (tab === "past") return b.status === "checked_out" || (isBefore(co, today) && b.status !== "cancelled");
      if (tab === "cancelled") return b.status === "cancelled";
      return true;
    });
  }, [bookings, tab, q]);

  const openBooking = async (b: Booking) => {
    setSelected(b);
    const { data } = await (supabase as any).from("hotel_booking_notes")
      .select("*").eq("booking_id", b.id).order("created_at", { ascending: false });
    setNotes(data || []);
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await (supabase as any).from("hotel_bookings").update({ status }).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    setBookings(bs => bs.map(b => b.id === selected.id ? { ...b, status } : b));
    setSelected({ ...selected, status });
    toast.success(`Marked ${STATUS_LABELS[status]?.label || status}`);
  };

  const addNote = async () => {
    if (!selected || !newNote.trim() || !hotelId) return;
    const { data, error } = await (supabase as any).from("hotel_booking_notes")
      .insert({ booking_id: selected.id, hotel_id: hotelId, author_id: userId, note: newNote.trim() })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setNotes(n => [data as Note, ...n]);
    setNewNote("");
  };

  const createBooking = async () => {
    if (!hotelId || !draft) return;
    if (!draft.guest_name || !draft.check_in || !draft.check_out) {
      toast.error("Guest name and dates required"); return;
    }
    setCreating(true);
    try {
      const payload: any = {
        hotel_id: hotelId,
        guest_name: draft.guest_name,
        guest_email: draft.guest_email || null,
        guest_phone: draft.guest_phone || null,
        check_in: draft.check_in, check_out: draft.check_out,
        num_rooms: Number(draft.num_rooms) || 1,
        num_guests: Number(draft.num_guests) || 1,
        total_amount: Number(draft.total_amount) || 0,
        room_type: draft.room_type || null,
        special_requests: draft.special_requests || null,
        status: "confirmed", payment_status: "pending",
        booking_type: "walk_in",
        booking_reference: `WALK-${Date.now().toString().slice(-6)}`,
      };
      const { data, error } = await (supabase as any).from("hotel_bookings").insert(payload).select().single();
      if (error) throw error;
      setBookings(bs => [data as Booking, ...bs]);
      setDraft(null);
      toast.success("Booking created");
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setCreating(false); }
  };

  if (gate || loading) {
    return (
      <div className="min-h-screen bg-background">
        <PartnerNav /><PartnerSubNav />
        <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav /><PartnerSubNav />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-emerald-400">Reservations</p>
            <h1 className="text-3xl font-bold tracking-tight">All bookings</h1>
          </div>
          <Button onClick={() => setDraft({
            check_in: format(new Date(), "yyyy-MM-dd"),
            check_out: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            num_rooms: 1, num_guests: 2,
          })} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="mr-1.5 h-4 w-4" /> New booking
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="inhouse">In-house</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative md:ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="w-full pl-8 md:w-80" placeholder="Search guest / phone / ref" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarRange className="h-10 w-10 text-emerald-400" />
              <p className="text-lg font-semibold">No reservations</p>
              <p className="text-sm text-muted-foreground">Bookings will appear here as they come in.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(b => {
              const nights = Math.max(1, differenceInDays(new Date(b.check_out), new Date(b.check_in)));
              const s = STATUS_LABELS[b.status] || { label: b.status, cls: "bg-muted" };
              return (
                <button key={b.id} onClick={() => openBooking(b)} className="text-left">
                  <Card className="border border-border/60 bg-background/60 backdrop-blur transition hover:border-emerald-500/40">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{b.guest_name}</p>
                          <Badge className={s.cls}>{s.label}</Badge>
                          {b.booking_reference && <span className="text-xs text-muted-foreground">#{b.booking_reference}</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(b.check_in), "dd MMM")} → {format(new Date(b.check_out), "dd MMM")} · {nights}n · {b.num_rooms} room(s)
                          {b.room_type && ` · ${b.room_type}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">₹{Number(b.total_amount || 0).toLocaleString()}</p>
                        <p className="text-[11px] text-muted-foreground">{b.payment_status}</p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>Booking details</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xl font-bold">{selected.guest_name}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {selected.guest_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.guest_phone}</span>}
                  {selected.guest_email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.guest_email}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 p-3 text-sm">
                <Info label="Check-in" value={format(new Date(selected.check_in), "dd MMM yyyy")} />
                <Info label="Check-out" value={format(new Date(selected.check_out), "dd MMM yyyy")} />
                <Info label="Rooms" value={selected.num_rooms} />
                <Info label="Guests" value={selected.num_guests || "—"} />
                <Info label="Room type" value={selected.room_type || "—"} />
                <Info label="Amount" value={<span className="inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(selected.total_amount || 0).toLocaleString()}</span>} />
              </div>
              {selected.special_requests && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Special requests</p>
                  {selected.special_requests}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => changeStatus("checked_in")}><LogIn className="mr-1 h-3.5 w-3.5" />Check in</Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus("checked_out")}><LogOut className="mr-1 h-3.5 w-3.5" />Check out</Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus("confirmed")}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus("cancelled")}><XCircle className="mr-1 h-3.5 w-3.5 text-red-400" />Cancel</Button>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Internal notes</p>
                <div className="flex gap-2">
                  <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add note…" />
                  <Button onClick={addNote} className="bg-emerald-500 hover:bg-emerald-600">Add</Button>
                </div>
                <div className="mt-3 space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="rounded-md border border-border/60 p-2 text-sm">
                      <p>{n.note}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{format(new Date(n.created_at), "dd MMM, HH:mm")}</p>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Manual booking */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New walk-in booking</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div><Label>Guest name *</Label><Input value={draft.guest_name || ""} onChange={e => setDraft({ ...draft, guest_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={draft.guest_phone || ""} onChange={e => setDraft({ ...draft, guest_phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={draft.guest_email || ""} onChange={e => setDraft({ ...draft, guest_email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Check-in *</Label><Input type="date" value={draft.check_in} onChange={e => { const v = e.target.value; setDraft({ ...draft, check_in: v, check_out: draft.check_out && new Date(draft.check_out) <= new Date(v) ? nextDayISO(v) : draft.check_out }); }} /></div>
                <div><Label>Check-out *</Label><Input type="date" min={nextDayISO(draft.check_in)} value={draft.check_out} onChange={e => { const v = e.target.value; if (v && draft.check_in && !isValidDateRangeISO(draft.check_in, v)) { toast.error(CHECKOUT_AFTER_CHECKIN_MSG); return; } setDraft({ ...draft, check_out: v }); }} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Rooms</Label><Input type="number" value={draft.num_rooms} onChange={e => setDraft({ ...draft, num_rooms: e.target.value })} /></div>
                <div><Label>Guests</Label><Input type="number" value={draft.num_guests} onChange={e => setDraft({ ...draft, num_guests: e.target.value })} /></div>
                <div><Label>Amount ₹</Label><Input type="number" value={draft.total_amount || ""} onChange={e => setDraft({ ...draft, total_amount: e.target.value })} /></div>
              </div>
              <div><Label>Room type</Label><Input value={draft.room_type || ""} onChange={e => setDraft({ ...draft, room_type: e.target.value })} /></div>
              <div><Label>Special requests</Label><Textarea rows={2} value={draft.special_requests || ""} onChange={e => setDraft({ ...draft, special_requests: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={createBooking} disabled={creating} className="bg-emerald-500 hover:bg-emerald-600">
              {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
