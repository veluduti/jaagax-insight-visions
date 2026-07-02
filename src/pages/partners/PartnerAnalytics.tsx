import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, IndianRupee, TrendingUp, Percent, CalendarCheck, Download, FileText } from "lucide-react";
import { format, subDays, differenceInDays, parseISO, eachDayOfInterval } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";

type Booking = {
  id: string; check_in: string; check_out: string; total_amount: number;
  status: string; num_rooms: number; booking_type: string | null;
  room_type: string | null; created_at: string; guest_name: string;
};

const PRESETS = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
];

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

const fmtInr = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

export default function PartnerAnalytics() {
  const ctx = usePartnerHotel();
  const [range, setRange] = useState("30");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalRooms, setTotalRooms] = useState(1);
  const [loading, setLoading] = useState(true);

  const days = parseInt(range, 10);
  const start = useMemo(() => subDays(new Date(), days), [days]);

  useEffect(() => {
    if (ctx.loading || !ctx.hotelId) return;
    (async () => {
      setLoading(true);
      const [{ data: b }, { data: h }] = await Promise.all([
        (supabase as any).from("hotel_bookings")
          .select("id,check_in,check_out,total_amount,status,num_rooms,booking_type,room_type,created_at,guest_name")
          .eq("hotel_id", ctx.hotelId)
          .gte("created_at", start.toISOString())
          .order("created_at", { ascending: false }),
        (supabase as any).from("partner_hotels").select("total_rooms").eq("id", ctx.hotelId).maybeSingle(),
      ]);
      setBookings(b || []);
      setTotalRooms(Math.max(1, h?.total_rooms || 1));
      setLoading(false);
    })();
  }, [ctx.loading, ctx.hotelId, start]);

  const stats = useMemo(() => {
    const paid = bookings.filter((x) => ["confirmed", "checked_in", "checked_out"].includes(x.status));
    const cancelled = bookings.filter((x) => x.status === "cancelled");
    let roomNights = 0, revenue = 0, leadDaySum = 0;
    for (const b of paid) {
      const nights = Math.max(1, differenceInDays(parseISO(b.check_out), parseISO(b.check_in)));
      roomNights += nights * (b.num_rooms || 1);
      revenue += Number(b.total_amount || 0);
      leadDaySum += Math.max(0, differenceInDays(parseISO(b.check_in), parseISO(b.created_at)));
    }
    const availNights = totalRooms * days;
    const occupancy = availNights ? (roomNights / availNights) * 100 : 0;
    const adr = roomNights ? revenue / roomNights : 0;
    const revpar = availNights ? revenue / availNights : 0;
    return {
      revenue, adr, revpar, occupancy,
      bookings: paid.length,
      cancelRate: bookings.length ? (cancelled.length / bookings.length) * 100 : 0,
      avgLead: paid.length ? leadDaySum / paid.length : 0,
    };
  }, [bookings, totalRooms, days]);

  const revenueSeries = useMemo(() => {
    const map = new Map<string, number>();
    eachDayOfInterval({ start, end: new Date() }).forEach((d) => map.set(format(d, "yyyy-MM-dd"), 0));
    for (const b of bookings) {
      if (!["confirmed", "checked_in", "checked_out"].includes(b.status)) continue;
      const k = format(parseISO(b.created_at), "yyyy-MM-dd");
      if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(b.total_amount || 0));
    }
    return Array.from(map, ([date, revenue]) => ({ date: format(parseISO(date), "MMM d"), revenue }));
  }, [bookings, start]);

  const channelMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      if (!["confirmed", "checked_in", "checked_out"].includes(b.status)) continue;
      const key = b.booking_type === "visit_stay" ? "Visit + Stay" : "Direct (JAAGA X)";
      m.set(key, (m.get(key) || 0) + Number(b.total_amount || 0));
    }
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [bookings]);

  const topRooms = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      if (!["confirmed", "checked_in", "checked_out"].includes(b.status)) continue;
      const k = b.room_type || "Standard";
      m.set(k, (m.get(k) || 0) + Number(b.total_amount || 0));
    }
    return Array.from(m, ([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [bookings]);

  const occGrid = useMemo(() => {
    const nights = new Map<string, number>();
    for (const b of bookings) {
      if (!["confirmed", "checked_in", "checked_out"].includes(b.status)) continue;
      const dates = eachDayOfInterval({ start: parseISO(b.check_in), end: subDays(parseISO(b.check_out), 1) });
      for (const d of dates) {
        const k = format(d, "yyyy-MM-dd");
        nights.set(k, (nights.get(k) || 0) + (b.num_rooms || 1));
      }
    }
    return eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }).map((d) => {
      const k = format(d, "yyyy-MM-dd");
      const occ = ((nights.get(k) || 0) / totalRooms) * 100;
      return { date: d, occ: Math.min(100, occ) };
    });
  }, [bookings, totalRooms]);

  const exportCsv = () => {
    const header = "Booking ID,Guest,Check-in,Check-out,Nights,Rooms,Room Type,Status,Channel,Amount,Created\n";
    const rows = bookings.map((b) => {
      const nights = Math.max(1, differenceInDays(parseISO(b.check_out), parseISO(b.check_in)));
      return [
        b.id, `"${b.guest_name}"`, b.check_in, b.check_out, nights, b.num_rooms,
        b.room_type || "", b.status, b.booking_type || "direct",
        b.total_amount, b.created_at,
      ].join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings_${range}d_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("JAAGA X — Performance Report", 14, 20);
    doc.setFontSize(11); doc.text(ctx.hotelName, 14, 28);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Period: last ${days} days · Generated ${format(new Date(), "PP")}`, 14, 34);
    doc.setTextColor(0);
    let y = 46;
    const lines: [string, string][] = [
      ["Revenue", fmtInr(stats.revenue)],
      ["ADR (Avg Daily Rate)", fmtInr(stats.adr)],
      ["RevPAR", fmtInr(stats.revpar)],
      ["Occupancy", stats.occupancy.toFixed(1) + "%"],
      ["Bookings", String(stats.bookings)],
      ["Cancellation rate", stats.cancelRate.toFixed(1) + "%"],
      ["Avg lead time (days)", stats.avgLead.toFixed(1)],
    ];
    doc.setFontSize(12);
    for (const [k, v] of lines) {
      doc.text(k, 14, y); doc.text(v, 120, y); y += 8;
    }
    doc.save(`report_${range}d_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF exported");
  };

  if (ctx.loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PartnerNav /><PartnerSubNav />
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PartnerNav /><PartnerSubNav />
      <main className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Analytics & Reports</h1>
            <p className="text-sm text-muted-foreground">{ctx.hotelName}</p>
          </div>
          <div className="flex gap-2">
            <Tabs value={range} onValueChange={setRange}>
              <TabsList>{PRESETS.map((p) => <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>)}</TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<IndianRupee className="h-4 w-4" />} label="Revenue" value={fmtInr(stats.revenue)} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="ADR" value={fmtInr(stats.adr)} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="RevPAR" value={fmtInr(stats.revpar)} />
          <StatCard icon={<Percent className="h-4 w-4" />} label="Occupancy" value={stats.occupancy.toFixed(1) + "%"} />
          <StatCard icon={<CalendarCheck className="h-4 w-4" />} label="Bookings" value={String(stats.bookings)} />
          <StatCard label="Cancellation" value={stats.cancelRate.toFixed(1) + "%"} />
          <StatCard label="Avg lead (days)" value={stats.avgLead.toFixed(1)} />
          <StatCard label="Total rooms" value={String(totalRooms)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="mb-3 text-sm font-medium">Revenue trend</div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={revenueSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + (v/1000).toFixed(0) + "k"} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(v: number) => fmtInr(v)} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 text-sm font-medium">Channel mix</div>
                  {channelMix.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No revenue yet</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={channelMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                            {channelMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmtInr(v)} contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 text-sm font-medium">Top rooms by revenue</div>
                  {topRooms.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No sales yet</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={topRooms} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + (v/1000).toFixed(0) + "k"} />
                          <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} width={90} />
                          <Tooltip formatter={(v: number) => fmtInr(v)} contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                          <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-3 text-sm font-medium">Occupancy — last 30 days</div>
                <div className="grid grid-cols-10 gap-1.5">
                  {occGrid.map((d, i) => {
                    const alpha = Math.max(0.12, d.occ / 100);
                    return (
                      <div
                        key={i}
                        title={`${format(d.date, "MMM d")} — ${d.occ.toFixed(0)}%`}
                        className="aspect-square rounded"
                        style={{ backgroundColor: `rgba(16,185,129,${alpha})` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Low</span>
                  {[0.15, 0.35, 0.6, 0.85, 1].map((a, i) => (
                    <div key={i} className="h-3 w-6 rounded" style={{ backgroundColor: `rgba(16,185,129,${a})` }} />
                  ))}
                  <span>High</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
