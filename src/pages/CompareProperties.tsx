import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  GitCompare, MapPin, Home, Shield, TrendingUp, X, Plus,
  ExternalLink, Calendar, Car, Dumbbell, Waves, ShieldCheck,
  CheckCircle2, ArrowRight, Calculator
} from "lucide-react";

interface Property {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  bhk: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  trust_score: number | null;
  builder_id: string | null;
  completion_stage: string | null;
  total_floors: number | null;
  total_parking: number | null;
  building_name: string | null;
}

const CompareProperties = () => {
  const navigate = useNavigate();
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllProperties();
  }, []);

  useEffect(() => {
    setSelectedProperties(allProperties.filter(p => selectedIds.includes(p.id)));
  }, [selectedIds, allProperties]);

  const fetchAllProperties = async () => {
    const { data } = await supabase.from("properties").select("*").order("title");
    if (data) setAllProperties(data);
    setLoading(false);
  };

  const addProperty = (id: string) => {
    if (selectedIds.length >= 4) { toast.error("Maximum 4 properties"); return; }
    if (selectedIds.includes(id)) return;
    setSelectedIds([...selectedIds, id]);
  };

  const removeProperty = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const formatPrice = (p: number) => {
    if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)}Cr`;
    return `₹${(p / 100000).toFixed(1)}L`;
  };

  const pricePerSqft = (p: Property) =>
    p.area_sqft && p.area_sqft > 0 ? Math.round(p.price / p.area_sqft) : null;

  const emi = (price: number) => {
    const r = 8.5 / 12 / 100;
    const n = 20 * 12;
    const loanAmt = price * 0.8;
    return Math.round((loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  };

  // Find best values
  const bestPricePerSqft = selectedProperties.reduce((best, p) => {
    const pps = pricePerSqft(p);
    if (!pps) return best;
    if (!best || pps < best) return pps;
    return best;
  }, null as number | null);

  const bestTrustScore = Math.max(...selectedProperties.map(p => p.trust_score || 0));

  const isBestValue = (p: Property, metric: string) => {
    if (selectedProperties.length < 2) return false;
    if (metric === "pricePerSqft") return pricePerSqft(p) === bestPricePerSqft && bestPricePerSqft !== null;
    if (metric === "trustScore") return (p.trust_score || 0) === bestTrustScore && bestTrustScore > 0;
    return false;
  };

  const ComparisonRow = ({ label, values, highlight }: { label: string; values: (string | React.ReactNode)[]; highlight?: boolean[] }) => {
    if (showDiffsOnly) {
      const strValues = values.map(v => (typeof v === "string" ? v : ""));
      if (new Set(strValues).size <= 1) return null;
    }
    return (
      <div className="grid border-b border-border/50 hover:bg-muted/30 transition-colors" style={{ gridTemplateColumns: `200px repeat(${selectedProperties.length}, 1fr)` }}>
        <div className="p-3 text-sm font-medium text-muted-foreground flex items-center">{label}</div>
        {values.map((val, i) => (
          <div key={i} className={`p-3 text-sm font-semibold text-center ${highlight?.[i] ? "bg-green-500/10 text-green-600" : ""}`}>
            {val || "—"}
          </div>
        ))}
      </div>
    );
  };

  const available = allProperties.filter(p => !selectedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <GitCompare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Compare Properties</h1>
            <p className="text-muted-foreground">Select 2–4 properties to compare side-by-side</p>
          </div>
        </div>

        {/* Property Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {selectedIds.map((id, idx) => {
            const prop = selectedProperties.find(p => p.id === id);
            if (!prop) return null;
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="relative overflow-hidden">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={() => removeProperty(id)}>
                    <X className="h-4 w-4" />
                  </Button>
                  {prop.images?.[0] && (
                    <img src={prop.images[0]} alt={prop.title} className="w-full h-32 object-cover" />
                  )}
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{prop.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{prop.locality}, {prop.city}
                    </p>
                    <p className="text-lg font-bold text-primary mt-1">{formatPrice(prop.price)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => window.open(`/property/${prop.id}`, "_blank")}>
                        <ExternalLink className="h-3 w-3 mr-1" />Details
                      </Button>
                    </div>
                  </CardContent>
                  {isBestValue(prop, "pricePerSqft") && (
                    <Badge className="absolute top-2 left-2 bg-green-600 text-xs">Best Value</Badge>
                  )}
                  {isBestValue(prop, "trustScore") && (
                    <Badge className="absolute top-10 left-2 bg-primary text-xs">Most Trusted</Badge>
                  )}
                </Card>
              </motion.div>
            );
          })}

          {selectedIds.length < 4 && (
            <Card className="border-dashed border-2 flex items-center justify-center min-h-[200px]">
              <div className="text-center p-4 w-full">
                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Select onValueChange={addProperty}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add property..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {available.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — {p.locality} ({formatPrice(p.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}
        </div>

        {/* Comparison Table */}
        {selectedProperties.length >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Controls */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Switch checked={showDiffsOnly} onCheckedChange={setShowDiffsOnly} />
                <Label className="text-sm">Show only differences</Label>
              </div>
            </div>

            {/* Basic Info */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ComparisonRow label="Price" values={selectedProperties.map(p => formatPrice(p.price))} />
                <ComparisonRow
                  label="Price per sqft"
                  values={selectedProperties.map(p => pricePerSqft(p) ? `₹${pricePerSqft(p)!.toLocaleString()}` : "—")}
                  highlight={selectedProperties.map(p => isBestValue(p, "pricePerSqft"))}
                />
                <ComparisonRow label="BHK" values={selectedProperties.map(p => p.bhk ? `${p.bhk} BHK` : "—")} />
                <ComparisonRow label="Area" values={selectedProperties.map(p => p.area_sqft ? `${p.area_sqft} sqft` : "—")} />
                <ComparisonRow label="Type" values={selectedProperties.map(p => p.type || "—")} />
                <ComparisonRow label="Bedrooms" values={selectedProperties.map(p => String(p.bedrooms || p.bhk || "—"))} />
                <ComparisonRow label="Bathrooms" values={selectedProperties.map(p => String(p.bathrooms || "—"))} />
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Project Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ComparisonRow label="Building" values={selectedProperties.map(p => p.building_name || "—")} />
                <ComparisonRow label="Stage" values={selectedProperties.map(p => p.completion_stage || "—")} />
                <ComparisonRow label="Total Floors" values={selectedProperties.map(p => String(p.total_floors || "—"))} />
                <ComparisonRow label="Location" values={selectedProperties.map(p => `${p.locality}, ${p.city}`)} />
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Amenities</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ComparisonRow
                  label="Parking"
                  values={selectedProperties.map(p => p.total_parking ? (
                    <span className="flex items-center justify-center gap-1"><Car className="h-3 w-3" /> {p.total_parking} spots</span>
                  ) : "—")}
                />
                <ComparisonRow label="Verified" values={selectedProperties.map(p => p.verified ? (
                  <span className="flex items-center justify-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                ) : "No")} />
              </CardContent>
            </Card>

            {/* Trust & Verification */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Trust & Verification</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ComparisonRow
                  label="Trust Score"
                  values={selectedProperties.map(p => p.trust_score ? `${p.trust_score}/100` : "—")}
                  highlight={selectedProperties.map(p => isBestValue(p, "trustScore"))}
                />
                <ComparisonRow label="Verified" values={selectedProperties.map(p => p.verified ? "✓ JaagaX Verified" : "Not Verified")} />
              </CardContent>
            </Card>

            {/* Financials */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Financials (Estimated)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ComparisonRow
                  label="EMI (20yr, 8.5%)"
                  values={selectedProperties.map(p => `₹${emi(p.price).toLocaleString()}/mo`)}
                />
                <ComparisonRow
                  label="Registration (~7%)"
                  values={selectedProperties.map(p => formatPrice(Math.round(p.price * 0.07)))}
                />
                <ComparisonRow
                  label="Total Cost (est.)"
                  values={selectedProperties.map(p => formatPrice(Math.round(p.price * 1.1)))}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: `repeat(${selectedProperties.length}, 1fr)` }}>
              {selectedProperties.map(prop => (
                <div key={prop.id} className="space-y-2">
                  <Button className="w-full" onClick={() => window.open(`/property/${prop.id}`, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />View Details
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/visit/schedule/${prop.id}`)}>
                    <Calendar className="h-4 w-4 mr-2" />Schedule Visit
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {selectedProperties.length < 2 && (
          <Card className="text-center py-16">
            <CardContent>
              <GitCompare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Select at least 2 properties</h3>
              <p className="text-muted-foreground mb-4">Use the dropdowns above to add properties for comparison</p>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CompareProperties;
