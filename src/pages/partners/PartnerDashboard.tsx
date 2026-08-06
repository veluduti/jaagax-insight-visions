import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  UserX,
  CheckCircle2,
  Wrench,
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
  num_guests?: number | null;
  payment_status?: string | null;
  booking_reference?: string | null;
  special_requests?: string | null;
  created_at?: string | null;
  actual_check_in_at?: string | null;
  actual_check_out_at?: string | null;
};

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const isPending = (b: Booking) => String(b.payment_status || "").toLowerCase() === "pending";
const isCancelled = (b: Booking) => String(b.status || "").toLowerCase() === "cancelled";
const isNoShow = (b: Booking) => ["no_show", "noshow"].includes(String(b.status || "").toLowerCase());

export default function PartnerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("Your property");
  const [hotelCity, setHotelCity] = useState("");
  const [hotelStatus, setHotelStatus] = useState("");
  const [totalRooms, setTotalRooms] = useState(0);
  const [oosRooms, setOosRooms] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<null | "checkins" | "checkouts" | "inhouse" | "clean" | "pending">(null);
  const [detail, setDetail] = useState<Booking | null>(null);
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
          .select("total_rooms,city,status")
          .eq("id", app.approved_hotel_id)
          .maybeSingle();
        setTotalRooms(h?.total_rooms || 0);
        if (h?.city) setHotelCity(h.city);
        if (h?.status) setHotelStatus(h.status);

        const { data: rooms } = await (supabase as any)
          .from("hotel_rooms")
          .select("total_units,is_active")
          .eq("hotel_id", app.approved_hotel_id);
        setOosRooms(
          (rooms || [])
            .filter((r: any) => r.is_active === false)
            .reduce((s: number, r: any) => s + (r.total_units || 0), 0),
        );

        const { data: bks } = await (supabase as any)
          .from("hotel_bookings")
          .select(
            "id,hotel_id,check_in,check_out,total_amount,status,num_rooms,num_guests,guest_name,guest_email,guest_phone,room_type,payment_status,booking_reference,special_requests,created_at,actual_check_in_at,actual_check_out_at",
          )
          .eq("hotel_id", app.approved_hotel_id)
          .order("check_in", { ascending: true })
          .limit(400);
        setBookings(bks || []);
      }

      setLoading(false);
    })();
  }, [nav]);

  const day = useMemo(() => {
    const d = date;
    const all = bookings;
    const active = all.filter((b) => !isCancelled(b) && !isNoShow(b));
    const checkins = active.filter((b) => isSameDay(new Date(b.check_in), d));
    const checkouts = active.filter((b) => isSameDay(new Date(b.check_out), d));
    const inhouse = active.filter(
      (b) => new Date(b.check_in) <= d && new Date(b.check_out) > d,
    );
    const pending = active.filter(isPending);
    const paymentsReceived = active
      .filter(
        (b) =>
          String(b.payment_status || "").toLowerCase() === "paid" &&
          isSameDay(new Date(b.check_in), d),
      )
      .reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const pendingAmount = pending.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const cancelled = all.filter((b) => isCancelled(b) && isSameDay(new Date(b.check_in), d));
    const noShows = all.filter((b) => isNoShow(b) && isSameDay(new Date(b.check_in), d));

    const occupiedRooms = inhouse.reduce((s, b) => s + (b.num_rooms || 1), 0);
    const cleaningRooms = checkouts.reduce((s, b) => s + (b.num_rooms || 1), 0);
    const availableRooms = Math.max(0, totalRooms - occupiedRooms - cleaningRooms - oosRooms);

    const reservations = all.filter(
      (b) =>
        isSameDay(new Date(b.check_in), d) ||
        isSameDay(new Date(b.check_out), d) ||
        (b.created_at && isSameDay(new Date(b.created_at), d)),
    );

    return {
      checkins,
      checkouts,
      inhouse,
      pending,
      pendingAmount,
      paymentsReceived,
      cancelled,
      noShows,
      occupiedRooms,
      cleaningRooms,
      availableRooms,
      reservations,
    };
  }, [bookings, date, totalRooms, oosRooms]);

  const isToday = isSameDay(date, new Date());

  const patch = async (id: string, values: Record<string, any>, msg: string) => {
    setBusy(id);
    try {
      const { error } = await (supabase as any).from("hotel_bookings").update(values).eq("id", id);
      if (error) throw error;
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, ...values } : b)));
      setDetail((d) => (d && d.id === id ? { ...d, ...values } : d));
      toast.success(msg);
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const doCheckIn = (b: Booking) =>
    patch(b.id, { actual_check_in_at: new Date().toISOString() }, `${b.guest_name || "Guest"} checked in`);
  const doCheckOut = (b: Booking) =>
    patch(
      b.id,
      { actual_check_out_at: new Date().toISOString(), status: "completed" },
      `${b.guest_name || "Guest"} checked out`,
    );
  const collectPayment = (b: Booking) => patch(b.id, { payment_status: "paid" }, "Payment collected");

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

  const dayLabel = isToday ? "Today" : format(date, "dd MMM yyyy");

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
                  {dayLabel}
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

        {/* Operational summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi
            icon={<LogIn className="h-4 w-4" />}
            label={`${dayLabel}'s check-ins`}
            value={day.checkins.length}
            onClick={() => setView("checkins")}
          />
          <Kpi
            icon={<LogOut className="h-4 w-4" />}
            label={`${dayLabel}'s check-outs`}
            value={day.checkouts.length}
            onClick={() => setView("checkouts")}
          />
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label="In-house guests"
            value={day.inhouse.reduce((s, b) => s + (b.num_guests || 1), 0)}
            sub={`${day.inhouse.length} stays`}
            onClick={() => setView("inhouse")}
          />
          <Kpi
            icon={<Brush className="h-4 w-4" />}
            label="Rooms to clean"
            value={day.cleaningRooms}
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

        {/* Selected day snapshot */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">{format(date, "EEEE, dd MMM yyyy")} · Day summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Mini label="Check-ins" value={day.checkins.length} />
            <Mini label="Check-outs" value={day.checkouts.length} />
            <Mini label="In-house" value={day.inhouse.length} />
            <Mini label="Payments received" value={inr(day.paymentsReceived)} />
            <Mini label="Pending payments" value={inr(day.pendingAmount)} />
            <Mini label="Cancelled / No shows" value={`${day.cancelled.length} / ${day.noShows.length}`} />
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
                          {b.booking_reference || b.id.slice(0, 8)} · {b.room_type || "Room"} ·{" "}
                          {safeDate(b.check_in)} → {safeDate(b.check_out)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PayBadge status={b.payment_status} />
                        <StatusBadge status={b.status} />
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
                          {b.booking_reference || b.id.slice(0, 8)} · {safeDate(b.check_in)} →{" "}
                          {safeDate(b.check_out)}
                        </p>
                      </button>
                      <p className="shrink-0 text-sm font-semibold">{inr(b.total_amount)}</p>
                      <Button size="sm" disabled={busy === b.id} onClick={() => collectPayment(b)}>
                        {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Collect"}
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
                <RoomRow icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} label="Available" value={day.availableRooms} />
                <RoomRow icon={<Users className="h-4 w-4 text-sky-400" />} label="Occupied" value={day.occupiedRooms} />
                <RoomRow icon={<Brush className="h-4 w-4 text-amber-400" />} label="Cleaning" value={day.cleaningRooms} />
                <RoomRow icon={<Ban className="h-4 w-4 text-muted-foreground" />} label="Blocked" value={0} />
                <RoomRow icon={<Wrench className="h-4 w-4 text-red-400" />} label="Out of service" value={oosRooms} />
                <div className="mt-3 border-t border-border/50 pt-3">
                  <RoomRow icon={<BedDouble className="h-4 w-4" />} label="Total rooms" value={totalRooms} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check-ins list */}
      <Dialog open={view === "checkins"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arrivals · {format(date, "dd MMM yyyy")}</DialogTitle>
            <DialogDescription>{day.checkins.length} guest(s) arriving</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {day.checkins.length === 0 && <p className="text-sm text-muted-foreground">No arrivals.</p>}
            {day.checkins.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{b.guest_name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground">
                      Booking {b.booking_reference || b.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.room_type || "Room"} · {b.num_rooms || 1} room(s)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.num_guests || 1} guest(s)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Check-in {b.actual_check_in_at ? format(new Date(b.actual_check_in_at), "hh:mm a") : "from 2:00 PM"}
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
                    <PayBadge status={b.payment_status} />
                    {b.actual_check_in_at ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
                        Checked in
                      </Badge>
                    ) : (
                      <Button size="sm" disabled={busy === b.id} onClick={() => doCheckIn(b)}>
                        {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check-In"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-outs list */}
      <Dialog open={view === "checkouts"} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Departures · {format(date, "dd MMM yyyy")}</DialogTitle>
            <DialogDescription>{day.checkouts.length} guest(s) departing</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {day.checkouts.length === 0 && <p className="text-sm text-muted-foreground">No departures.</p>}
            {day.checkouts.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{b.guest_name || "Guest"}</p>
                    <p className="text-sm text-muted-foreground">{b.room_type || "Room"}</p>
                    <p className="text-sm text-muted-foreground">
                      Stay: {nights(b)} night(s) ({safeDate(b.check_in)} → {safeDate(b.check_out)})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pending amount: {isPending(b) ? inr(b.total_amount) : inr(0)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <PayBadge status={b.payment_status} />
                    {isPending(b) && (
                      <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => collectPayment(b)}>
                        Collect Payment
                      </Button>
                    )}
                    {b.actual_check_out_at ? (
                      <Badge className="bg-sky-500/15 text-sky-400 hover:bg-sky-500/15">Checked out</Badge>
                    ) : (
                      <Button size="sm" disabled={busy === b.id} onClick={() => doCheckOut(b)}>
                        {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check-Out"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generic list dialogs */}
      <Dialog
        open={view === "inhouse" || view === "clean" || view === "pending"}
        onOpenChange={(o) => !o && setView(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {view === "inhouse" ? "In-house guests" : view === "clean" ? "Rooms to clean" : "Pending payments"}
            </DialogTitle>
            <DialogDescription>{format(date, "dd MMM yyyy")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(view === "inhouse" ? day.inhouse : view === "clean" ? day.checkouts : day.pending).map((b) => (
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
                    {b.room_type || "Room"} · {b.num_rooms || 1} room(s) · {safeDate(b.check_in)} →{" "}
                    {safeDate(b.check_out)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {view === "pending" && <span className="text-sm font-semibold">{inr(b.total_amount)}</span>}
                  <PayBadge status={b.payment_status} />
                </div>
              </button>
            ))}
            {(view === "inhouse" ? day.inhouse : view === "clean" ? day.checkouts : day.pending).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing here.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reservation detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.guest_name || "Reservation"}</DialogTitle>
            <DialogDescription>{detail?.booking_reference || "Reservation details"}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <Row label="Room" value={`${detail.room_type || "—"} · ${detail.num_rooms || 1} room(s)`} />
              <Row label="Guests" value={String(detail.num_guests || 1)} />
              <Row label="Check-in" value={safeDate(detail.check_in)} />
              <Row label="Check-out" value={safeDate(detail.check_out)} />
              <Row label="Nights" value={String(nights(detail))} />
              <Row label="Amount" value={inr(detail.total_amount)} />
              <Row label="Payment" value={<PayBadge status={detail.payment_status} />} />
              <Row label="Status" value={<StatusBadge status={detail.status} />} />
              {detail.guest_phone && <Row label="Phone" value={detail.guest_phone} />}
              {detail.guest_email && <Row label="Email" value={detail.guest_email} />}
              {detail.special_requests && <Row label="Special requests" value={detail.special_requests} />}
              <div className="flex flex-wrap gap-2 pt-2">
                {isPending(detail) && (
                  <Button size="sm" variant="outline" disabled={busy === detail.id} onClick={() => collectPayment(detail)}>
                    Collect Payment
                  </Button>
                )}
                {!detail.actual_check_in_at && (
                  <Button size="sm" disabled={busy === detail.id} onClick={() => doCheckIn(detail)}>
                    Check-In
                  </Button>
                )}
                {detail.actual_check_in_at && !detail.actual_check_out_at && (
                  <Button size="sm" disabled={busy === detail.id} onClick={() => doCheckOut(detail)}>
                    Check-Out
                  </Button>
                )}
              </div>
            </div>
          )}
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

function RoomRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "cancelled"
      ? "bg-red-500/15 text-red-400"
      : s === "completed"
        ? "bg-sky-500/15 text-sky-400"
        : ["pending", "requested", "on_hold"].includes(s)
          ? "bg-amber-500/15 text-amber-400"
          : "bg-emerald-500/15 text-emerald-400";
  return <Badge className={`${cls} capitalize hover:${cls}`}>{s.replace(/_/g, " ") || "—"}</Badge>;
}

function PayBadge({ status }: { status?: string | null }) {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "paid"
      ? "bg-emerald-500/15 text-emerald-400"
      : s === "refunded"
        ? "bg-sky-500/15 text-sky-400"
        : "bg-amber-500/15 text-amber-400";
  return <Badge className={`${cls} capitalize hover:${cls}`}>{s ? s : "unpaid"}</Badge>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function nights(b: Booking) {
  const n = differenceInDays(new Date(b.check_out), new Date(b.check_in));
  return Math.max(1, isNaN(n) ? 1 : n);
}

function safeDate(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
}

const _unused = { UserX };
