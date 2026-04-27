import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { INDIAN_CITIES } from "@/data/indianCities";
import {
  Building2, Home as HomeIcon, Trees, LandPlot, Crown, Layers, Warehouse,
  MapPin, Ruler, IndianRupee, Sparkles, Phone, ChevronLeft, CheckCircle2,
  Loader2, Tag, Wand2, ArrowRight, Edit3, Plus,
} from "lucide-react";

/* ============================================================
   STATIC DATA
   ============================================================ */

type PropertyTypeKey =
  | "Apartment"
  | "Independent House"
  | "Villa"
  | "Plot"
  | "Agricultural Land"
  | "Penthouse"
  | "Duplex"
  | "Row House";

const PROPERTY_TYPES: { key: PropertyTypeKey; label: string; icon: any; tag: string }[] = [
  { key: "Apartment", label: "Apartment / Flat", icon: Building2, tag: "Most popular" },
  { key: "Independent House", label: "Independent House", icon: HomeIcon, tag: "Family favorite" },
  { key: "Villa", label: "Villa", icon: Crown, tag: "Premium" },
  { key: "Plot", label: "Plot / Land", icon: LandPlot, tag: "High ROI" },
  { key: "Agricultural Land", label: "Agricultural Land", icon: Trees, tag: "Farmland" },
  { key: "Penthouse", label: "Penthouse", icon: Sparkles, tag: "Luxury" },
  { key: "Duplex", label: "Duplex / Triplex", icon: Layers, tag: "Multi-level" },
  { key: "Row House", label: "Row House / Townhouse", icon: Warehouse, tag: "Community" },
];

const LISTING_PURPOSES = [
  { key: "sale", label: "Sale", desc: "Sell outright" },
  { key: "rent", label: "Rent", desc: "Monthly tenancy" },
  { key: "lease", label: "Lease", desc: "Long-term contract" },
];

const SIZE_UNITS = ["Sq Ft", "Sq Yard", "Acre", "Cent", "Gunta"] as const;
type SizeUnit = (typeof SIZE_UNITS)[number];

// Conditional question matrices per type
const AMENITIES_BY_TYPE: Record<PropertyTypeKey, string[]> = {
  Apartment: ["Lift", "Parking", "Gym", "Swimming Pool", "Security", "CCTV", "Power Backup", "Clubhouse"],
  Villa: ["Garden", "Swimming Pool", "Clubhouse", "Security", "Parking", "Gym", "CCTV"],
  "Independent House": ["Parking", "Water Supply", "Borewell", "Open Terrace", "Garden", "CCTV"],
  Plot: ["Road Access", "Electricity", "Water", "Drainage", "Compound Wall", "Corner Plot"],
  "Agricultural Land": ["Water Source", "Road Access", "Electricity"],
  Penthouse: ["Private Terrace", "Private Lift", "Pool", "Gym", "Security", "Concierge"],
  Duplex: ["Parking", "Internal Staircase", "Lift", "Security", "Garden"],
  "Row House": ["Parking", "Front Yard", "Back Yard", "Security", "Clubhouse"],
};

const FURNISHING = ["Furnished", "Semi-Furnished", "Unfurnished"];
const APPROVAL_TYPES = ["DTCP", "HMDA", "CRDA", "Panchayat", "Gram Panchayat", "RERA Approved", "Unapproved"];
const WATER_SOURCES = ["Borewell", "Municipal", "Canal", "Open Well", "None"];
const ROAD_ACCESS_OPTS = ["No Road", "10 ft", "20 ft", "30 ft", "40 ft", "60 ft+"];

/* ============================================================
   FORM STATE
   ============================================================ */

interface Listing {
  // required
  type: PropertyTypeKey | "";
  purpose: "sale" | "rent" | "lease" | "";
  city: string;
  locality: string;
  landmark: string;
  pincode: string;
  size_value: string;
  size_unit: SizeUnit;
  price_per_unit: string;
  // contact
  contact_name: string;
  contact_mobile: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_time: string;
  // optional / conditional
  title: string;
  description: string;
  amenities: string[];
  bhk: string;
  bathrooms: string;
  balconies: string;
  floor_number: string;
  total_floors: string;
  furnishing: string;
  // type-specific extras
  gated_community: boolean;
  private_pool: boolean;
  private_garden: boolean;
  open_terrace: boolean;
  water_source: string;
  road_access: string;
  electricity: string;
  approval_type: string;
  corner_plot: boolean;
  plot_dimensions: string;
  num_floors: string;
  private_terrace: boolean;
  top_floor: boolean;
  private_lift: boolean;
  levels_count: string;
  internal_staircase: boolean;
  common_walls: string;
  front_back_yard: boolean;
  nearby_landmarks: string[];
}

const initial: Listing = {
  type: "", purpose: "", city: "", locality: "", landmark: "", pincode: "",
  size_value: "", size_unit: "Sq Ft", price_per_unit: "",
  contact_name: "", contact_mobile: "", contact_whatsapp: "", contact_email: "", contact_time: "Anytime",
  title: "", description: "", amenities: [],
  bhk: "", bathrooms: "", balconies: "", floor_number: "", total_floors: "", furnishing: "",
  gated_community: false, private_pool: false, private_garden: false, open_terrace: false,
  water_source: "", road_access: "", electricity: "", approval_type: "",
  corner_plot: false, plot_dimensions: "", num_floors: "",
  private_terrace: false, top_floor: false, private_lift: false,
  levels_count: "", internal_staircase: false, common_walls: "", front_back_yard: false,
  nearby_landmarks: [],
};

interface AISuggestions {
  titles: string[];
  amenities: string[];
  nearby_landmarks: string[];
  description: string;
  price_suggestion: { unit: string; price_per_unit: number; reasoning: string };
}

/* ============================================================
   HELPERS
   ============================================================ */

const formatINR = (n: number) => {
  if (!isFinite(n) || n <= 0) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2).replace(/\.00$/, "")} Lakh`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${n.toLocaleString("en-IN")}`;
};

// Map our unit → sqft (for legacy area_sqft column; informational only)
const unitToSqft: Record<SizeUnit, number> = {
  "Sq Ft": 1,
  "Sq Yard": 9,
  "Acre": 43560,
  "Cent": 435.6,
  "Gunta": 1089,
};

const STEP_LABELS = [
  "Type", "Purpose", "Location", "Size", "Price",
  "AI Suggestions", "Details", "Amenities", "Extras", "Contact",
];

/* ============================================================
   SHARED UI
   ============================================================ */

const QuestionShell = ({
  step, total, title, subtitle, children,
}: {
  step: number; total: number; title: string; subtitle?: string; children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="w-full"
  >
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl shadow-primary/10 ring-1 ring-primary/20">
      {/* Decorative accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            Step {step} of {total}
          </div>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
        </div>
        <h2 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </Card>
  </motion.div>
);

const ChipButton = ({
  active, onClick, children, icon: Icon, tag,
}: {
  active?: boolean; onClick: () => void; children: React.ReactNode; icon?: any; tag?: string;
}) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 ${
      active
        ? "border-primary bg-gradient-to-br from-primary/15 to-accent/10 shadow-lg shadow-primary/25"
        : "border-border/50 bg-card/50 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    }`}
  >
    {Icon && (
      <div
        className={`rounded-xl p-2 transition-colors ${
          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/20"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
    )}
    <span className={`text-sm font-semibold ${active ? "text-foreground" : "text-foreground/90"}`}>{children}</span>
    {tag && (
      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
        {tag}
      </span>
    )}
    {active && (
      <div className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </div>
    )}
  </button>
);

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function SellProperty() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Listing>(initial);
  const [submitting, setSubmitting] = useState(false);

  const [ai, setAi] = useState<AISuggestions | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTriggered, setAiTriggered] = useState(false);
  const aiCacheKey = useRef<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: u }) => {
      if (!u.user) { navigate("/auth?redirect=/sell-property"); return; }
      setUser(u.user);
      setData((d) => ({ ...d, contact_email: u.user!.email || "" }));
    });
  }, [navigate]);

  /* ----------------------- AI suggestions ----------------------- */

  const triggerAI = async () => {
    const key = `${data.type}|${data.city}|${data.locality}`;
    if (aiCacheKey.current === key && ai) return;
    if (!data.type || !data.city) return;

    setAiLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("ai-listing-suggestions", {
        body: {
          propertyType: data.type,
          listingPurpose: data.purpose || "sale",
          city: data.city,
          locality: data.locality,
          landmark: data.landmark,
        },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);

      setAi(resp);
      aiCacheKey.current = key;

      // Auto-fill conveniences
      setData((d) => ({
        ...d,
        title: d.title || resp.titles?.[0] || "",
        description: d.description || resp.description || "",
        amenities: d.amenities.length
          ? d.amenities
          : (resp.amenities || []).filter((a: string) =>
              (AMENITIES_BY_TYPE[d.type as PropertyTypeKey] || []).includes(a)
            ),
        nearby_landmarks: resp.nearby_landmarks || [],
        price_per_unit: d.price_per_unit || (resp.price_suggestion?.price_per_unit?.toString() || ""),
        size_unit: (resp.price_suggestion?.unit as SizeUnit) || d.size_unit,
      }));
      setAiTriggered(true);
    } catch (e: any) {
      toast.error(e.message || "Couldn't fetch suggestions");
    } finally {
      setAiLoading(false);
    }
  };

  /* ----------------------- Validation ----------------------- */

  const totalPrice = useMemo(() => {
    const s = parseFloat(data.size_value);
    const p = parseFloat(data.price_per_unit);
    if (!isFinite(s) || !isFinite(p)) return 0;
    return s * p;
  }, [data.size_value, data.price_per_unit]);

  const canSubmit =
    !!data.type && !!data.purpose && !!data.city && !!data.locality &&
    !!data.size_value && !!data.price_per_unit &&
    !!data.contact_name && /^\d{10}$/.test(data.contact_mobile);

  /* ----------------------- Submit ----------------------- */

  const handleSubmit = async () => {
    if (!user) return;
    if (!canSubmit) {
      toast.error("Please complete required fields");
      return;
    }
    setSubmitting(true);
    try {
      const sqft = parseFloat(data.size_value) * (unitToSqft[data.size_unit] || 1);
      const payload: any = {
        submitted_by: user.id,
        title: data.title || `${data.type} in ${data.locality || data.city}`,
        type: data.type,
        listing_type: data.purpose,
        description: data.description || null,
        city: data.city,
        locality: data.locality,
        address: data.landmark || data.locality,
        pincode: data.pincode || null,
        bedrooms: data.bhk ? parseInt(data.bhk) : null,
        bhk: data.bhk ? parseInt(data.bhk) : null,
        bathrooms: data.bathrooms ? parseInt(data.bathrooms) : null,
        balconies: data.balconies ? parseInt(data.balconies) : null,
        area_sqft: isFinite(sqft) ? Math.round(sqft) : null,
        floor_number: data.floor_number ? parseInt(data.floor_number) : null,
        total_floors: data.total_floors ? parseInt(data.total_floors) : null,
        furnishing: data.furnishing || null,
        price: totalPrice || 0,
        amenities: data.amenities,
        images: [],
        video_urls: [],
        document_urls: {
          size_unit: data.size_unit,
          size_value: data.size_value,
          price_per_unit: data.price_per_unit,
          landmark: data.landmark,
          contact: {
            name: data.contact_name,
            mobile: data.contact_mobile,
            whatsapp: data.contact_whatsapp,
            email: data.contact_email,
            preferred_time: data.contact_time,
          },
          extras: {
            gated_community: data.gated_community,
            private_pool: data.private_pool,
            private_garden: data.private_garden,
            open_terrace: data.open_terrace,
            water_source: data.water_source,
            road_access: data.road_access,
            electricity: data.electricity,
            approval_type: data.approval_type,
            corner_plot: data.corner_plot,
            plot_dimensions: data.plot_dimensions,
            num_floors: data.num_floors,
            private_terrace: data.private_terrace,
            top_floor: data.top_floor,
            private_lift: data.private_lift,
            levels_count: data.levels_count,
            internal_staircase: data.internal_staircase,
            common_walls: data.common_walls,
            front_back_yard: data.front_back_yard,
          },
        },
        verification_status: "pending",
        verified: false,
        is_draft: false,
        listed_by: "seller",
        assigned_agent_id: null,
      };
      const { error } = await supabase.from("properties").insert(payload);
      if (error) throw error;

      toast.success("Listing submitted!", {
        description: "Your property is awaiting admin verification.",
      });
      navigate("/dashboard/seller");
    } catch (e: any) {
      toast.error(e.message || "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------- Step Skip Logic ----------------------- */

  // Step indices:
  // 1 Type · 2 Purpose · 3 Location · 4 Size · 5 Price ·
  // 6 AI suggestions · 7 Details (conditional) · 8 Amenities ·
  // 9 Extras (legal/media optional toggle) · 10 Contact

  const isLand = data.type === "Plot" || data.type === "Agricultural Land";

  const next = () => {
    if (step === 5 && !aiTriggered) triggerAI();
    setStep((s) => Math.min(s + 1, 10));
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // Auto-trigger AI when user reaches step 6
  useEffect(() => {
    if (step === 6 && !aiTriggered && data.type && data.city) {
      triggerAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ----------------------- Locality suggestions ----------------------- */

  const localitySuggestions = useMemo(() => {
    // Lightweight suggestions from common Indian areas; AI fills more later
    const base: Record<string, string[]> = {
      Hyderabad: ["Gachibowli", "Madhapur", "Kukatpally", "Banjara Hills", "Jubilee Hills", "Kondapur", "Manikonda", "Miyapur"],
      Bangalore: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Sarjapur", "Hebbal", "JP Nagar", "Marathahalli"],
      Mumbai: ["Andheri", "Bandra", "Powai", "Goregaon", "Thane", "Mulund", "Dadar", "Borivali"],
      Pune: ["Hinjewadi", "Kothrud", "Baner", "Wakad", "Kharadi", "Viman Nagar", "Aundh"],
      Chennai: ["OMR", "Velachery", "T Nagar", "Adyar", "Anna Nagar", "Porur"],
      Delhi: ["Dwarka", "Rohini", "Saket", "Vasant Kunj", "Janakpuri"],
    };
    return base[data.city] || [];
  }, [data.city]);

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Guided Listing
          </div>
          <h1 className="bg-gradient-to-br from-foreground via-primary to-accent bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            Sell Your Property
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A quick conversation. No long forms. Powered by AI.
          </p>
        </motion.div>

        {/* Step labels strip */}
        <div className="mb-6 hidden flex-wrap justify-center gap-1.5 sm:flex">
          {STEP_LABELS.map((l, i) => (
            <span
              key={l}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                step === i + 1
                  ? "bg-primary text-primary-foreground shadow"
                  : step > i + 1
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {l}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1 — TYPE */}
          {step === 1 && (
            <QuestionShell
              key="s1"
              step={1}
              total={10}
              title="What type of property are you selling?"
              subtitle="Pick the closest match — we'll tailor everything else."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PROPERTY_TYPES.map((p) => (
                  <ChipButton
                    key={p.key}
                    active={data.type === p.key}
                    onClick={() => { setData({ ...data, type: p.key }); setTimeout(next, 200); }}
                    icon={p.icon}
                    tag={p.tag}
                  >
                    {p.label}
                  </ChipButton>
                ))}
              </div>
            </QuestionShell>
          )}

          {/* STEP 2 — PURPOSE */}
          {step === 2 && (
            <QuestionShell key="s2" step={2} total={10} title="Are you listing for…" subtitle="Buyers see this filter first.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LISTING_PURPOSES.map((p) => (
                  <ChipButton
                    key={p.key}
                    active={data.purpose === p.key}
                    onClick={() => { setData({ ...data, purpose: p.key as any }); setTimeout(next, 200); }}
                    icon={Tag}
                  >
                    <div>
                      <div>{p.label}</div>
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">{p.desc}</div>
                    </div>
                  </ChipButton>
                ))}
              </div>
            </QuestionShell>
          )}

          {/* STEP 3 — LOCATION */}
          {step === 3 && (
            <QuestionShell key="s3" step={3} total={10} title="Where is the property located?" subtitle="City, area & landmark help buyers find it.">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <MapPin className="h-4 w-4 text-primary" /> City
                  </label>
                  <Input
                    list="city-options"
                    placeholder="Start typing… e.g. Hyderabad"
                    value={data.city}
                    onChange={(e) => setData({ ...data, city: e.target.value })}
                    className="h-12 rounded-xl border-2 bg-background/50 text-base focus-visible:border-primary"
                  />
                  <datalist id="city-options">
                    {INDIAN_CITIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground/80">Area / Locality</label>
                  <Input
                    list="locality-options"
                    placeholder="e.g. Gachibowli, Whitefield"
                    value={data.locality}
                    onChange={(e) => setData({ ...data, locality: e.target.value })}
                    className="h-12 rounded-xl border-2 bg-background/50 text-base focus-visible:border-primary"
                  />
                  <datalist id="locality-options">
                    {localitySuggestions.map((c) => <option key={c} value={c} />)}
                  </datalist>
                  {localitySuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {localitySuggestions.slice(0, 6).map((l) => (
                        <button
                          key={l}
                          onClick={() => setData({ ...data, locality: l })}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground/80">Landmark (optional)</label>
                    <Input
                      placeholder="Near…"
                      value={data.landmark}
                      onChange={(e) => setData({ ...data, landmark: e.target.value })}
                      className="h-11 rounded-xl border-2 bg-background/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground/80">PIN code (optional)</label>
                    <Input
                      placeholder="500032"
                      maxLength={6}
                      value={data.pincode}
                      onChange={(e) => setData({ ...data, pincode: e.target.value.replace(/\D/g, "") })}
                      className="h-11 rounded-xl border-2 bg-background/50"
                    />
                  </div>
                </div>
              </div>
            </QuestionShell>
          )}

          {/* STEP 4 — SIZE */}
          {step === 4 && (
            <QuestionShell key="s4" step={4} total={10} title="What is the property size?" subtitle="Pick a unit, then enter the value. We'll respect your unit — no conversions.">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <Ruler className="h-4 w-4 text-primary" /> Unit
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_UNITS.map((u) => (
                      <button
                        key={u}
                        onClick={() => setData({ ...data, size_unit: u })}
                        className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                          data.size_unit === u
                            ? "border-primary bg-primary text-primary-foreground shadow shadow-primary/30"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground/80">Value (in {data.size_unit})</label>
                  <Input
                    type="number"
                    placeholder={`e.g. ${data.size_unit === "Acre" ? "1.5" : data.size_unit === "Gunta" ? "2" : "150"}`}
                    value={data.size_value}
                    onChange={(e) => setData({ ...data, size_value: e.target.value })}
                    className="h-14 rounded-xl border-2 bg-background/50 text-2xl font-semibold focus-visible:border-primary"
                  />
                </div>
              </div>
            </QuestionShell>
          )}

          {/* STEP 5 — PRICE */}
          {step === 5 && (
            <QuestionShell key="s5" step={5} total={10} title="What's your expected price?" subtitle={`Per ${data.size_unit}. We'll multiply by your size — no unit conversion.`}>
              <div className="space-y-5">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <IndianRupee className="h-4 w-4 text-primary" /> Price per {data.size_unit}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      placeholder={`e.g. ${data.size_unit === "Acre" ? "5000000" : data.size_unit === "Sq Yard" ? "18000" : "200"}`}
                      value={data.price_per_unit}
                      onChange={(e) => setData({ ...data, price_per_unit: e.target.value })}
                      className="h-14 rounded-xl border-2 bg-background/50 pl-10 text-2xl font-semibold focus-visible:border-primary"
                    />
                  </div>
                </div>

                {/* Live calc card */}
                <div className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-5">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{data.size_value || "—"} {data.size_unit} × ₹{data.price_per_unit || "—"}/{data.size_unit}</span>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-primary sm:text-4xl">
                    {formatINR(totalPrice)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Total expected price</div>
                </div>
              </div>
            </QuestionShell>
          )}

          {/* STEP 6 — AI SUGGESTIONS */}
          {step === 6 && (
            <QuestionShell key="s6" step={6} total={10} title="Smart suggestions just for you" subtitle="Tap any title to use it. Edit anything you want.">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Crafting suggestions for {data.locality || data.city}…</p>
                </div>
              )}
              {!aiLoading && ai && (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <Wand2 className="h-4 w-4 text-primary" /> Title suggestions
                    </div>
                    <div className="space-y-2">
                      {ai.titles.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => setData({ ...data, title: t })}
                          className={`group flex w-full items-center justify-between rounded-xl border-2 p-3 text-left text-sm transition-all ${
                            data.title === t
                              ? "border-primary bg-primary/10"
                              : "border-border/50 bg-card/50 hover:border-primary/40"
                          }`}
                        >
                          <span className="font-medium">{t}</span>
                          {data.title === t ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium text-foreground/80">Description (editable)</div>
                    <Textarea
                      value={data.description}
                      onChange={(e) => setData({ ...data, description: e.target.value })}
                      rows={4}
                      className="rounded-xl border-2 bg-background/50 focus-visible:border-primary"
                    />
                  </div>

                  {ai.price_suggestion && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
                      <div className="font-semibold text-accent-foreground">
                        💡 Market estimate: ₹{ai.price_suggestion.price_per_unit.toLocaleString("en-IN")} / {ai.price_suggestion.unit}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{ai.price_suggestion.reasoning}</p>
                    </div>
                  )}
                </div>
              )}
              {!aiLoading && !ai && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No suggestions yet.</p>
                  <Button onClick={triggerAI} variant="outline" className="gap-2">
                    <Wand2 className="h-4 w-4" /> Try AI Suggestions
                  </Button>
                </div>
              )}
            </QuestionShell>
          )}

          {/* STEP 7 — CONDITIONAL DETAILS */}
          {step === 7 && (
            <QuestionShell key="s7" step={7} total={10} title="A few more details" subtitle="Only what's relevant to your property type.">
              <div className="space-y-4">
                {/* Apartment / Penthouse / Duplex */}
                {(data.type === "Apartment" || data.type === "Penthouse" || data.type === "Duplex") && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="BHK" value={data.bhk} onChange={(v) => setData({ ...data, bhk: v })} placeholder="3" />
                      <Field label="Bathrooms" value={data.bathrooms} onChange={(v) => setData({ ...data, bathrooms: v })} placeholder="2" />
                      <Field label="Balconies" value={data.balconies} onChange={(v) => setData({ ...data, balconies: v })} placeholder="2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Floor" value={data.floor_number} onChange={(v) => setData({ ...data, floor_number: v })} placeholder="5" />
                      <Field label="Total floors" value={data.total_floors} onChange={(v) => setData({ ...data, total_floors: v })} placeholder="12" />
                    </div>
                    <ChipRow label="Furnishing" options={FURNISHING} value={data.furnishing} onChange={(v) => setData({ ...data, furnishing: v })} />
                    {data.type === "Penthouse" && (
                      <BoolRow
                        items={[
                          { k: "private_terrace", label: "Private Terrace" },
                          { k: "top_floor", label: "Top Floor" },
                          { k: "private_lift", label: "Private Lift" },
                        ]}
                        data={data} setData={setData}
                      />
                    )}
                    {data.type === "Duplex" && (
                      <>
                        <Field label="Levels" value={data.levels_count} onChange={(v) => setData({ ...data, levels_count: v })} placeholder="2" />
                        <BoolRow items={[{ k: "internal_staircase", label: "Internal Staircase" }]} data={data} setData={setData} />
                      </>
                    )}
                  </>
                )}

                {data.type === "Villa" && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="BHK" value={data.bhk} onChange={(v) => setData({ ...data, bhk: v })} placeholder="4" />
                      <Field label="Bathrooms" value={data.bathrooms} onChange={(v) => setData({ ...data, bathrooms: v })} placeholder="4" />
                      <Field label="Floors" value={data.num_floors} onChange={(v) => setData({ ...data, num_floors: v })} placeholder="2" />
                    </div>
                    <BoolRow
                      items={[
                        { k: "gated_community", label: "Gated Community" },
                        { k: "private_garden", label: "Private Garden" },
                        { k: "private_pool", label: "Private Pool" },
                      ]}
                      data={data} setData={setData}
                    />
                  </>
                )}

                {data.type === "Independent House" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Plot dimensions" value={data.plot_dimensions} onChange={(v) => setData({ ...data, plot_dimensions: v })} placeholder="30 x 40" />
                      <Field label="Floors" value={data.num_floors} onChange={(v) => setData({ ...data, num_floors: v })} placeholder="2" />
                    </div>
                    <BoolRow items={[{ k: "open_terrace", label: "Open Terrace" }]} data={data} setData={setData} />
                    <ChipRow label="Water Source" options={WATER_SOURCES} value={data.water_source} onChange={(v) => setData({ ...data, water_source: v })} />
                  </>
                )}

                {data.type === "Plot" && (
                  <>
                    <Field label="Plot dimensions" value={data.plot_dimensions} onChange={(v) => setData({ ...data, plot_dimensions: v })} placeholder="40 x 60" />
                    <BoolRow items={[{ k: "corner_plot", label: "Corner Plot" }]} data={data} setData={setData} />
                    <ChipRow label="Approval" options={APPROVAL_TYPES} value={data.approval_type} onChange={(v) => setData({ ...data, approval_type: v })} />
                  </>
                )}

                {data.type === "Agricultural Land" && (
                  <>
                    <ChipRow label="Water Source" options={WATER_SOURCES} value={data.water_source} onChange={(v) => setData({ ...data, water_source: v })} />
                    <ChipRow label="Road Access" options={ROAD_ACCESS_OPTS} value={data.road_access} onChange={(v) => setData({ ...data, road_access: v })} />
                    <ChipRow label="Electricity" options={["Available", "Not Available", "On Request"]} value={data.electricity} onChange={(v) => setData({ ...data, electricity: v })} />
                  </>
                )}

                {data.type === "Row House" && (
                  <>
                    <Field label="Common walls" value={data.common_walls} onChange={(v) => setData({ ...data, common_walls: v })} placeholder="1 or 2" />
                    <BoolRow items={[{ k: "front_back_yard", label: "Front & Back Yard" }]} data={data} setData={setData} />
                  </>
                )}

                <p className="text-xs text-muted-foreground">All fields here are optional — skip what you don't know.</p>
              </div>
            </QuestionShell>
          )}

          {/* STEP 8 — AMENITIES */}
          {step === 8 && (
            <QuestionShell key="s8" step={8} total={10} title="What amenities does it have?" subtitle="Tap to toggle. Only relevant ones for your property type.">
              <div className="flex flex-wrap gap-2">
                {(AMENITIES_BY_TYPE[data.type as PropertyTypeKey] || []).map((a) => {
                  const active = data.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() =>
                        setData({
                          ...data,
                          amenities: active
                            ? data.amenities.filter((x) => x !== a)
                            : [...data.amenities, a],
                        })
                      }
                      className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow shadow-primary/30"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {active && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                      {a}
                    </button>
                  );
                })}
              </div>
              {data.amenities.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">Optional — you can skip and submit without amenities.</p>
              )}
            </QuestionShell>
          )}

          {/* STEP 9 — EXTRAS (optional) */}
          {step === 9 && (
            <QuestionShell key="s9" step={9} total={10} title="Anything else to highlight?" subtitle="All optional. Skip to go straight to contact.">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground/80">Approval type (if known)</label>
                  <ChipRow label="" options={APPROVAL_TYPES} value={data.approval_type} onChange={(v) => setData({ ...data, approval_type: v })} />
                </div>
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  📷 Photo & document upload available after submission from your dashboard.
                </div>
              </div>
            </QuestionShell>
          )}

          {/* STEP 10 — CONTACT */}
          {step === 10 && (
            <QuestionShell key="s10" step={10} total={10} title="How should buyers reach you?" subtitle="Required to publish your listing.">
              <div className="space-y-4">
                <Field label="Full name *" value={data.contact_name} onChange={(v) => setData({ ...data, contact_name: v })} placeholder="Your name" />
                <Field
                  label="Mobile number *" value={data.contact_mobile} placeholder="10 digit number"
                  onChange={(v) => setData({ ...data, contact_mobile: v.replace(/\D/g, "").slice(0, 10) })}
                />
                <Field label="WhatsApp (optional)" value={data.contact_whatsapp} placeholder="If different from mobile"
                  onChange={(v) => setData({ ...data, contact_whatsapp: v.replace(/\D/g, "").slice(0, 10) })} />
                <Field label="Email" value={data.contact_email} placeholder="you@example.com"
                  onChange={(v) => setData({ ...data, contact_email: v })} />
                <ChipRow
                  label="Preferred contact time"
                  options={["Anytime", "Morning", "Afternoon", "Evening"]}
                  value={data.contact_time}
                  onChange={(v) => setData({ ...data, contact_time: v })}
                />

                {/* Summary */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 p-4 text-sm">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Listing Preview</div>
                  <div className="font-bold">{data.title || `${data.type} in ${data.locality || data.city}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.purpose} · {data.size_value} {data.size_unit} · {formatINR(totalPrice)}
                  </div>
                </div>
              </div>
            </QuestionShell>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 1}
            className="gap-1 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {step < 10 && (
              <Button
                variant="outline"
                onClick={next}
                className="rounded-full"
              >
                {step === 7 || step === 8 || step === 9 ? "Skip" : "Next"} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 10 && (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="rounded-full bg-gradient-to-r from-primary to-accent px-6 text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90"
              >
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Publish Listing</>}
              </Button>
            )}
          </div>
        </div>

        {!canSubmit && step === 10 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Complete: Type, Purpose, Location, Size, Price, Name & 10-digit Mobile.
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SMALL FIELD HELPERS
   ============================================================ */

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground/80">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-2 bg-background/50 focus-visible:border-primary"
      />
    </div>
  );
}

function ChipRow({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <label className="mb-2 block text-sm font-medium text-foreground/80">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-full border-2 px-3.5 py-1.5 text-sm transition-all ${
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function BoolRow({
  items, data, setData,
}: { items: { k: keyof Listing; label: string }[]; data: Listing; setData: (d: Listing) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = !!data[it.k];
        return (
          <button
            key={String(it.k)}
            onClick={() => setData({ ...data, [it.k]: !active } as Listing)}
            className={`rounded-full border-2 px-3.5 py-1.5 text-sm transition-all ${
              active
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card hover:border-primary/40 text-foreground/80"
            }`}
          >
            {active && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
