import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Heart, MessageSquare, TrendingUp, Phone, Share2, Target,
  Award, ArrowUpRight, Activity, Calendar
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfDay } from "date-fns";

interface PropertyEvent {
  id: string;
  property_id: string;
  user_id: string | null;
  event_type: string;
  source: string | null;
  metadata: any;
  created_at: string;
}

interface PropertyRow {
  id: string;
  title: string;
}

type RangeKey = "7d" | "30d" | "90d" | "custom";

const LEAD_TYPES = ["lead", "call_click", "whatsapp_click"];
const SOURCE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
];

const fmt = (d: Date) => format(d, "MMM dd");

export default function BuilderAnalyticsPanel() {
  const [events, setEvents] = useState<PropertyEvent[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  const { fromDate, toDate } = useMemo(() => {
    if (range === "custom" && customFrom && customTo) {
      return { fromDate: startOfDay(customFrom), toDate: customTo };
    }
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return { fromDate: startOfDay(subDays(new Date(), days - 1)), toDate: new Date() };
  }, [range, customFrom, customTo]);

  useEffect(() => {
    fetchData();
    // realtime subscription on events
    const channel = supabase
      .channel("property-events-builder")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_events" },
        () => fetchData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate.getTime(), toDate.getTime()]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Builder's own properties
    const { data: props } = await supabase
      .from("properties")
      .select("id, title")
      .eq("submitted_by", user.id);

    const propList = (props || []) as PropertyRow[];
    setProperties(propList);

    if (propList.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const ids = propList.map(p => p.id);
    const { data: evts } = await supabase
      .from("property_events" as any)
      .select("*")
      .in("property_id", ids)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString())
      .order("created_at", { ascending: true })
      .limit(10000);

    setEvents((evts || []) as unknown as PropertyEvent[]);
    setLoading(false);
  };

  // ---- aggregations ----
  const totals = useMemo(() => {
    const views = events.filter(e => e.event_type === "view").length;
    const saves = events.filter(e => e.event_type === "save").length;
    const leads = events.filter(e => LEAD_TYPES.includes(e.event_type)).length;
    const conv = views > 0 ? (leads / views) * 100 : 0;
    return { views, saves, leads, conv };
  }, [events]);

  const timeSeries = useMemo(() => {
    const map = new Map<string, { date: string; views: number; leads: number; saves: number }>();
    const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000));
    for (let i = 0; i <= days; i++) {
      const d = subDays(toDate, days - i);
      const key = format(d, "yyyy-MM-dd");
      map.set(key, { date: fmt(d), views: 0, leads: 0, saves: 0 });
    }
    events.forEach(e => {
      const key = format(new Date(e.created_at), "yyyy-MM-dd");
      const row = map.get(key);
      if (!row) return;
      if (e.event_type === "view") row.views++;
      else if (e.event_type === "save") row.saves++;
      else if (LEAD_TYPES.includes(e.event_type)) row.leads++;
    });
    return Array.from(map.values());
  }, [events, fromDate, toDate]);

  const propertyPerf = useMemo(() => {
    return properties.map(p => {
      const evts = events.filter(e => e.property_id === p.id);
      const views = evts.filter(e => e.event_type === "view").length;
      const saves = evts.filter(e => e.event_type === "save").length;
      const leads = evts.filter(e => LEAD_TYPES.includes(e.event_type)).length;
      const conv = views > 0 ? (leads / views) * 100 : 0;
      return { ...p, views, saves, leads, conv };
    }).sort((a, b) => b.views - a.views);
  }, [properties, events]);

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = { search: 0, direct: 0, ad: 0, featured: 0, other: 0 };
    events.forEach(e => {
      const s = (e.source || "direct").toLowerCase();
      if (s in counts) counts[s]++;
      else counts.other++;
    });
    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [events]);

  const funnel = useMemo(() => [
    { stage: "Views", value: totals.views },
    { stage: "Saves", value: totals.saves },
    { stage: "Leads", value: totals.leads },
  ], [totals]);

  const top = useMemo(() => {
    const byViews = [...propertyPerf].sort((a, b) => b.views - a.views)[0];
    const byLeads = [...propertyPerf].sort((a, b) => b.leads - a.leads)[0];
    const byConv = [...propertyPerf].filter(p => p.views >= 5).sort((a, b) => b.conv - a.conv)[0];
    return { byViews, byLeads, byConv };
  }, [propertyPerf]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Performance & Insights
          </h2>
          <p className="text-sm text-muted-foreground">Real-time analytics across all your listings</p>
        </div>

        {/* Time filter */}
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
          {range === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {customFrom && customTo
                    ? `${format(customFrom, "MMM d")} – ${format(customTo, "MMM d")}`
                    : "Pick range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={{ from: customFrom, to: customTo }}
                  onSelect={(r: any) => { setCustomFrom(r?.from); setCustomTo(r?.to); }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Eye} label="Total Views" value={totals.views} accent="primary" />
        <KpiCard icon={MessageSquare} label="Total Leads" value={totals.leads} accent="accent" />
        <KpiCard icon={Heart} label="Total Saves" value={totals.saves} accent="secondary" />
        <KpiCard icon={Target} label="Conversion Rate" value={`${totals.conv.toFixed(1)}%`} accent="primary" />
      </div>

      {/* Performance Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Trend</CardTitle>
          <CardDescription>Views and leads over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={2} />
                <Line type="monotone" dataKey="saves" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Source + Funnel */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Source Breakdown</CardTitle>
            <CardDescription>Where your traffic comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {sourceBreakdown.length === 0 ? (
                <EmptyState text="No traffic data yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {sourceBreakdown.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
            <CardDescription>Views → Saves → Leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={70} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid md:grid-cols-3 gap-4">
        <TopCard icon={Eye} label="Most Viewed" property={top.byViews?.title} value={`${top.byViews?.views ?? 0} views`} />
        <TopCard icon={MessageSquare} label="Most Leads" property={top.byLeads?.title} value={`${top.byLeads?.leads ?? 0} leads`} />
        <TopCard icon={Award} label="Best Conversion" property={top.byConv?.title} value={`${(top.byConv?.conv ?? 0).toFixed(1)}%`} />
      </div>

      {/* Property-wise Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property-wise Performance</CardTitle>
          <CardDescription>Engagement across each listing</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : propertyPerf.length === 0 ? (
            <EmptyState text="No properties to analyze yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Saves</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Conv %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyPerf.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[280px] truncate">{p.title}</TableCell>
                      <TableCell className="text-right">{p.views}</TableCell>
                      <TableCell className="text-right">{p.saves}</TableCell>
                      <TableCell className="text-right">{p.leads}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.conv >= 5 ? "default" : "secondary"}>
                          {p.conv.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 text-${accent}`} />
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </CardContent>
    </Card>
  );
}

function TopCard({ icon: Icon, label, property, value }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        <p className="font-semibold truncate">{property || "—"}</p>
        <p className="text-sm text-primary mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
