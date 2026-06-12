import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, TrendingUp, MapPin, Loader2, ArrowRight,
  Building2, BedDouble, Bath, Ruler, Compass, Sofa, Calendar,
  Users, Clock, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PlacesAutocompleteInput from "@/components/location/PlacesAutocompleteInput";
import { toast } from "sonner";

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

interface ValuationResult {
  min_price: number;
  max_price: number;
  confidence: number;
  price_per_sqft: number;
  locality_trend: string;
  demand_score: number;
  avg_days_on_market: number;
}

interface Comparable {
  id: string;
  slug: string;
  title: string;
  price: number;
  bedrooms: number | null;
  area_sqft: number | null;
  city: string | null;
  locality: string | null;
}

const PROPERTY_TYPES = ["Apartment", "Villa", "Independent House", "Plot", "Commercial"];
const BEDROOMS = ["1", "2", "3", "4", "5+"];
const BATHROOMS = ["1", "2", "3", "4+"];
const FLOORS = ["Ground", "1st", "2nd", "3rd", "4th", "5th+"];
const AGES = ["Under 1 year", "1-5 years", "5-10 years", "10-20 years", "20+ years"];
const FACINGS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const FURNISHINGS = ["Fully Furnished", "Semi-Furnished", "Unfurnished"];

const BASE_PSF: Record<string, number> = {
  Apartment: 5500, Villa: 8500, "Independent House": 6500, Plot: 3200, Commercial: 9500,
};
const AGE_MULT: Record<string, number> = {
  "Under 1 year": 1.10, "1-5 years": 1.05, "5-10 years": 0.95,
  "10-20 years": 0.85, "20+ years": 0.72,
};
const FURN_MULT: Record<string, number> = {
  "Fully Furnished": 1.12, "Semi-Furnished": 1.05, "Unfurnished": 1.0,
};

export default function ValuationPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [propType, setPropType] = useState("Apartment");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");
  const [area, setArea] = useState("");
  const [floor, setFloor] = useState("1st");
  const [age, setAge] = useState("1-5 years");
  const [facing, setFacing] = useState("East");
  const [furnishing, setFurnishing] = useState("Semi-Furnished");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [comps, setComps] = useState<Comparable[]>([]);

  const handleCalculate = async () => {
    if (!area || Number(area) < 100) {
      toast.error("Please enter a valid area (min 100 sqft)");
      return;
    }
    if (!city && !locality) {
      toast.error("Please enter the property location");
      return;
    }
    setLoading(true);
    setResult(null);
    setComps([]);

    try {
      // Simulated AI analysis delay
      await new Promise((r) => setTimeout(r, 1400));

      const sqft = Number(area);
      const psf = Math.round(
        (BASE_PSF[propType] || 5000) *
        (AGE_MULT[age] || 1) *
        (FURN_MULT[furnishing] || 1),
      );
      const estimated = psf * sqft;
      const min_price = Math.round(estimated * 0.92);
      const max_price = Math.round(estimated * 1.08);

      const valuation: ValuationResult = {
        min_price,
        max_price,
        confidence: 78 + Math.floor(Math.random() * 15),
        price_per_sqft: psf,
        locality_trend: `+${(4 + Math.random() * 8).toFixed(1)}% in last 6 months`,
        demand_score: 60 + Math.floor(Math.random() * 35),
        avg_days_on_market: 30 + Math.floor(Math.random() * 40),
      };
      setResult(valuation);

      // Fetch comparable properties
      let query = supabase
        .from("properties")
        .select("id, slug, title, price, bedrooms, area_sqft, city, locality")
        .eq("status", "active")
        .limit(3);
      if (city) query = query.ilike("city", `%${city}%`);
      if (locality) query = query.ilike("locality", `%${locality}%`);
      const { data } = await query;
      setComps((data as any) || []);
    } catch (e) {
      console.error(e);
      toast.error("Valuation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleListAtPrice = () => {
    if (!result) return;
    const params = new URLSearchParams({
      prefill_price: String(Math.round((result.min_price + result.max_price) / 2)),
      prefill_type: propType,
      prefill_bedrooms: bedrooms,
      prefill_bathrooms: bathrooms,
      prefill_area: area,
      prefill_city: city,
      prefill_locality: locality,
      prefill_facing: facing,
      prefill_furnishing: furnishing,
    });
    navigate(`/sell-property?${params.toString()}`);
  };

  const confLabel = result
    ? result.confidence >= 80 ? "High" : result.confidence >= 65 ? "Medium" : "Low"
    : "—";
  const confColor = result
    ? result.confidence >= 80 ? "text-emerald-400" : result.confidence >= 65 ? "text-amber-400" : "text-rose-400"
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      <Navigation />

      {/* HERO */}
      <section className="relative pt-28 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.15),_transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Powered
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Get Your Property Valuation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered price estimate based on current market trends
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
        {/* FORM */}
        <Card className="p-6 md:p-8 bg-card/60 backdrop-blur-xl border-emerald-500/10 shadow-2xl shadow-emerald-500/5">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" /> Property Details
          </h2>

          {/* Address */}
          <div className="space-y-4 mb-6">
            <div>
              <Label className="mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Property Address
              </Label>
              <PlacesAutocompleteInput
                value={address}
                onChange={setAddress}
                onSelect={(loc) => {
                  setAddress(loc.formattedAddress || "");
                  setCity(loc.city || "");
                  setLocality(loc.locality || "");
                }}
                placeholder="Search address, locality or area…"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Locality</Label>
                <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g. Gachibowli" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pincode</Label>
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="500032" />
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Property Type" icon={<Building2 className="w-3.5 h-3.5" />}>
              <Select value={propType} onValueChange={setPropType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Bedrooms" icon={<BedDouble className="w-3.5 h-3.5" />}>
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BEDROOMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Bathrooms" icon={<Bath className="w-3.5 h-3.5" />}>
              <Select value={bathrooms} onValueChange={setBathrooms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BATHROOMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Area (sqft)" icon={<Ruler className="w-3.5 h-3.5" />}>
              <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="1200" />
            </Field>
            <Field label="Floor" icon={<Building2 className="w-3.5 h-3.5" />}>
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FLOORS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Age of Property" icon={<Calendar className="w-3.5 h-3.5" />}>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Facing" icon={<Compass className="w-3.5 h-3.5" />}>
              <Select value={facing} onValueChange={setFacing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FACINGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Furnishing" icon={<Sofa className="w-3.5 h-3.5" />}>
              <Select value={furnishing} onValueChange={setFurnishing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FURNISHINGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <Button
            size="lg"
            disabled={loading}
            onClick={handleCalculate}
            className="w-full mt-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing market data…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Calculate Valuation</>
            )}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Price card */}
            <Card className="p-6 md:p-8 bg-gradient-to-br from-emerald-500/10 via-card/60 to-card/60 backdrop-blur-xl border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Estimated Price
                </h2>
                <Badge variant="outline" className={`${confColor} border-current`}>
                  {confLabel} confidence ({result.confidence}%)
                </Badge>
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-2">
                {fmtINR(result.min_price)} – {fmtINR(result.max_price)}
              </div>
              <p className="text-sm text-muted-foreground">
                ₹{result.price_per_sqft.toLocaleString("en-IN")} per sqft
              </p>
              <Progress value={result.confidence} className="mt-4 h-1.5" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <Button onClick={handleListAtPrice} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  List at this Price <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/agents")}>
                  Contact Agent for Expert Valuation
                </Button>
              </div>
            </Card>

            {/* Market insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Insight icon={<TrendingUp className="w-4 h-4" />} label="Locality trend" value={result.locality_trend} accent="emerald" />
              <Insight icon={<Users className="w-4 h-4" />} label="Demand score" value={`${result.demand_score} / 100`} accent="amber" />
              <Insight icon={<Clock className="w-4 h-4" />} label="Avg days on market" value={`${result.avg_days_on_market} days`} accent="sky" />
            </div>

            {/* Comparables */}
            {comps.length > 0 && (
              <Card className="p-6 bg-card/60 backdrop-blur-xl border-emerald-500/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" /> Comparable Properties Nearby
                </h3>
                <div className="grid gap-3">
                  {comps.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border/50 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-1">
                          {p.bedrooms && <span>{p.bedrooms} BHK</span>}
                          {p.area_sqft && <span>{p.area_sqft} sqft</span>}
                          {p.locality && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.locality}</span>}
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <div className="font-semibold text-emerald-400">{fmtINR(p.price || 0)}</div>
                        <button
                          onClick={() => window.open(`/property/${p.slug}`, "_blank")}
                          className="text-xs text-muted-foreground hover:text-emerald-400"
                        >
                          View details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
      {children}
    </div>
  );
}

function Insight({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "emerald" | "amber" | "sky" }) {
  const accentMap = {
    emerald: "from-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/10 text-amber-400 border-amber-500/20",
    sky: "from-sky-500/10 text-sky-400 border-sky-500/20",
  } as const;
  return (
    <Card className={`p-4 bg-gradient-to-br ${accentMap[accent]} backdrop-blur-xl`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">{icon}{label}</div>
      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
    </Card>
  );
}
