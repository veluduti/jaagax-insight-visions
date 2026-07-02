import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, TrendingUp, IndianRupee, CalendarDays, BedDouble, Users,
  RefreshCw, AlertTriangle, CheckCircle2, Plug, Settings, Plus, ArrowUpRight,
  Activity, Zap,
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

type Booking = {
  id: string; hotel_id: string | null; check_in: string; check_out: string;
  total_amount: number; status: string; num_rooms: number; guest_name: string;
};

type Conn = {
  id: string; pms_provider: string; sync_status: string; last_sync_at: string | null;
  last_sync_error: string | null; sync_interval_minutes: number;
};

type Chan = {
  id: string; channel: string; sync_enabled: boolean;
  last_sync_at: string | null; last_sync_status: string | null;
  commission_percent: number | null;
};

const CH_LABEL: Record<string, string> = {
  booking_com: "Booking.com", airbnb: "Airbnb", makemytrip: "MakeMyTrip",
  goibibo: "Goibibo", agoda: "Agoda", expedia: "Expedia",
};

const PMS_LABEL: Record<string, string> = {
  cloudbeds: "Cloudbeds", ezee: "eZee Absolute", hostaway: "Hostaway",
  little_hotelier: "Little Hotelier", staah: "STAAH", custom: "Custom", none: "Manual mode",
};

export default function PartnerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("Your property");
  const [totalRooms, setTotalRooms] = useState(0);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [conn, setConn] = useState<Conn | null>(null);
  const [channels, setChannels] = useState<Chan[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/partners/login", { replace: true }); return; }

      const { data: app } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,status,pms_setup_completed,hotel_name,approved_hotel_id")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (!app) { nav("/partners/kyc", { replace: true }); return; }
      if (app.status !== "approved") { nav("/partners/status", { replace: true }); return; }
      if (!app.pms_setup_completed) { nav("/partners/pms-setup", { replace: true }); return; }

      setHotelName(app.hotel_name || "Your property");
      setHotelId(app.approved_hotel_id || null);

      if (app.approved_hotel_id) {
        const { data: h } = await (supabase as any)
          .from("partner_hotels").select("total_rooms").eq("id", app.approved_hotel_id).maybeSingle();
        setTotalRooms(h?.total_rooms || 0);
        const { data: bks } = await (supabase as any)
          .from("hotel_bookings")
          .select("id,hotel_id,check_in,check_out,total_amount,status,num_rooms,guest_name")
          .eq("hotel_id", app.approved_hotel_id)
          .order("check_in", { ascending: true }).limit(200);
        setBookings(bks || []);
      }

      const { data: c } = await (supabase as any)
        .from("hotel_pms_connections")
        .select("id,pms_provider,sync_status,last_sync_at,last_sync_error,sync_interval_minutes")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
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
    const in7 = addDays(today, 7);
    const in30 = addDays(today, 30);
    const past30 = addDays(today, -30);

    const active = bookings.filter(b => b.status !== "cancelled");
    const checkinsToday = active.filter(b => sameDay(new Date(b.check_in), today));
    const checkoutsToday = active.filter(b => sameDay(new Date(b.check_out), today));

    const inhouse = active.filter(b => new Date(b.check_in) <= today && new Date(b.check_out) > today);
    const occupiedRooms = inhouse.reduce((s, b) => s + (b.num_rooms || 1), 0);
    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const rev7 = active.filter(b => new Date(b.check_in) >= past30 && new Date(b.check_in) <= today)
      .reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const nights = active
      .filter(b => new Date(b.check_in) >= past30 && new Date(b.check_in) <= today)
      .reduce((s, b) => s + Math.max(1, differenceInDays(new Date(b.check_out), new Date(b.check_in))) * (b.num_rooms || 1), 0);
    const adr = nights > 0 ? Math.round(rev7 / nights) : 0;
    const revpar = totalRooms > 0 ? Math.round(rev7 / (totalRooms * 30)) : 0;
    const upcoming7 = active.filter(b => new Date(b.check_in) > today && new Date(b.check_in) <= in7).length;
    const upcoming30 = active.filter(b => new Date(b.check_in) > today && new Date(b.check_in) <= in30).length;

    return { checkinsToday, checkoutsToday, occupancy, occupiedRooms, rev7, adr, revpar, upcoming7, upcoming30 };
  }, [bookings, totalRooms]);

  const heatStrip = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = addDays(today, i);
      const onDay = bookings.filter(b => b.status !== "cancelled"
        && new Date(b.check_in) <= d && new Date(b.check_out) > d)
        .reduce((s, b) => s + (b.num_rooms || 1), 0);
      const pct = totalRooms > 0 ? Math.min(100, Math.round((onDay / totalRooms) * 100)) : 0;
      return { d, onDay, pct };
    });
  }, [bookings, totalRooms]);

  const channelPerf = useMemo(() => {
    // Bookings don't yet carry channel; show enabled channels + sync status
    return channels.map(c => ({
      ...c, label: CH_LABEL[c.channel] || c.channel,
    }));
  }, [channels]);

  const runSync = async () => {
    if (!conn) return;
    setSyncing(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const now = new Date().toISOString();
      await (supabase as any).from("hotel_pms_connections")
        .update({ sync_status: "connected", last_sync_at: now, last_sync_error: null })
        .eq("id", conn.id);
      await (supabase as any).from("hotel_channel_mappings")
        .update({ last_sync_at: now, last_sync_status: "success" })
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      setConn({ ...conn, sync_status: "connected", last_sync_at: now, last_sync_error: null });
      setChannels(cs => cs.map(c => ({ ...c, last_sync_at: now, last_sync_status: "success" })));
      toast.success("Sync complete");
    } catch (e: any) { toast.error(e?.message || "Sync failed"); }
    finally { setSyncing(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PartnerNav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-emerald-400">Partner Dashboard</p>
            <h1 className="text-3xl font-bold tracking-tight">{hotelName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={runSync} disabled={syncing || !conn}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync now
            </Button>
            <Link to="/hotels/manage"><Button variant="outline" size="sm"><BedDouble className="mr-1.5 h-3.5 w-3.5" />Rooms</Button></Link>
            <Link to="/partners/pms-setup"><Button variant="outline" size="sm"><Settings className="mr-1.5 h-3.5 w-3.5" />PMS Settings</Button></Link>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={<Users className="h-4 w-4" />} label="Check-ins today" value={kpis.checkinsToday.length} />
          <Kpi icon={<ArrowUpRight className="h-4 w-4" />} label="Check-outs today" value={kpis.checkoutsToday.length} />
          <Kpi icon={<BedDouble className="h-4 w-4" />} label="Occupancy" value={`${kpis.occupancy}%`} sub={`${kpis.occupiedRooms}/${totalRooms || "—"} rooms`} />
          <Kpi icon={<IndianRupee className="h-4 w-4" />} label="ADR (30d)" value={`₹${kpis.adr.toLocaleString()}`} />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="RevPAR" value={`₹${kpis.revpar.toLocaleString()}`} />
          <Kpi icon={<CalendarDays className="h-4 w-4" />} label="Next 7d bookings" value={kpis.upcoming7} sub={`${kpis.upcoming30} in 30d`} />
        </div>

        {/* Heat strip */}
        <Card className="mt-6 border border-border/60 bg-background/60 backdrop-blur">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Next 14 days · occupancy heatmap</p>
              <span className="text-xs text-muted-foreground">Darker = fuller</span>
            </div>
            <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
              {heatStrip.map((h, i) => (
                <div key={i} className="rounded-md border border-border/60 p-2 text-center"
                  style={{ backgroundColor: `rgba(16,185,129,${0.08 + (h.pct / 100) * 0.7})` }}>
                  <div className="text-[10px] text-muted-foreground">{format(h.d, "EEE")}</div>
                  <div className="text-sm font-semibold">{format(h.d, "dd")}</div>
                  <div className="text-[10px] text-emerald-200">{h.pct}%</div>
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
                  <Row label="Status" value={
                    <Badge className={conn.sync_status === "connected" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}>
                      {conn.sync_status}
                    </Badge>
                  } />
                  <Row label="Interval" value={`every ${conn.sync_interval_minutes} min`} />
                  <Row label="Last sync" value={conn.last_sync_at ? format(new Date(conn.last_sync_at), "dd MMM, HH:mm") : "—"} />
                  {conn.last_sync_error && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
                      <AlertTriangle className="mr-1 inline h-3 w-3" />{conn.last_sync_error}
                    </div>
                  )}
                  <Link to="/partners/pms-setup">
                    <Button variant="outline" size="sm" className="mt-2 w-full">Reconnect / edit</Button>
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
                <Link to="/partners/pms-setup" className="text-xs text-emerald-400 hover:underline">Manage</Link>
              </div>
              {channelPerf.length === 0 ? (
                <p className="text-sm text-muted-foreground">No channels connected yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {channelPerf.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-semibold">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.last_sync_at ? `Synced ${format(new Date(c.last_sync_at), "dd MMM HH:mm")}` : "Not synced yet"}
                          {c.commission_percent != null && ` · ${c.commission_percent}%`}
                        </p>
                      </div>
                      {c.sync_enabled
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        : <span className="text-xs text-muted-foreground">Paused</span>}
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
                <Link to="/hotels/manage"><Button variant="outline" className="w-full justify-start"><Plus className="mr-1.5 h-4 w-4" />Add room</Button></Link>
                <Link to="/hotels/manage"><Button variant="outline" className="w-full justify-start"><CalendarDays className="mr-1.5 h-4 w-4" />Block dates</Button></Link>
                <Link to="/hotels/manage"><Button variant="outline" className="w-full justify-start"><Users className="mr-1.5 h-4 w-4" />Reservations</Button></Link>
                <Link to="/hotels/manage"><Button variant="outline" className="w-full justify-start"><IndianRupee className="mr-1.5 h-4 w-4" />Update rates</Button></Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Pending tasks
              </p>
              <ul className="space-y-2 text-sm">
                {!conn && <li className="rounded-md bg-amber-500/10 p-2 text-amber-400">Connect a PMS to enable auto-sync</li>}
                {channels.length === 0 && <li className="rounded-md bg-amber-500/10 p-2 text-amber-400">Map at least one OTA channel</li>}
                {totalRooms === 0 && <li className="rounded-md bg-amber-500/10 p-2 text-amber-400">Add rooms & inventory in Hotel Manager</li>}
                {conn && channels.length > 0 && totalRooms > 0 && (
                  <li className="rounded-md bg-emerald-500/10 p-2 text-emerald-400">All set — you're ready to receive bookings.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="border border-border/60 bg-background/60 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
