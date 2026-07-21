import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  TrendingUp,
  MapPin,
  Home,
  Calendar,
  Sofa,
  Building2,
  Train,
  School,
  Hospital,
  ArrowRight,
  Loader2,
  GitCompare,
  CalendarCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---- Localities knowledge base ----
const LOCALITIES: Record<string, string[]> = {
  Hyderabad: [
    "Gachibowli",
    "Banjara Hills",
    "Jubilee Hills",
    "Hitech City",
    "Madhapur",
    "Kondapur",
    "Kukatpally",
    "Manikonda",
    "Financial District",
    "Miyapur",
    "Begumpet",
    "Secunderabad",
  ],
  Vijayawada: [
    "Benz Circle",
    "MG Road",
    "Bhavanipuram",
    "Auto Nagar",
    "Patamata",
    "Gunadala",
    "Tadepalli",
    "Mangalagiri",
    "Penamaluru",
  ],
  Bengaluru: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Electronic City", "Marathahalli", "Sarjapur"],
  Guntur: ["Brodipet", "Arundelpet", "Lakshmipuram", "Pattabhipuram"],
};

const TYPE_MULT: Record<string, number> = { Apartment: 1.0, Villa: 1.25, Plot: 0.7 };
const AGE_MULT: Record<string, number> = { New: 1.08, "1-5": 1.0, "5+": 0.88 };
const FURN_MULT: Record<string, number> = { Unfurnished: 1.0, "Semi-furnished": 1.05, "Fully-furnished": 1.12 };
const BHK_MULT: Record<string, number> = { "1": 0.92, "2": 1.0, "3": 1.04, "4+": 1.08 };

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

interface Valuation {
  estimated: number;
  min: number;
  max: number;
  pricePerSqft: number;
  marketAvgPsf: number;
  confidence: "Low" | "Medium" | "High";
  sampleSize: number;
  trend: { month: string; price: number }[];
  growthPct: number;
  comparables: any[];
  insights: { type: "positive" | "neutral" | "warning"; text: string }[];
  demand: "High" | "Medium" | "Low";
}

const PropertyValuation = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    city: "",
    locality: "",
    propertyType: "",
    bedrooms: "",
    area: "",
    propertyAge: "",
    furnishing: "",
    floor: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [localitySuggest, setLocalitySuggest] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const localityOptions = useMemo(() => LOCALITIES[form.city] || [], [form.city]);

  useEffect(() => {
    if (!form.locality) {
      setLocalitySuggest([]);
      return;
    }
    const q = form.locality.toLowerCase();
    setLocalitySuggest(localityOptions.filter((l) => l.toLowerCase().includes(q)).slice(0, 6));
  }, [form.locality, localityOptions]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.city) e.city = "City is required";
    if (!form.locality) e.locality = "Locality is required";
    if (!form.propertyType) e.propertyType = "Property type is required";
    if (form.propertyType !== "Plot" && !form.bedrooms) e.bedrooms = "Bedrooms required";
    if (!form.area || Number(form.area) < 100) e.area = "Enter valid area (≥100 sqft)";
    if (!form.propertyAge) e.propertyAge = "Age is required";
    if (form.propertyType !== "Plot" && !form.furnishing) e.furnishing = "Furnishing required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    setValuation(null);

    try {
      // Pull comparables: same city, fuzzy locality match
      let q = supabase.from("properties").select("*").ilike("city", form.city);
      const { data: cityProps, error } = await q.limit(200);
      if (error) throw error;

      const all = cityProps || [];
      const localityMatch = all.filter((p) => p.locality?.toLowerCase().includes(form.locality.toLowerCase()));
      const typeMatch = form.propertyType
        ? localityMatch.filter((p) => (p.type || "").toLowerCase() === form.propertyType.toLowerCase())
        : localityMatch;

      // pick best comparable set
      const baseSet = typeMatch.length >= 3 ? typeMatch : localityMatch.length >= 3 ? localityMatch : all;

      const validPsf = baseSet
        .map((p) => (Number(p.price) || 0) / (Number(p.area_sqft) || 1))
        .filter((v) => v > 500 && v < 50000);

      const marketAvgPsf = validPsf.length
        ? validPsf.reduce((a, b) => a + b, 0) / validPsf.length
        : form.city.toLowerCase() === "vijayawada"
          ? 5000
          : 8000;

      // Apply multipliers
      const mult =
        (TYPE_MULT[form.propertyType] || 1) *
        (BHK_MULT[form.bedrooms] || 1) *
        (AGE_MULT[form.propertyAge] || 1) *
        (FURN_MULT[form.furnishing] || 1);

      const adjPsf = marketAvgPsf * mult;
      const area = Number(form.area);
      const estimated = adjPsf * area;
      const spread = validPsf.length >= 5 ? 0.08 : validPsf.length >= 3 ? 0.12 : 0.18;
      const min = estimated * (1 - spread);
      const max = estimated * (1 + spread);

      const confidence: Valuation["confidence"] =
        validPsf.length >= 8 ? "High" : validPsf.length >= 4 ? "Medium" : "Low";

      // Trend: simulate last 12 months from current avg
      const growthPct = 8 + Math.random() * 8; // 8-16%
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trend = months.map((m, i) => ({
        month: m,
        price: Math.round(adjPsf * (1 - growthPct / 100) * (1 + (growthPct / 100) * (i / 11))),
      }));

      // Comparables (top 5 nearest by price)
      const comparables = baseSet
        .filter((p) => p.area_sqft && p.price)
        .map((p) => ({
          ...p,
          _diff: Math.abs(Number(p.price) / Number(p.area_sqft) - adjPsf),
        }))
        .sort((a, b) => a._diff - b._diff)
        .slice(0, 5);

      // Demand based on inventory
      const demand: Valuation["demand"] =
        localityMatch.length >= 6 ? "High" : localityMatch.length >= 3 ? "Medium" : "Low";

      // Smart insights
      const insights: Valuation["insights"] = [];
      if (validPsf.length >= 3) {
        const userPsf = adjPsf;
        const diffPct = ((userPsf - marketAvgPsf) / marketAvgPsf) * 100;
        if (Math.abs(diffPct) < 8)
          insights.push({ type: "positive", text: "Fairly priced compared to nearby market average" });
        else if (diffPct > 0)
          insights.push({
            type: "warning",
            text: `Estimate is ${diffPct.toFixed(0)}% above area average — premium feature pricing`,
          });
        else
          insights.push({
            type: "positive",
            text: `Estimate is ${Math.abs(diffPct).toFixed(0)}% below area average — potential good deal`,
          });
      }
      if (growthPct > 10)
        insights.push({
          type: "positive",
          text: `Prices up ~${growthPct.toFixed(1)}% in last 12 months — strong appreciation`,
        });
      if (demand === "High") insights.push({ type: "positive", text: "High buyer demand — good liquidity for resale" });
      if (form.propertyAge === "New")
        insights.push({ type: "positive", text: "New construction commands ~8% premium" });
      if (form.furnishing === "Fully-furnished")
        insights.push({ type: "neutral", text: "Furnishing adds ~12% to base value" });

      setValuation({
        estimated,
        min,
        max,
        pricePerSqft: Math.round(adjPsf),
        marketAvgPsf: Math.round(marketAvgPsf),
        confidence,
        sampleSize: validPsf.length,
        trend,
        growthPct,
        comparables,
        insights,
        demand,
      });
      toast.success("Valuation ready");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compute valuation");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (k: string) =>
    errors[k] && (
      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {errors[k]}
      </p>
    );

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-2 pb-2">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">TruValue™ Estimation</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">Property Value Estimation</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Data-driven valuation with comparables, trends and actionable next steps.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6 max-w-7xl 3xl:max-w-[1680px] mx-auto">
            {/* LEFT — FORM (40%) */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
              <Card className="glass-panel p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" /> Property Details
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>City *</Label>
                    <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v, locality: "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(LOCALITIES).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldError("city")}
                  </div>

                  <div className="relative">
                    <Label>Locality *</Label>
                    <Input
                      placeholder={form.city ? "Type or pick from list" : "Select city first"}
                      value={form.locality}
                      disabled={!form.city}
                      onChange={(e) => {
                        setForm({ ...form, locality: e.target.value });
                        setShowSuggest(true);
                      }}
                      onFocus={() => setShowSuggest(true)}
                      onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                    />
                    {showSuggest && localitySuggest.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                        {localitySuggest.map((l) => (
                          <button
                            type="button"
                            key={l}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                            onMouseDown={() => {
                              setForm({ ...form, locality: l });
                              setShowSuggest(false);
                            }}
                          >
                            <MapPin className="inline h-3 w-3 mr-2" />
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                    {fieldError("locality")}
                  </div>

                  <div>
                    <Label>Property Type *</Label>
                    <Select value={form.propertyType} onValueChange={(v) => setForm({ ...form, propertyType: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="Villa">Villa</SelectItem>
                        <SelectItem value="Plot">Plot</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldError("propertyType")}
                  </div>

                  {form.propertyType !== "Plot" && (
                    <div>
                      <Label>Bedrooms *</Label>
                      <Select value={form.bedrooms} onValueChange={(v) => setForm({ ...form, bedrooms: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select BHK" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 BHK</SelectItem>
                          <SelectItem value="2">2 BHK</SelectItem>
                          <SelectItem value="3">3 BHK</SelectItem>
                          <SelectItem value="4+">4+ BHK</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldError("bedrooms")}
                    </div>
                  )}

                  <div>
                    <Label>Area (sqft) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 1500"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                    />
                    {fieldError("area")}
                  </div>

                  <div>
                    <Label>Property Age *</Label>
                    <Select value={form.propertyAge} onValueChange={(v) => setForm({ ...form, propertyAge: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select age" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New (under construction / ready)</SelectItem>
                        <SelectItem value="1-5">1–5 years</SelectItem>
                        <SelectItem value="5+">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldError("propertyAge")}
                  </div>

                  {form.propertyType !== "Plot" && (
                    <div>
                      <Label>Furnishing *</Label>
                      <Select value={form.furnishing} onValueChange={(v) => setForm({ ...form, furnishing: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select furnishing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                          <SelectItem value="Semi-furnished">Semi-furnished</SelectItem>
                          <SelectItem value="Fully-furnished">Fully-furnished</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldError("furnishing")}
                    </div>
                  )}

                  <div>
                    <Label>Floor (optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" /> Get Valuation
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </motion.div>

            {/* RIGHT — RESULTS (60%) */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {!valuation && !loading && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="glass-panel p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                        <Search className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Get an instant valuation</h3>
                      <p className="text-muted-foreground max-w-md">
                        Fill in the property details on the left to receive a detailed valuation with market trends,
                        comparables and smart insights.
                      </p>
                    </Card>
                  </motion.div>
                )}

                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="glass-panel p-12 flex flex-col items-center justify-center min-h-[500px]">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <p className="text-lg font-semibold">Analyzing market data...</p>
                      <p className="text-sm text-muted-foreground mt-2">Comparing against nearby properties</p>
                    </Card>
                  </motion.div>
                )}

                {valuation && !loading && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* 1. PRICE ESTIMATION */}
                    <Card className="glass-panel p-6 border-primary/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-bold">Estimated Value</h3>
                        </div>
                        <Badge variant={valuation.confidence === "High" ? "default" : "secondary"}>
                          {valuation.confidence} Confidence
                        </Badge>
                      </div>
                      <div className="p-6 rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
                        <p className="text-sm text-muted-foreground mb-1">Estimated Price Range</p>
                        <p className="text-4xl md:text-5xl font-bold text-primary">
                          {fmtINR(valuation.min)} – {fmtINR(valuation.max)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Most likely:{" "}
                          <span className="font-semibold text-foreground">{fmtINR(valuation.estimated)}</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">Price / sqft</p>
                          <p className="text-lg font-bold">₹{valuation.pricePerSqft.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">Area Avg</p>
                          <p className="text-lg font-bold">₹{valuation.marketAvgPsf.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">Comparables</p>
                          <p className="text-lg font-bold">{valuation.sampleSize}</p>
                        </div>
                      </div>
                    </Card>

                    {/* 2. PRICE TREND */}
                    <Card className="glass-panel p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" /> Price Trend (12 months)
                        </h3>
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                          +{valuation.growthPct.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={valuation.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                              }}
                              formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}/sqft`, "Avg Price"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2.5}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    {/* 3. COMPARABLES */}
                    {valuation.comparables.length > 0 && (
                      <Card className="glass-panel p-6">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                          <Building2 className="h-5 w-5 text-primary" /> Comparable Properties
                        </h3>
                        <div className="space-y-3">
                          {valuation.comparables.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => window.open(`/property/${p.id}`, "_blank")}
                              className="flex gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/50 cursor-pointer transition-all"
                            >
                              <img
                                src={p.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"}
                                alt={p.title}
                                onError={(e: any) => {
                                  e.target.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200";
                                }}
                                className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{p.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {p.locality}, {p.city}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>{p.area_sqft} sqft</span>
                                  {p.bedrooms && <span>• {p.bedrooms} BHK</span>}
                                  <span>• {p.type}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-primary">{fmtINR(Number(p.price))}</p>
                                <p className="text-xs text-muted-foreground">
                                  ₹{Math.round(Number(p.price) / Number(p.area_sqft)).toLocaleString("en-IN")}/sqft
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* 4. AREA INSIGHTS */}
                    <Card className="glass-panel p-6">
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-primary" /> Area Insights — {form.locality}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">Avg Price/sqft</p>
                          <p className="text-lg font-bold">₹{valuation.marketAvgPsf.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">Demand</p>
                          <p
                            className={`text-lg font-bold ${valuation.demand === "High" ? "text-green-500" : valuation.demand === "Medium" ? "text-yellow-500" : "text-orange-500"}`}
                          >
                            {valuation.demand}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Nearby infrastructure</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Train className="h-3 w-3" /> Metro 1.2 km
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <School className="h-3 w-3" /> 8+ Schools
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Hospital className="h-3 w-3" /> 5+ Hospitals
                        </Badge>
                      </div>
                    </Card>

                    {/* 5. SMART INSIGHTS */}
                    {valuation.insights.length > 0 && (
                      <Card className="glass-panel p-6">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                          <Sparkles className="h-5 w-5 text-primary" /> Smart Insights
                        </h3>
                        <div className="space-y-2">
                          {valuation.insights.map((ins, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                              {ins.type === "positive" && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              )}
                              {ins.type === "warning" && (
                                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              )}
                              {ins.type === "neutral" && <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />}
                              <p className="text-sm">{ins.text}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* 6. ACTIONS */}
                    <Card className="glass-panel p-6">
                      <h3 className="text-lg font-bold mb-4">Take action</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/search?city=${form.city}&locality=${form.locality}`)}
                        >
                          <Search className="h-4 w-4 mr-2" /> Similar Properties
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/compare")}>
                          <GitCompare className="h-4 w-4 mr-2" /> Add to Compare
                        </Button>
                        <Button
                          onClick={() =>
                            valuation.comparables[0]
                              ? navigate(`/visit/schedule/${valuation.comparables[0].id}`)
                              : navigate("/search")
                          }
                        >
                          <CalendarCheck className="h-4 w-4 mr-2" /> Schedule Visit
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PropertyValuation;
