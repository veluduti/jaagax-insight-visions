import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CalendarDays,
  BedDouble,
  Users,
  LogIn,
  LogOut,
  Brush,
  IndianRupee,
  MapPin,
  ChevronRight,
  Phone,
  Ban,
  CheckCircle2,
  Wrench,
  FileText,
  Printer,
  Pencil,
  XCircle,
  Clock,
} from "lucide-react";
import { format, differenceInDays, isSameDay } from "date-fns";

type Booking = {
  id: string;
  hotel_id: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: string;
  num_rooms: number;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  room_type?: string | null;
  room_number?: string | null;
  num_guests?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  booking_reference?: string | null;
  special_requests?: string | null;
  invoice_url?: string | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  actual_check_in_at?: string | null;
  actual_check_out_at?: string | null;
  extra_charges?: number | null;
  amount_paid?: number | null;
  housekeeping_status?: string | null;
  housekeeping_staff?: string | null;
  room_cleaned_at?: string | null;
};

type RoomType = {
  id: string;
  room_type: string;
  total_units: number | null;
  is_active: boolean | null;
};

const SELECT_COLS =
  "id,hotel_id,check_in,check_out,total_amount,status,num_rooms,num_guests,guest_name,guest_email,guest_phone,room_type,room_number,payment_status,payment_method,booking_reference,special_requests,invoice_url,cancellation_reason,created_at,updated_at,actual_check_in_at,actual_check_out_at,extra_charges,amount_paid,housekeeping_status,housekeeping_staff,room_cleaned_at";

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const low = (v?: string | null) => String(v || "").toLowerCase();
const isCancelled = (b: Booking) => low(b.status) === "cancelled";
const isNoShow = (b: Booking) => ["no_show", "noshow"].includes(low(b.status));
const gross = (b: Booking) => Number(b.total_amount || 0) + Number(b.extra_charges || 0);
const due = (b: Booking) => Math.max(0, gross(b) - Number(b.amount_paid || 0));
const isPending = (b: Booking) => low(b.payment_status) !== "paid" && low(b.payment_status) !== "refunded" && due(b) > 0;
const isCheckedIn = (b: Booking) => !!b.actual_check_in_at && !b.actual_check_out_at;
const isCheckedOut = (b: Booking) => !!b.actual_check_out_at;
const needsCleaning = (b: Booking) => isCheckedOut(b) && low(b.housekeeping_status) !== "clean";

function nights(b: Booking) {
  const n = differenceInDays(new Date(b.check_out), new Date(b.check_in));
  return Math.max(1, isNaN(n) ? 1 : n);
}
function safeDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
}
function safeTime(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : format(d, "dd MMM, hh:mm a");
}
function roomLabel(b: Booking) {
  return b.room_number ? `Room ${b.room_number}` : b.room_type || "Room";
}

export default function PartnerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("Your property");
  const [hotelCity, setHotelCity] = useState("");
  const [hotelStatus, setHotelStatus] = useState("");
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<
    null | "checkins" | "checkouts" | "inhouse" | "clean" | "pending"
  >(null);
  const [roomView, setRoomView] = useState<
    null | "available" | "occupied" | "cleaning" | "blocked" | "oos" | "total"
  >(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [payFor, setPayFor] = useState<Booking | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [editFor, setEditFor] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({ room_number: "", extra_charges: "0", special_requests: "" });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        nav("/partners/login", { replace: true });
        return;
      }

      const { data: app } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,status,pms_setup_completed,hotel_name,approved_hotel_id,city")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!app) return nav("/partners/kyc", { replace: true });
      if (app.status !== "approved") return nav("/partners/status", { replace: true });
      if (!app.pms_setup_completed) return nav("/partners/pms-setup", { replace: true });

      setHotelName(app.hotel_name || "Your property");
      setHotelCity(app.city || "");
      setHotelStatus(app.status || "");

      if (app.approved_hotel_id) {
        const { data: h } = await (supabase as any)
          .from("partner_hotels")
          .select("city,status")
          .eq("id", app.approved_hotel_id)
          .maybeSingle();
        if (h?.city) setHotelCity(h.city);
        if (h?.status) setHotelStatus(h.status);

        const { data: rms } = await (supabase as any)
          .from("hotel_rooms")
          .select("id,room_type,total_units,is_active")
          .eq("hotel_id", app.approved_hotel_id);
        setRooms(rms || []);

        const { data: bks } = await (supabase as any)
          .from("hotel_bookings")
          .select(SELECT_COLS)
          .eq("hotel_id", app.approved_hotel_id)
          .order("check_in", { ascending: true })
          .limit(500);
        setBookings(bks || []);
      }

      setLoading(false);
    })();
  }, [nav]);

  const totalRooms = useMemo(
    () => rooms.reduce((s, r) => s + (r.total_units || 0), 0),
    [rooms],
  );
  const oosRooms = useMemo(
    () => rooms.filter((r) => r.is_active === false).reduce((s, r) => s + (r.total_units || 0), 0),
    [rooms],
  );

  const day = useMemo(() => {
    const d = date;
    const all = bookings;
    const active = all.filter((b) => !isCancelled(b) && !isNoShow(b));

    // Arrivals for the day that have not been checked in yet stay in the list;
    // once checked in they move to in-house.
    const arrivals = active.filter((b) => isSameDay(new Date(b.check_in), d));
    const checkins = arrivals.filter((b) => !b.actual_check_in_at);
    const departures = active.filter((b) => isSameDay(new Date(b.check_out), d));
    const checkouts = departures.filter((b) => !b.actual_check_out_at);

    const inhouse = active.filter(
      (b) =>
        isCheckedIn(b) ||
        (!b.actual_check_in_at &&
          !b.actual_check_out_at &&
          new Date(b.check_in) < d &&
          new Date(b.check_out) > d),
    );

    const cleaning = active.filter(needsCleaning);
    const pending = active.filter(isPending);

    const paymentsReceived = active
      .filter((b) => b.updated_at && isSameDay(new Date(b.updated_at), d))
      .reduce((s, b) => s + Number(b.amount_paid || 0), 0);
    const pendingAmount = pending.reduce((s, b) => s + due(b), 0);
    const cancelled = all.filter((b) => isCancelled(b) && isSameDay(new Date(b.check_in), d));
    const noShows = all.filter((b) => isNoShow(b) && isSameDay(new Date(b.check_in), d));

    const occupiedRooms = inhouse.reduce((s, b) => s + (b.num_rooms || 1), 0);
    const cleaningRooms = cleaning.reduce((s, b) => s + (b.num_rooms || 1), 0);
    const blockedRooms = 0;
    const availableRooms = Math.max(
      0,
      totalRooms - occupiedRooms - cleaningRooms - blockedRooms - oosRooms,
    );

    const reservations = all.filter(
      (b) =>
        isSameDay(new Date(b.check_in), d) ||
        isSameDay(new Date(b.check_out), d) ||
        (b.created_at && isSameDay(new Date(b.created_at), d)) ||
        (new Date(b.check_in) < d && new Date(b.check_out) > d),
    );

    return {
      arrivals,
      checkins,
      departures,
      checkouts,
      inhouse,
      cleaning,
      pending,
      pendingAmount,
      paymentsReceived,
      cancelled,
      noShows,
      occupiedRooms,
      cleaningRooms,
      blockedRooms,
      availableRooms,
      reservations,
    };
  }, [bookings, date, totalRooms, oosRooms]);

  const isToday = isSameDay(date, new Date());
  const dayLabel = isToday ? "Today" : format(date, "dd MMM");

  const patch = async (id: string, values: Record<string, any>, msg: string) => {
    setBusy(id);
    try {
      const payload = { ...values, updated_at: new Date().toISOString() };
      const { error } = await (supabase as any).from("hotel_bookings").update(payload).eq("id", id);
      if (error) throw error;
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, ...payload } : b)));
      setDetail((d) => (d && d.id === id ? { ...d, ...payload } : d));
      toast.success(msg);
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const doCheckIn = (b: Booking) =>
    patch(
      b.id,
      { actual_check_in_at: new Date().toISOString(), status: "checked_in" },
      `${b.guest_name || "Guest"} checked in`,
    );

  const doCheckOut = (b: Booking) =>
    patch(
      b.id,
      {
        actual_check_out_at: new Date().toISOString(),
        status: "completed",
        housekeeping_status: "cleaning",
      },
      `${b.guest_name || "Guest"} checked out · room sent to housekeeping`,
    );

  const markClean = (b: Booking) =>
    patch(
      b.id,
      { housekeeping_status: "clean", room_cleaned_at: new Date().toISOString() },
      `${roomLabel(b)} is ready`,
    );

  const cancelBooking = (b: Booking) =>
    patch(b.id, { status: "cancelled", cancelled_at: new Date().toISOString() }, "Booking cancelled");

  const openPay = (b: Booking) => {
    setPayAmount(String(due(b) || ""));
    setPayMethod(low(b.payment_method) || "cash");
    setPayFor(b);
  };

  const submitPayment = async () => {
    if (!payFor) return;
    const amt = Number(payAmount) || 0;
    if (amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const paid = Number(payFor.amount_paid || 0) + amt;
    const status = paid >= gross(payFor) ? "paid" : "partial";
    const ok = await patch(
      payFor.id,
      { amount_paid: paid, payment_status: status, payment_method: payMethod },
      status === "paid" ? "Payment collected in full" : "Partial payment recorded",
    );
    if (ok) setPayFor(null);
  };

  const markPaidInFull = async (b: Booking) => {
    const ok = await patch(
      b.id,
      { amount_paid: gross(b), payment_status: "paid" },
      "Marked as paid",
    );
    if (ok) setPayFor(null);
  };

  const openEdit = (b: Booking) => {
    setEditForm({
      room_number: b.room_number || "",
      extra_charges: String(Number(b.extra_charges || 0)),
      special_requests: b.special_requests || "",
    });
    setEditFor(b);
  };

  const submitEdit = async () => {
    if (!editFor) return;
    const ok = await patch(
      editFor.id,
      {
        room_number: editForm.room_number.trim() || null,
        extra_charges: Number(editForm.extra_charges) || 0,
        special_requests: editForm.special_requests.trim() || null,
      },
      "Booking updated",
    );
    if (ok) setEditFor(null);
  };

  const printInvoice = (b: Booking) => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return toast.error("Allow pop-ups to print the invoice");
    w.document.write(`<!doctype html><html><head><title>Invoice ${b.booking_reference || b.id.slice(0, 8)}</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{font-size:20px;margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:14px}
.tot{font-weight:700}</style></head><body>
<h1>${hotelName}</h1><div>${hotelCity}</div>
<h2 style="font-size:16px;margin-top:24px">Invoice ${b.booking_reference || b.id.slice(0, 8)}</h2>
<table>
<tr><th>Guest</th><td>${b.guest_name || "-"}</td></tr>
<tr><th>Room</th><td>${roomLabel(b)}</td></tr>
<tr><th>Stay</th><td>${safeDate(b.check_in)} → ${safeDate(b.check_out)} (${nights(b)} night(s))</td></tr>
<tr><th>Room charges</th><td>${inr(Number(b.total_amount || 0))}</td></tr>
<tr><th>Extra charges</th><td>${inr(Number(b.extra_charges || 0))}</td></tr>
<tr><th>Paid</th><td>${inr(Number(b.amount_paid || 0))}</td></tr>
<tr class="tot"><th>Balance due</th><td>${inr(due(b))}</td></tr>
</table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const callGuest = (b: Booking) => {
    if (!b.guest_phone) return toast.error("No contact number on this booking");
    window.location.href = `tel:${b.guest_phone}`;
  };

  const roomListFor = (kind: NonNullable<typeof roomView>) => {
    if (kind === "occupied") return day.inhouse;
    if (kind === "cleaning") return day.cleaning;
    return [] as Booking[];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PartnerNav />
        <PartnerSubNav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">{hotelName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {hotelCity && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {hotelCity}
                </span>
              )}
              {hotelCity && hotelStatus && <span className="text-border">•</span>}
              {hotelStatus && (
                <Badge className="bg-emerald-500/15 capitalize text-emerald-400 hover:bg-emerald-500/15">
                  {hotelStatus === "approved" ? "Active" : hotelStatus.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
                Back to today
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {isToday ? "Today" : format(date, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Operational cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi
            icon={<LogIn className="h-4 w-4" />}
            label={`${dayLabel}'s check-ins`}
            value={day.checkins.reduce((s, b) => s + (b.num_guests || 1), 0)}
            sub={`${day.checkins.length} arrival(s) pending`}
            onClick={() => setView("checkins")}
          />
          <Kpi
            icon={<LogOut className="h-4 w-4" />}
            label={`${dayLabel}'s check-outs`}
            value={day.checkouts.reduce((s, b) => s + (b.num_guests || 1), 0)}
            sub={`${day.checkouts.length} departure(s) pending`}
            onClick={() => setView("checkouts")}
          />
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label="In-house guests"
            value={day.inhouse.reduce((s, b) => s + (b.num_guests || 1), 0)}
            sub={`${day.inhouse.length} stay(s)`}
            onClick={() => setView("inhouse")}
          />
          <Kpi
            icon={<Brush className="h-4 w-4" />}
            label="Rooms to clean"
            value={day.cleaningRooms}
            sub={`${day.cleaning.length} room(s) pending`}
            onClick={() => setView("clean")}
          />
          <Kpi
            icon={<IndianRupee className="h-4 w-4" />}
            label="Pending payments"
            value={day.pending.length}
            sub={inr(day.pendingAmount)}
            onClick={() => setView("pending")}
          />
        </div>

        {/* Day summary (informational only) */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">
            {format(date, "EEEE, dd MMM yyyy")} · Day summary
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Mini label="Check-ins" value={day.arrivals.length} />
            <Mini label="Check-outs" value={day.departures.length} />
            <Mini label="In-house" value={day.inhouse.length} />
            <Mini label="Payments received" value={inr(day.paymentsReceived)} />
            <Mini label="Pending payments" value={inr(day.pendingAmount)} />
            <Mini label="Cancelled" value={day.cancelled.length} />
            <Mini label="No shows" value={day.noShows.length} />
          </div>
        </section>

        {/* Reservations for the day */}
        <section className="mt-6">
          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-emerald-400" /> {dayLabel}'s reservations
              </p>
              {day.reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations for this date.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {day.reservations.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setDetail(b)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.guest_name || "Guest"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.booking_reference || b.id.slice(0, 8)} · {roomLabel(b)} ·{" "}
                          {safeDate(b.check_in)} → {safeDate(b.check_out)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PayBadge b={b} />
                        <StatusBadge b={b} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Pending payments + room status */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="border border-border/60 bg-background/60 backdrop-blur lg:col-span-2">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <IndianRupee className="h-4 w-4 text-amber-400" /> Pending payments
              </p>
              {day.pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending payments. All settled.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {day.pending.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                      <button onClick={() => setDetail(b)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{b.guest_name || "Guest"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.booking_reference || b.id.slice(0, 8)} · {roomLabel(b)}
                        </p>
                      </button>
                      <p className="shrink-0 text-sm font-semibold">{inr(due(b))}</p>
                      <Button size="sm" onClick={() => openPay(b)}>
                        Collect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <BedDouble className="h-4 w-4 text-emerald-400" /> Room status
              </p>
              <div className="space-y-2">
                <RoomRow
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  label="Available"
                  value={day.availableRooms}
                  onClick={() => setRoomView("available")}
                />
                <RoomRow
                  icon={<Users className="h-4 w-4 text-sky-400" />}
                  label="Occupied"
                  value={day.occupiedRooms}
                  onClick={() => setRoomView("occupied")}
                />
                <RoomRow
                  icon={<Brush className="h-4 w-4 text-amber-400" />}
                  label="Cleaning"
                  value={day.cleaningRooms}
                  onClick={() => setRoomView("cleaning")}
                />
                <RoomRow
                  icon={<Ban className="h-4 w-4 text-muted-foreground" />}
                  label="Blocked"
                  value={day.blockedRooms}
                  onClick={() => setRoomView("blocked")}
                />
                <RoomRow
                  icon={<Wrench className="h-4 w-4 text-red-400" />}
                  label="Out of service"
                  value={oosRooms}
                  onClick={() => setRoomView("oos")}
                />
                <div className="mt-3 border-t border-border/50 pt-3">
                  <RoomRow
                    icon={<BedDouble className="h-4 w-4" />}
                    label="Total rooms"
                    value={totalRooms}
                    onClick={() => setRoomView("total")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Arrivals */}
      <Dialog open={view === "checkins"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arrivals · {format(date, "dd MMM yyyy")}</DialogTitle>
            <DialogDescription>{day.checkins.length} guest(s) yet to check in</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {day.checkins.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending arrivals.</p>
            )}
            {day.checkins.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{b.guest_name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground">
                      Booking {b.booking_reference || b.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roomLabel(b)} · {b.num_rooms || 1} room(s)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.num_guests || 1} guest(s)
                    </p>
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Expected from 2:00 PM
                    </p>
                    {b.guest_phone && (
                      <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {b.guest_phone}
                      </p>
                    )}
                    {b.special_requests && (
                      <p className="text-sm text-amber-400">Note: {b.special_requests}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <PayBadge b={b} />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => callGuest(b)}>
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setView(null);
                          setDetail(b);
                        }}
                      >
                        View Booking
                      </Button>
                      <Button size="sm" disabled={busy === b.id} onClick={() => doCheckIn(b)}>
                        {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check-In"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Departures */}
      <Dialog open={view === "checkouts"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Departures · {format(date, "dd MMM yyyy")}</DialogTitle>
            <DialogDescription>{day.checkouts.length} guest(s) yet to check out</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {day.checkouts.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending departures.</p>
            )}
            {day.checkouts.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{b.guest_name || "Guest"}</p>
                    <p className="text-sm text-muted-foreground">{roomLabel(b)}</p>
                    <p className="text-sm text-muted-foreground">
                      Stay: {nights(b)} night(s) ({safeDate(b.check_in)} → {safeDate(b.check_out)})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Extra charges: {inr(Number(b.extra_charges || 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending amount: {inr(due(b))}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <PayBadge b={b} />
                    <div className="flex flex-wrap justify-end gap-2">
                      {due(b) > 0 && (
                        <Button size="sm" variant="outline" onClick={() => openPay(b)}>
                          Collect Payment
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => printInvoice(b)}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> Invoice
                      </Button>
                      <Button size="sm" disabled={busy === b.id} onClick={() => doCheckOut(b)}>
                        {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check-Out"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* In-house */}
      <Dialog open={view === "inhouse"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>In-house guests</DialogTitle>
            <DialogDescription>{format(date, "dd MMM yyyy")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {day.inhouse.length === 0 && (
              <p className="text-sm text-muted-foreground">No guests in-house.</p>
            )}
            {day.inhouse.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setView(null);
                  setDetail(b);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-left transition hover:border-emerald-500/40 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.guest_name || "Guest"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roomLabel(b)} · {b.num_guests || 1} guest(s) · {safeDate(b.check_in)} →{" "}
                    {safeDate(b.check_out)}
                  </p>
                </div>
                <StatusBadge b={b} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Housekeeping */}
      <Dialog open={view === "clean"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rooms to clean</DialogTitle>
            <DialogDescription>{day.cleaning.length} room(s) awaiting housekeeping</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {day.cleaning.length === 0 && (
              <p className="text-sm text-muted-foreground">All rooms are clean.</p>
            )}
            {day.cleaning.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{roomLabel(b)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Last guest: {b.guest_name || "Guest"} · Status:{" "}
                    {b.housekeeping_status || "cleaning"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Housekeeping: {b.housekeeping_staff || "Unassigned"}
                  </p>
                </div>
                <Button size="sm" disabled={busy === b.id} onClick={() => markClean(b)}>
                  {busy === b.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Mark as Clean"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending payments list */}
      <Dialog open={view === "pending"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pending payments</DialogTitle>
            <DialogDescription>{inr(day.pendingAmount)} outstanding</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {day.pending.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
            )}
            {day.pending.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.guest_name || "Guest"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.booking_reference || b.id.slice(0, 8)} · {roomLabel(b)} ·{" "}
                    {b.payment_method || "method not set"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{inr(due(b))}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === b.id}
                    onClick={() =>
                      patch(
                        b.id,
                        {
                          amount_paid: gross(b),
                          payment_status: "paid",
                          payment_method: "cash",
                        },
                        "Cash collected",
                      )
                    }
                  >
                    Collect Cash
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === b.id}
                    onClick={() =>
                      patch(
                        b.id,
                        {
                          amount_paid: gross(b),
                          payment_status: "paid",
                          payment_method: "card",
                        },
                        "Card payment collected",
                      )
                    }
                  >
                    Collect Card
                  </Button>
                  <Button size="sm" disabled={busy === b.id} onClick={() => markPaidInFull(b)}>
                    Mark as Paid
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Room status lists */}
      <Dialog open={!!roomView} onOpenChange={(o) => !o && setRoomView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {roomView === "oos" ? "Out of service rooms" : `${roomView} rooms`}
            </DialogTitle>
            <DialogDescription>{format(date, "dd MMM yyyy")}</DialogDescription>
          </DialogHeader>

          {(roomView === "occupied" || roomView === "cleaning") && (
            <div className="space-y-2">
              {roomListFor(roomView).length === 0 && (
                <p className="text-sm text-muted-foreground">No rooms in this state.</p>
              )}
              {roomListFor(roomView).map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setRoomView(null);
                    setDetail(b);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-left transition hover:border-emerald-500/40 hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{roomLabel(b)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.guest_name || "Guest"} · {safeDate(b.check_in)} → {safeDate(b.check_out)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {(roomView === "available" || roomView === "total" || roomView === "oos") && (
            <div className="space-y-2">
              {rooms.length === 0 && (
                <p className="text-sm text-muted-foreground">No room types configured yet.</p>
              )}
              {rooms
                .filter((r) => (roomView === "oos" ? r.is_active === false : true))
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.room_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.is_active === false ? "Out of service" : "In service"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{r.total_units || 0} unit(s)</span>
                  </div>
                ))}
              {roomView === "available" && (
                <p className="pt-2 text-xs text-muted-foreground">
                  {day.availableRooms} of {totalRooms} rooms are free for {format(date, "dd MMM")}.
                </p>
              )}
            </div>
          )}

          {roomView === "blocked" && (
            <p className="text-sm text-muted-foreground">
              No rooms are currently blocked. Block rooms from PMS Settings.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Reservation detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.guest_name || "Reservation"}</DialogTitle>
            <DialogDescription>
              {detail?.booking_reference || detail?.id.slice(0, 8) || "Reservation details"}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <Section title="Guest information">
                <Row label="Name" value={detail.guest_name || "—"} />
                <Row label="Phone" value={detail.guest_phone || "—"} />
                <Row label="Email" value={detail.guest_email || "—"} />
                <Row label="Guests" value={String(detail.num_guests || 1)} />
              </Section>

              <Section title="Booking information">
                <Row label="Booking ID" value={detail.booking_reference || detail.id.slice(0, 8)} />
                <Row label="Status" value={<StatusBadge b={detail} />} />
                <Row label="Check-in" value={safeDate(detail.check_in)} />
                <Row label="Check-out" value={safeDate(detail.check_out)} />
                <Row label="Nights" value={String(nights(detail))} />
              </Section>

              <Section title="Room information">
                <Row label="Room" value={roomLabel(detail)} />
                <Row label="Room type" value={detail.room_type || "—"} />
                <Row label="Rooms" value={String(detail.num_rooms || 1)} />
                <Row
                  label="Housekeeping"
                  value={detail.housekeeping_status || (isCheckedOut(detail) ? "cleaning" : "—")}
                />
              </Section>

              <Section title="Payment information">
                <Row label="Room charges" value={inr(Number(detail.total_amount || 0))} />
                <Row label="Extra charges" value={inr(Number(detail.extra_charges || 0))} />
                <Row label="Paid" value={inr(Number(detail.amount_paid || 0))} />
                <Row label="Balance due" value={inr(due(detail))} />
                <Row label="Method" value={detail.payment_method || "—"} />
                <Row label="Payment status" value={<PayBadge b={detail} />} />
              </Section>

              <Section title="Special requests">
                <p className="text-sm text-muted-foreground">
                  {detail.special_requests || "None recorded."}
                </p>
              </Section>

              <Section title="Invoice">
                <Row
                  label="Invoice"
                  value={detail.invoice_url ? "Available" : "Generated on print"}
                />
                <Row label="Total" value={inr(gross(detail))} />
              </Section>

              <Section title="Activity timeline">
                <Timeline
                  items={[
                    ["Reservation created", safeTime(detail.created_at)],
                    ["Checked in", safeTime(detail.actual_check_in_at)],
                    ["Checked out", safeTime(detail.actual_check_out_at)],
                    ["Room cleaned", safeTime(detail.room_cleaned_at)],
                    ["Last updated", safeTime(detail.updated_at)],
                  ]}
                />
              </Section>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {!detail.actual_check_in_at && !isCancelled(detail) && (
                  <Button size="sm" disabled={busy === detail.id} onClick={() => doCheckIn(detail)}>
                    <LogIn className="mr-1.5 h-3.5 w-3.5" /> Check-In
                  </Button>
                )}
                {isCheckedIn(detail) && (
                  <Button size="sm" disabled={busy === detail.id} onClick={() => doCheckOut(detail)}>
                    <LogOut className="mr-1.5 h-3.5 w-3.5" /> Check-Out
                  </Button>
                )}
                {due(detail) > 0 && (
                  <Button size="sm" variant="outline" onClick={() => openPay(detail)}>
                    <IndianRupee className="mr-1.5 h-3.5 w-3.5" /> Collect Payment
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(detail)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Booking
                </Button>
                {!isCancelled(detail) && !isCheckedOut(detail) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === detail.id}
                    onClick={() => cancelBooking(detail)}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Booking
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => printInvoice(detail)}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Invoice
                </Button>
                <Button size="sm" variant="outline" onClick={() => callGuest(detail)}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Call Guest
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Collect payment */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect payment</DialogTitle>
            <DialogDescription>
              {payFor?.guest_name} · balance {payFor ? inr(due(payFor)) : "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <div className="mt-1.5 flex gap-2">
                {["cash", "card", "upi"].map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={payMethod === m ? "default" : "outline"}
                    onClick={() => setPayMethod(m)}
                    className="capitalize"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => payFor && markPaidInFull(payFor)}
            >
              Mark as Paid
            </Button>
            <Button disabled={!!busy} onClick={submitPayment}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit booking */}
      <Dialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
            <DialogDescription>{editFor?.guest_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Room number</Label>
              <Input
                value={editForm.room_number}
                onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                placeholder="e.g. 204"
              />
            </div>
            <div>
              <Label>Extra charges (₹)</Label>
              <Input
                type="number"
                min={0}
                value={editForm.extra_charges}
                onChange={(e) => setEditForm({ ...editForm, extra_charges: e.target.value })}
              />
            </div>
            <div>
              <Label>Special requests</Label>
              <Input
                value={editForm.special_requests}
                onChange={(e) => setEditForm({ ...editForm, special_requests: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFor(null)}>
              Cancel
            </Button>
            <Button disabled={!!busy} onClick={submitEdit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`border border-border/60 bg-background/60 backdrop-blur transition ${onClick ? "cursor-pointer hover:border-emerald-500/40 hover:bg-muted/30" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function RoomRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-left transition hover:border-emerald-500/40 hover:bg-muted/30"
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Timeline({ items }: { items: [string, string | null][] }) {
  const rows = items.filter(([, v]) => !!v);
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No activity recorded.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map(([label, value]) => (
        <li key={label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ b }: { b: Booking }) {
  const s = isCancelled(b)
    ? "cancelled"
    : b.actual_check_out_at
      ? "completed"
      : b.actual_check_in_at
        ? "checked in"
        : low(b.status) || "confirmed";
  const cls =
    s === "cancelled"
      ? "bg-red-500/15 text-red-400"
      : s === "completed"
        ? "bg-sky-500/15 text-sky-400"
        : s === "checked in"
          ? "bg-emerald-500/15 text-emerald-400"
          : ["pending", "requested", "on_hold"].includes(s)
            ? "bg-amber-500/15 text-amber-400"
            : "bg-emerald-500/15 text-emerald-400";
  return <Badge className={`${cls} capitalize hover:${cls}`}>{s.replace(/_/g, " ")}</Badge>;
}

function PayBadge({ b }: { b: Booking }) {
  const s =
    low(b.payment_status) === "paid" || due(b) === 0
      ? "paid"
      : Number(b.amount_paid || 0) > 0
        ? "partial"
        : low(b.payment_status) === "refunded"
          ? "refunded"
          : "pending";
  const cls =
    s === "paid"
      ? "bg-emerald-500/15 text-emerald-400"
      : s === "refunded"
        ? "bg-sky-500/15 text-sky-400"
        : s === "partial"
          ? "bg-blue-500/15 text-blue-400"
          : "bg-amber-500/15 text-amber-400";
  return <Badge className={`${cls} capitalize hover:${cls}`}>{s}</Badge>;
}
