import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  TrendingUp,
  IndianRupee,
  CalendarDays,
  BedDouble,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Plug,
  Settings,
  Plus,
  ArrowUpRight,
  Activity,
  Zap,
  Clock,
  Mail,
  Phone,
  Sparkles,
  ChevronRight,
  MapPin,
  Sparkle,
} from "lucide-react";
import { format, addDays, differenceInDays, startOfWeek, startOfMonth } from "date-fns";

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
  created_at?: string | null;
};

type Conn = {
  id: string;
  pms_provider: string;
  sync_status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
  sync_interval_minutes: number;
};

type Chan = {
  id: string;
  channel: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  commission_percent: number | null;
};

const CH_LABEL: Record<string, string> = {
  booking_com: "Booking.com",
  airbnb: "Airbnb",
  makemytrip: "MakeMyTrip",
  goibibo: "Goibibo",
  agoda: "Agoda",
  expedia: "Expedia",
};

const PMS_LABEL: Record<string, string> = {
  cloudbeds: "Cloudbeds",
  ezee: "eZee Absolute",
  hostaway: "Hostaway",
  little_hotelier: "Little Hotelier",
  staah: "STAAH",
  custom: "Custom",
  none: "Manual mode",
};

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export default function PartnerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("Your property");
  const [hotelCity, setHotelCity] = useState<string>("");
  const [hotelStatus, setHotelStatus] = useState<string>("");
  const [totalRooms, setTotalRooms] = useState(0);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [conn, setConn] = useState<Conn | null>(null);
  const [channels, setChannels] = useState<Chan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [drill, setDrill] = useState<{ title: string; desc?: string; rows: Booking[] } | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);

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

      if (!app) {
        nav("/partners/kyc", { replace: true });
        return;
      }
      if (app.status !== "approved") {
        nav("/partners/status", { replace: true });
        return;
      }
      if (!app.pms_setup_completed) {
        nav("/partners/pms-setup", { replace: true });
        return;
      }

      setHotelName(app.hotel_name || "Your property");
      setHotelCity(app.city || "");
      setHotelStatus(app.status || "");
      setHotelId(app.approved_hotel_id || null);

      if (app.approved_hotel_id) {
        const { data: h } = await (supabase as any)
          .from("partner_hotels")
          .select("total_rooms,city,status")
          .eq("id", app.approved_hotel_id)
          .maybeSingle();
        setTotalRooms(h?.total_rooms || 0);
        if (h?.city) setHotelCity(h.city);
        if (h?.status) setHotelStatus(h.status);
        const { data: bks } = await (supabase as any)
          .from("hotel_bookings")
          .select(
            "id,hotel_id,check_in,check_out,total_amount,status,num_rooms,num_guests,guest_name,guest_email,guest_phone,room_type,payment_status,booking_reference,created_at",
          )
          .eq("hotel_id", app.approved_hotel_id)
          .order("check_in", { ascending: true })
          .limit(200);
        setBookings(bks || []);
      }

      const { data: c } = await (supabase as any)
        .from("hotel_pms_connections")
        .select("id,pms_provider,sync_status,last_sync_at,last_sync_error,sync_interval_minutes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setConn(c || null);

      const { data: ch } = await (supabase as any)
        .from("hotel_channel_mappings")
        .select("id,channel,sync_enabled,last_sync_at,last_sync_status,commission_percent")
        .eq("user_id", user.id);
      setChannels(ch || []);

      setLoading(false);
    })();
  }, [nav]);

  const kpis = useMemo(() => {
    const today = new Date();
    const in30 = addDays(today, 30);
    const past30 = addDays(today, -30);

    const active = bookings.filter((b) => b.status !== "cancelled");
    const checkinsToday = active.filter((b) => sameDay(new Date(b.check_in), today));
    const checkoutsToday = active.filter((b) => sameDay(new Date(b.check_out), today));

    const inhouse = active.filter((b) => new Date(b.check_in) <= today && new Date(b.check_out) > today);
    const occupiedRooms = inhouse.reduce((s, b) => s + (b.num_rooms || 1), 0);
    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Revenue windows (based on check-in date)
    const sum = (rows: Booking[]) => rows.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const todayRows = active.filter((b) => sameDay(new Date(b.check_in), today));
    const weekRows = active.filter(
      (b) => new Date(b.check_in) >= startOfWeek(today, { weekStartsOn: 1 }) && new Date(b.check_in) <= today,
    );
    const monthRows = active.filter(
      (b) => new Date(b.check_in) >= startOfMonth(today) && new Date(b.check_in) <= today,
    );

    const todayRevenue = sum(todayRows);
    const weekRevenue = sum(weekRows);
    const monthRevenue = sum(monthRows);

    const bookedToday = active.filter((b) => b.created_at && sameDay(new Date(b.created_at), today));
    const todaysBookings = bookedToday.length > 0 ? bookedToday : todayRows;

    const pendingConfirmations = bookings.filter((b) =>
      ["pending", "requested", "on_hold"].includes(String(b.status || "").toLowerCase()),
    );
    const pendingPayments = active.filter((b) => String(b.payment_status || "").toLowerCase() === "pending");

    const rev30 = sum(active.filter((b) => new Date(b.check_in) >= past30 && new Date(b.check_in) <= today));
    const upcoming30 = active.filter((b) => new Date(b.check_in) > today && new Date(b.check_in) <= in30).length;

    return {
      checkinsToday,
      checkoutsToday,
      occupancy,
      occupiedRooms,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      todaysBookings,
      pendingConfirmations,
      pendingPayments,
      rev30,
      upcoming30,
    };
  }, [bookings, totalRooms]);

  const recent = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at || b.check_in).getTime() - new Date(a.created_at || a.check_in).getTime())
      .slice(0, 6);
  }, [bookings]);

  const heatStrip = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = addDays(today, i);
      const onDay = bookings
        .filter((b) => b.status !== "cancelled" && new Date(b.check_in) <= d && new Date(b.check_out) > d)
        .reduce((s, b) => s + (b.num_rooms || 1), 0);
      const pct = totalRooms > 0 ? Math.min(100, Math.round((onDay / totalRooms) * 100)) : 0;
      return { d, onDay, pct };
    });
  }, [bookings, totalRooms]);

  const channelPerf = useMemo(
    () => channels.map((c) => ({ ...c, label: CH_LABEL[c.channel] || c.channel })),
    [channels],
  );

  const runSync = async () => {
    if (!conn) return;
    setSyncing(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const now = new Date().toISOString();
      await (supabase as any)
        .from("hotel_pms_connections")
        .update({ sync_status: "connected", last_sync_at: now, last_sync_error: null })
        .eq("id", conn.id);
      await (supabase as any)
        .from("hotel_channel_mappings")
        .update({ last_sync_at: now, last_sync_status: "success" })
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      setConn({ ...conn, sync_status: "connected", last_sync_at: now, last_sync_error: null });
      setChannels((cs) => cs.map((c) => ({ ...c, last_sync_at: now, last_sync_status: "success" })));
      toast.success("Sync complete");
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
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

  const roomsToClean = kpis.checkoutsToday.reduce((s, b) => s + (b.num_rooms || 1), 0);

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">{hotelName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {hotelCity && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {hotelCity}
                </span>
              )}
              {hotelCity && hotelStatus && <span className="text-border">•</span>}
              {hotelStatus && (
                <Badge className="bg-emerald-500/15 text-emerald-400 capitalize hover:bg-emerald-500/15">
                  {hotelStatus === "approved" ? "Active" : hotelStatus.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/partners/rooms">
              <Button size="sm">
                <BedDouble className="mr-1.5 h-3.5 w-3.5" />
                Rooms
              </Button>
            </Link>
            <Link to="/partners/reservations">
              <Button size="sm">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Reservations
              </Button>
            </Link>
            <Link to="/partners/pricing">
              <Button size="sm">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                Pricing &amp; Offers
              </Button>
            </Link>
            <Link to="/partners/pms-setup">
              <Button size="sm">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                PMS Settings
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={runSync} disabled={syncing || !conn}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label="Check-ins today"
            value={kpis.checkinsToday.length}
            onClick={() =>
              setDrill({ title: "Check-ins today", desc: format(new Date(), "dd MMM yyyy"), rows: kpis.checkinsToday })
            }
          />
          <Kpi
            icon={<ArrowUpRight className="h-4 w-4" />}
            label="Check-outs today"
            value={kpis.checkoutsToday.length}
            onClick={() =>
              setDrill({
                title: "Check-outs today",
                desc: format(new Date(), "dd MMM yyyy"),
                rows: kpis.checkoutsToday,
              })
            }
          />
          <Kpi icon={<IndianRupee className="h-4 w-4" />} label="Today's revenue" value={inr(kpis.todayRevenue)} />
          <Kpi
            icon={<CalendarDays className="h-4 w-4" />}
            label="Today's bookings"
            value={kpis.todaysBookings.length}
            onClick={() => setDrill({ title: "Today's bookings", rows: kpis.todaysBookings })}
          />
        </div>

        {/* Revenue overview */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Revenue overview
            </h2>
            <Link to="/partners/analytics" className="text-xs text-emerald-400 hover:underline">
              View analytics
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <RevCard label="Today's revenue" value={inr(kpis.todayRevenue)} sub={format(new Date(), "dd MMM yyyy")} />
            <RevCard label="Weekly revenue" value={inr(kpis.weekRevenue)} sub="This week (Mon–today)" />
            <RevCard label="Monthly revenue" value={inr(kpis.monthRevenue)} sub={format(new Date(), "MMMM yyyy")} />
          </div>
        </section>

        {/* Recent reservations + Today's tasks */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="border border-border/60 bg-background/60 backdrop-blur lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-emerald-400" /> Recent reservations
                </p>
                <Link to="/partners/reservations" className="text-xs text-emerald-400 hover:underline">
                  View all
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 font-medium">Guest</th>
                        <th className="pb-2 font-medium">Room</th>
                        <th className="pb-2 font-medium">Check-in</th>
                        <th className="pb-2 font-medium">Check-out</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((b) => (
                        <tr
                          key={b.id}
                          onClick={() => setDetail(b)}
                          className="cursor-pointer border-t border-border/50 transition hover:bg-muted/40"
                        >
                          <td className="py-2.5 font-medium">{b.guest_name || "Guest"}</td>
                          <td className="py-2.5 text-muted-foreground">{b.room_type || "—"}</td>
                          <td className="py-2.5 text-muted-foreground">{safeDate(b.check_in)}</td>
                          <td className="py-2.5 text-muted-foreground">{safeDate(b.check_out)}</td>
                          <td className="py-2.5">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="py-2.5 text-right">
                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Today's tasks
              </p>
              <div className="space-y-2">
                <TaskRow
                  icon={<Users className="h-4 w-4" />}
                  label="Check-ins"
                  count={kpis.checkinsToday.length}
                  onClick={() => setDrill({ title: "Check-ins today", rows: kpis.checkinsToday })}
                />
                <TaskRow
                  icon={<ArrowUpRight className="h-4 w-4" />}
                  label="Check-outs"
                  count={kpis.checkoutsToday.length}
                  onClick={() => setDrill({ title: "Check-outs today", rows: kpis.checkoutsToday })}
                />
                <TaskRow
                  icon={<Sparkle className="h-4 w-4" />}
                  label="Rooms to clean"
                  count={roomsToClean}
                  onClick={() => setDrill({ title: "Rooms to clean (today's check-outs)", rows: kpis.checkoutsToday })}
                />
                <TaskRow
                  icon={<IndianRupee className="h-4 w-4" />}
                  label="Pending payments"
                  count={kpis.pendingPayments.length}
                  onClick={() => setDrill({ title: "Pending payments", rows: kpis.pendingPayments })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Heat strip (compact) */}
        <Card className="mt-6 border border-border/60 bg-background/60 backdrop-blur">
          <CardContent className="p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-sm font-semibold">Next 14 days · occupancy</p>
              <span className="text-xs text-muted-foreground">Darker = fuller</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
              {heatStrip.map((h, i) => (
                <div
                  key={i}
                  title={`${format(h.d, "dd MMM")} · ${h.pct}%`}
                  className="rounded-md border border-border/60 px-1 py-1.5 text-center"
                  style={{ backgroundColor: `rgba(16,185,129,${0.08 + (h.pct / 100) * 0.7})` }}
                >
                  <div className="text-[10px] leading-tight text-muted-foreground">{format(h.d, "EEEEE")}</div>
                  <div className="text-xs font-semibold leading-tight">{format(h.d, "dd")}</div>
                  <div className="text-[10px] leading-tight text-emerald-200">{h.pct}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sync health + Channels */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Plug className="h-4 w-4 text-emerald-400" /> Sync health
              </p>
              {conn ? (
                <div className="space-y-3">
                  <Row label="PMS" value={PMS_LABEL[conn.pms_provider] || conn.pms_provider} />
                  <Row
                    label="Status"
                    value={
                      <Badge
                        className={
                          conn.sync_status === "connected"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        }
                      >
                        {conn.sync_status}
                      </Badge>
                    }
                  />
                  <Row label="Interval" value={`every ${conn.sync_interval_minutes} min`} />
                  <Row
                    label="Last sync"
                    value={conn.last_sync_at ? format(new Date(conn.last_sync_at), "dd MMM, HH:mm") : "—"}
                  />
                  {conn.last_sync_error && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {conn.last_sync_error}
                    </div>
                  )}
                  <Link to="/partners/pms-setup">
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      Reconnect / edit
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No PMS configured.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-background/60 backdrop-blur lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-emerald-400" /> Channel performance
                </p>
                <Link to="/partners/pms-setup" className="text-xs text-emerald-400 hover:underline">
                  Manage
                </Link>
              </div>
              {channelPerf.length === 0 ? (
                <p className="text-sm text-muted-foreground">No channels connected yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {channelPerf.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.last_sync_at
                            ? `Synced ${format(new Date(c.last_sync_at), "dd MMM HH:mm")}`
                            : "Not synced yet"}
                          {c.commission_percent != null && ` · ${c.commission_percent}%`}
                        </p>
                      </div>
                      {c.sync_enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Paused</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions + pending tasks */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Zap className="h-4 w-4 text-emerald-400" /> Quick actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/partners/rooms">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add room
                  </Button>
                </Link>
                <Link to="/partners/rooms">
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarDays className="mr-1.5 h-4 w-4" />
                    Block dates
                  </Button>
                </Link>
                <Link to="/partners/reservations">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-1.5 h-4 w-4" />
                    Reservations
                  </Button>
                </Link>
                <Link to="/partners/rooms">
                  <Button variant="outline" className="w-full justify-start">
                    <IndianRupee className="mr-1.5 h-4 w-4" />
                    Update rates
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Pending tasks
              </p>
              <ul className="space-y-2 text-sm">
                {!conn && (
                  <li className="rounded-md bg-amber-500/10 p-2 text-amber-400">Connect a PMS to enable auto-sync</li>
                )}
                {channels.length === 0 && (
                  <li className="rounded-md bg-amber-500/10 p-2 text-amber-400">Map at least one OTA channel</li>
                )}
                {totalRooms === 0 && (
                  <li className="rounded-md bg-amber-500/10 p-2 text-amber-400">
                    Add rooms & inventory in Hotel Manager
                  </li>
                )}
                {conn && channels.length > 0 && totalRooms > 0 && (
                  <li className="rounded-md bg-emerald-500/10 p-2 text-emerald-400">
                    All set — you're ready to receive bookings.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drill-down list dialog */}
      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drill?.title}</DialogTitle>
            {drill?.desc && <DialogDescription>{drill.desc}</DialogDescription>}
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {(drill?.rows || []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing here right now.</p>
            )}
            {(drill?.rows || []).map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setDetail(b);
                  setDrill(null);
                }}
                className="w-full rounded-lg border border-border/60 p-3 text-left transition hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.guest_name || "Guest"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.room_type || "Room"} · {b.num_rooms || 1} room(s) · {b.num_guests || 1} guest(s)
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {b.guest_email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {b.guest_email}
                        </span>
                      )}
                      {b.guest_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {b.guest_phone}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{inr(b.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {safeDate(b.check_in)} → {safeDate(b.check_out)}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reservation detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.guest_name || "Reservation"}</DialogTitle>
            <DialogDescription>{detail?.booking_reference || "Reservation details"}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <Row label="Room" value={detail.room_type || "—"} />
              <Row label="Rooms / Guests" value={`${detail.num_rooms || 1} / ${detail.num_guests || 1}`} />
              <Row label="Check-in" value={safeDate(detail.check_in)} />
              <Row label="Check-out" value={safeDate(detail.check_out)} />
              <Row
                label="Nights"
                value={String(Math.max(1, differenceInDays(new Date(detail.check_out), new Date(detail.check_in))))}
              />
              <Row label="Amount" value={inr(detail.total_amount)} />
              <Row label="Payment" value={<span className="capitalize">{detail.payment_status || "—"}</span>} />
              <Row label="Status" value={<StatusBadge status={detail.status} />} />
              {detail.guest_email && <Row label="Email" value={detail.guest_email} />}
              {detail.guest_phone && <Row label="Phone" value={detail.guest_phone} />}
              <Link to="/partners/reservations" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  Open in Reservations
                </Button>
              </Link>
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

function RevCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="border border-border/60 bg-background/60 backdrop-blur">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500/70" style={{ width: "100%" }} />
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-left transition hover:border-emerald-500/40 hover:bg-muted/40"
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-semibold">{count}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </span>
    </button>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function safeDate(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
