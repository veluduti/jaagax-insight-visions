import { LONG_STAY_COPY, TITLE } from "@/config/dashboardModes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BedDouble, Users, UserPlus, FileText, IndianRupee, Clock, Percent, CalendarDays, AlertTriangle, ArrowRight, Hourglass, LogOut, PlusCircle, Wrench, QrCode, Download, Share2, CheckCircle2, MapPin, Loader2, Building2, LineChart as LineIcon } from "lucide-react";
import { toast } from "sonner";
import PropertyPhoto from "@/components/partners/PropertyPhoto";
import { bedsInRoom, occupancyTrend, pgMetrics, type PgDue, type PgRoom, type PgStay } from "@/lib/pgDashboardMetrics";

const CHART = ["hsl(var(--primary))", "hsl(var(--partner-chart-2, 199 89% 48%))", "hsl(var(--partner-chart-3, 32 95% 55%))", "hsl(var(--partner-chart-4, 50 95% 55%))", "hsl(var(--muted-foreground))"];
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

type Props = { mode?: "pg" | "hostel" | "coliving"; hotel: any; rooms: PgRoom[]; onSwitchToHotel?: () => void };

export default function PgOwnerDashboard({ mode = "pg", hotel, rooms, onSwitchToHotel }: Props) {
  const [data, setData] = useState<{ stays: PgStay[]; dues: PgDue[]; maint: number; waitlist: number; requests: number } | null>(null);
  const [err, setErr] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  const today = todayISO();

  const load = useCallback(async () => {
    try {
      setErr("");
      const sb = supabase as any;
      const [s, d, u, w, t] = await Promise.all([
        sb.from("hotel_long_stays").select("id,room_id,status,move_in,move_out,occupants,created_at").eq("hotel_id", hotel.id),
        sb.from("hotel_rent_dues").select("amount,due_date,status,period_month,paid_at").eq("hotel_id", hotel.id),
        sb.from("hotel_inventory_units").select("id", { count: "exact", head: true }).eq("hotel_id", hotel.id).eq("status", "maintenance"),
        sb.from("hotel_waitlist").select("id", { count: "exact", head: true }).eq("hotel_id", hotel.id).eq("status", "waiting"),
        sb.from("hotel_ops_tasks").select("id", { count: "exact", head: true }).eq("hotel_id", hotel.id).neq("status", "done"),
      ]);
      const e = s.error || d.error; if (e) throw e;
      setData({ stays: s.data ?? [], dues: d.data ?? [], maint: u.count ?? 0, waitlist: w.count ?? 0, requests: t.count ?? 0 });
    } catch { setErr("Could not load resident information. Please try again."); }
  }, [hotel.id]);
  useEffect(() => { void load(); const id = window.setInterval(load, 30000); return () => window.clearInterval(id); }, [load]);

  const m = useMemo(() => data && pgMetrics(rooms, data.stays, data.dues, data.maint, today), [data, rooms, today]);
  const trend = useMemo(() => m && data ? occupancyTrend(m.totalBeds, data.stays, today) : [], [m, data, today]);
  const byType = useMemo(() => { const total = rooms.reduce((s, r) => s + bedsInRoom(r), 0); return rooms.map(r => ({ name: r.room_type, beds: bedsInRoom(r), pct: total ? Math.round(bedsInRoom(r) / total * 100) : 0 })).filter(r => r.beds); }, [rooms]);

  const joinUrl = `${window.location.origin}/hotels/${hotel.id}/long-stay`;
  const code = String(hotel.id).slice(0, 8).toUpperCase();
  const downloadQr = () => { const c = qrRef.current?.querySelector("canvas"); if (!c) return; const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `${hotel.name}-join-qr.png`; a.click(); };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: hotel.name, text: `Join ${hotel.name} on JaagaX`, url: joinUrl }); else { await navigator.clipboard.writeText(joinUrl); toast.success("Join link copied"); } } catch { /* cancelled */ } };

  if (err) return <div role="alert" className="py-12 text-center">{err}<Button onClick={load} className="ml-3">Retry</Button></div>;
  if (!m || !data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const copy = LONG_STAY_COPY[mode];
  const tabs = [["Overview", "/partners/dashboard"], [copy.people, "/partners/long-stays"], ["Applications", "/partners/long-stays"], ["Beds & Rooms", "/partners/inventory"], ["Rent & Payments", "/partners/long-stays"], mode === "hostel" ? ["Facilities", "/partners/workspace/amenities"] : ["Mess / Dining", "/partners/workspace/dining"], ["Housekeeping", "/partners/operations"], ["Maintenance", "/partners/operations"], ["Requests", "/partners/service-requests"]];
  const occPie = [{ v: m.occupied }, { v: m.available }, { v: m.maintenance }].map((x, i) => ({ ...x, i }));
  const Row = ({ icon: I, label, value, tone = "" }: any) => <div className="pg-row"><I className={tone} /><span>{label}</span><strong className={tone}>{value}</strong></div>;

  return <div className="pg-dash">
    <div className="pw-heading"><div><h1>{TITLE[mode]}</h1><p>{copy.subtitle}</p></div>
      <div className="pw-actions items-center">
        {onSwitchToHotel && <Button size="sm" variant="outline" onClick={onSwitchToHotel}><Building2 className="h-3.5 w-3.5 mr-1" />Switch to Hotel view</Button>}
        <span className="pg-chip"><CalendarDays className="h-3.5 w-3.5" />Today, {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div></div>

    <div className="pg-top">
      <div className="pg-hero">{hotel.images?.[0] ? <PropertyPhoto src={hotel.images[0]} alt={hotel.name} /> : null}<div><span className="pg-badge">{copy.badge}</span><h2>{hotel.name}</h2><p><MapPin className="h-3.5 w-3.5" />{[hotel.locality, hotel.city].filter(Boolean).join(", ") || "Location not set"}</p></div></div>
      {[[BedDouble, m.totalBeds, "Total Beds"], [BedDouble, m.occupied, `Occupied (${m.occupancyPct}%)`], [BedDouble, m.available, `Available (${m.totalBeds ? Math.round(m.available / m.totalBeds * 100) : 0}%)`], [Users, m.residents, copy.people], [UserPlus, m.newJoins, "New Join (This Month)"]].map(([I, v, l]: any) => <div key={l} className="pg-stat"><I /><div><strong>{v}</strong><span>{l}</span></div></div>)}
    </div>

    <nav className="pw-tabs" aria-label="PG sections">{tabs.map(([l, to], i) => <Link key={l} to={to} className={i === 0 ? "active" : ""}>{l}</Link>)}</nav>

    <div className="pg-grid3">
      <section className="pw-panel"><div className="pw-panel-title"><h2><BedDouble />Bed Occupancy</h2><Link to="/partners/inventory">View Details <ArrowRight className="inline h-3 w-3" /></Link></div>
        <div className="pg-occ"><div className="pg-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={m.totalBeds ? occPie : [{ v: 1, i: 4 }]} dataKey="v" innerRadius="70%" outerRadius="100%" stroke="none">{(m.totalBeds ? occPie : [{ i: 4 }]).map((x: any) => <Cell key={x.i} fill={CHART[x.i]} />)}</Pie></PieChart></ResponsiveContainer><div><strong>{m.occupancyPct}%</strong><span>Occupancy</span></div></div>
          <div className="flex-1"><Row icon={CheckCircle2} label="Occupied Beds" value={m.occupied} /><Row icon={BedDouble} label="Available Beds" value={m.available} /><Row icon={Wrench} label="Under Maintenance" value={m.maintenance} /></div></div></section>
      <section className="pw-panel"><div className="pw-panel-title"><h2><Users />Resident Summary</h2><Link to="/partners/long-stays">Manage</Link></div>
        <Row icon={Users} label="Total Residents" value={m.residents} /><Row icon={PlusCircle} label="New Join (This Month)" value={m.newJoins} /><Row icon={LogOut} label="Move-out (This Month)" value={m.moveOuts} /><Row icon={FileText} label="Applications Pending" value={m.pending} /><Row icon={Hourglass} label="Waitlist" value={data.waitlist} /></section>
      <section className="pw-panel"><div className="pw-panel-title"><h2><IndianRupee />Rent & Collection (This Month)</h2><Link to="/partners/long-stays">View</Link></div>
        <Row icon={IndianRupee} label="Rent Collected" value={inr(m.collected)} tone="text-primary" /><Row icon={Clock} label="Rent Due" value={inr(m.due)} /><Row icon={Percent} label="Collection Rate" value={`${m.collectionRate}%`} /><Row icon={CalendarDays} label="Upcoming (Next 7 Days)" value={inr(m.upcoming)} /><Row icon={AlertTriangle} label="Overdue (> 7 Days)" value={inr(m.overdue)} tone="text-destructive" /></section>
    </div>

    <div className="pg-grid2">
      <section className="pw-panel"><div className="pw-panel-title"><h2><LineIcon />Occupancy Trend (Last 30 Days)</h2></div><div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="label" interval={4} fontSize={10} /><YAxis domain={[0, 100]} unit="%" fontSize={10} width={36} /><Tooltip formatter={(v: any) => `${v}%`} /><Line dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></section>
      <section className="pw-panel"><div className="pw-panel-title"><h2><BedDouble />Beds by Room Type</h2><Link to="/partners/rooms">Edit</Link></div>
        {byType.length ? <div className="pg-occ"><div className="pg-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byType} dataKey="beds" innerRadius="65%" outerRadius="100%" stroke="none">{byType.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}</Pie></PieChart></ResponsiveContainer><div><strong>{m.totalBeds}</strong><span>Total Beds</span></div></div>
          <div className="flex-1">{byType.map((t, i) => <div key={t.name} className="pg-row"><i style={{ background: CHART[i % CHART.length] }} className="pg-dot" /><span>{t.name}</span><strong>{t.beds} ({t.pct}%)</strong></div>)}</div></div> : <p className="pw-empty">No room types added yet.</p>}</section>
    </div>

    <div className="pg-grid2">
      <section className="pw-panel"><div className="pw-panel-title"><h2><QrCode />Resident App & QR Access</h2></div>
        <div className="pg-qr"><ul>{["Residents scan to join and request a bed", "Digital stay pass & booking reference", "Rent and service payments", "Housekeeping & maintenance requests", "Visitor pre-approval through requests"].map(f => <li key={f}><CheckCircle2 />{f}</li>)}</ul>
          <div className="pg-qr-box" ref={qrRef}><QRCodeCanvas value={joinUrl} size={132} level="M" /><strong>Scan to Join {hotel.name}</strong><span>Property code: {code}</span><div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={downloadQr}><Download className="h-3.5 w-3.5 mr-1" />Download QR</Button><Button size="sm" variant="outline" onClick={share}><Share2 className="h-3.5 w-3.5 mr-1" />Share</Button></div></div></div></section>
      <section className="pw-panel"><div className="pw-panel-title"><h2><PlusCircle />Quick Actions</h2></div>
        <div className="pg-actions">{[[UserPlus, "Add Resident", "/partners/long-stays"], [FileText, `Applications (${m.pending})`, "/partners/long-stays"], [BedDouble, "Assign Bed", "/partners/inventory"], [IndianRupee, "Collect Rent", "/partners/long-stays"], [LogOut, "Mark Check-out", "/partners/long-stays"], [Wrench, `Raise Maintenance (${data.requests} open)`, "/partners/operations"]].map(([I, l, to]: any) => <Link key={l} to={to}><I />{l}</Link>)}</div></section>
    </div>
  </div>;
}
