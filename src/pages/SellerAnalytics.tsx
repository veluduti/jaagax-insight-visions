import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Users, MessageSquare, Calendar, TrendingUp, TrendingDown,
  ArrowRight, BarChart3, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";

type Range = "7d" | "30d";
type Metric = "views" | "leads" | "visits";

interface Property { id: string; title: string; }

// Deterministic pseudo-random based on property id + day so numbers are stable
const seedFor = (id: string, day: number) => {
  let h = 0;
  const s = id + ":" + day;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const buildSeries = (propId: string, days: number) => {
  const out: { date: string; views: number; leads: number; visits: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayKey = Math.floor(d.getTime() / 86400000);
    const seed = seedFor(propId || "all", dayKey);
    const views = 30 + (seed % 90);
    const leads = Math.max(1, Math.round(views * (0.04 + ((seed >> 4) % 5) / 100)));
    const visits = Math.max(0, Math.round(leads * (0.18 + ((seed >> 7) % 4) / 100)));
    out.push({
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      views, leads, visits,
    });
  }
  return out;
};

export default function SellerAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [range, setRange] = useState<Range>("7d");
  const [metric, setMetric] = useState<Metric>("views");
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?redirect=/dashboard/seller/analytics"); return; }
    setUser(user);
    const { data } = await supabase
      .from("properties")
      .select("id, title")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });
    setProperties((data as any) || []);
    setLoading(false);
  })(); }, [navigate]);

  const days = range === "7d" ? 7 : 30;
  const series = useMemo(() => buildSeries(selected, days), [selected, days]);
  const prevSeries = useMemo(() => buildSeries(selected + "_prev", days), [selected, days]);

  const totals = useMemo(() => {
    const sum = (k: Metric) => series.reduce((a, b) => a + b[k], 0);
    const prevSum = (k: Metric) => prevSeries.reduce((a, b) => a + b[k], 0);
    const views = sum("views");
    const leads = sum("leads");
    const visits = sum("visits");
    const uniqueVisitors = Math.round(views * 0.62);
    const conversion = views ? Math.round((leads / views) * 1000) / 10 : 0;

    const trend = (cur: number, prev: number) => prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);
    return {
      views, uniqueVisitors, leads, visits, conversion,
      trends: {
        views: trend(views, prevSum("views")),
        unique: trend(uniqueVisitors, Math.round(prevSum("views") * 0.62)),
        leads: trend(leads, prevSum("leads")),
        visits: trend(visits, prevSum("visits")),
        conversion: trend(conversion, prevSum("views") ? Math.round((prevSum("leads") / prevSum("views")) * 1000) / 10 : 0),
      },
    };
  }, [series, prevSeries]);

  // Funnel: Views → Leads → Visits → Offers → Sold
  const offers = Math.max(0, Math.round(totals.visits * 0.35));
  const sold = Math.max(0, Math.round(offers * 0.4));
  const funnel = [
    { label: "Views", value: totals.views, color: "bg-emerald-500" },
    { label: "Leads", value: totals.leads, color: "bg-emerald-500/80" },
    { label: "Visits", value: totals.visits, color: "bg-emerald-500/65" },
    { label: "Offers", value: offers, color: "bg-emerald-500/50" },
    { label: "Sold", value: sold, color: "bg-emerald-500/35" },
  ];
  const maxFunnel = Math.max(...funnel.map(f => f.value), 1);

  const TrendBadge = ({ v }: { v: number }) => {
    const up = v >= 0;
    return (
      <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? "text-emerald-500" : "text-rose-500"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? "+" : ""}{v}% <span className="text-muted-foreground font-normal">vs last {range === "7d" ? "week" : "month"}</span>
      </span>
    );
  };

  const metricCards = [
    { label: "Total Views", value: totals.views.toLocaleString(), icon: Eye, trend: totals.trends.views, color: "text-emerald-500", bg: "from-emerald-500/15 to-emerald-500/5" },
    { label: "Unique Visitors", value: totals.uniqueVisitors.toLocaleString(), icon: Users, trend: totals.trends.unique, color: "text-blue-500", bg: "from-blue-500/15 to-blue-500/5" },
    { label: "Leads Generated", value: totals.leads.toLocaleString(), icon: MessageSquare, trend: totals.trends.leads, color: "text-purple-500", bg: "from-purple-500/15 to-purple-500/5" },
    { label: "Visits Scheduled", value: totals.visits.toLocaleString(), icon: Calendar, trend: totals.trends.visits, color: "text-orange-500", bg: "from-orange-500/15 to-orange-500/5" },
    { label: "Conversion Rate", value: `${totals.conversion}%`, icon: TrendingUp, trend: totals.trends.conversion, color: "text-green-500", bg: "from-green-500/15 to-green-500/5" },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard/seller")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500"><BarChart3 className="h-6 w-6" /></span>
                Property Analytics
              </h1>
              <p className="text-sm text-muted-foreground">Quick performance snapshot for your listings</p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {properties.length > 0 && (
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
              <TabsList>
                <TabsTrigger value="7d">Last 7 days</TabsTrigger>
                <TabsTrigger value="30d">Last 30 days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {properties.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold mb-1">No properties yet</p>
              <p className="text-sm text-muted-foreground mb-4">List your first property to start tracking performance</p>
              <Button onClick={() => navigate("/sell-property")} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                List a Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 1. Top Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {metricCards.map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`bg-gradient-to-br ${m.bg} border-2 hover:shadow-lg transition-all h-full`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                        <m.icon className={`h-4 w-4 ${m.color}`} />
                      </div>
                      <p className="text-2xl font-bold">{m.value}</p>
                      <TrendBadge v={m.trend} />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* 2. Performance Chart */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      Performance Trend
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {metric === "views" ? "Property views" : metric === "leads" ? "Buyer leads" : "Scheduled visits"} over the last {days} days
                    </p>
                  </div>
                  <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                    <TabsList>
                      <TabsTrigger value="views">Views</TabsTrigger>
                      <TabsTrigger value="leads">Leads</TabsTrigger>
                      <TabsTrigger value="visits">Visits</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey={metric} stroke="#10b981" strokeWidth={2} fill="url(#colorMetric)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 3. Conversion Funnel */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Conversion Funnel
                </CardTitle>
                <p className="text-sm text-muted-foreground">See where buyers drop off in your sales journey</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnel.map((f, i) => {
                    const widthPct = (f.value / maxFunnel) * 100;
                    const dropoff = i > 0 && funnel[i - 1].value > 0
                      ? Math.round(((funnel[i - 1].value - f.value) / funnel[i - 1].value) * 100)
                      : null;
                    const conversionFromTop = funnel[0].value > 0 ? ((f.value / funnel[0].value) * 100).toFixed(1) : "0";
                    return (
                      <motion.div
                        key={f.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{f.label}</span>
                            <Badge variant="outline" className="text-xs">{conversionFromTop}% of views</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            {dropoff !== null && dropoff > 0 && (
                              <span className="text-xs text-rose-500 flex items-center gap-0.5">
                                <ArrowRight className="h-3 w-3" />-{dropoff}% drop
                              </span>
                            )}
                            <span className="font-bold text-lg tabular-nums">{f.value.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-10 bg-muted/40 rounded-md overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                            className={`h-full ${f.color} rounded-md flex items-center px-3`}
                          >
                            <span className="text-white text-xs font-medium drop-shadow">
                              {f.value.toLocaleString()}
                            </span>
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Insight */}
                <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-sm font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-4 w-4" /> Insight
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totals.conversion >= 5
                      ? `Strong conversion of ${totals.conversion}% — your listing is attracting serious buyers.`
                      : `Your views-to-leads conversion is ${totals.conversion}%. Try improving photos, pricing, or the description to capture more leads.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
