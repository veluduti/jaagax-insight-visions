/**
 * Sell Your Property — Excel-spec based Dynamic Property Listing Form.
 *
 * Implementation strictly follows the client Excel requirement:
 *   - Step-by-step structured form (NOT a chat flow)
 *   - Dynamic show/hide rules based on selected values
 *   - AI assists only with Titles & Descriptions (never changes the structure)
 *   - Multiple size variations create separate listings on submit
 *
 * Categories: only "Residential" is fully implemented for now; the others
 * render a friendly "coming soon" placeholder per spec.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles, ChevronLeft, ChevronRight, Loader2, Wand2,
  CheckCircle2, Plus, X, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   Excel Spec Constants
   ============================================================ */

const PROPERTY_CATEGORIES = [
  { id: "Residential", label: "Residential", enabled: true },
  { id: "Plots / Land", label: "Plots / Land", enabled: false },
  { id: "Commercial", label: "Commercial", enabled: false },
  { id: "Agricultural Lands", label: "Agricultural Lands", enabled: false },
  { id: "Co-working / Shared Spaces", label: "Co-working / Shared Spaces", enabled: false },
];

const RESIDENTIAL_TYPES = [
  "Apartment / Flat",
  "Independent House",
  "Villa",
  "Duplex / Triplex",
  "Penthouse",
  "Row House / Townhouse",
  "Farm House",
  "Studio Apartment",
  "Serviced Apartment",
  "Builder Floor Apartment",
  "Gated Community House",
] as const;

const LISTED_BY = ["Owner", "Agent", "Builder"] as const;
const LISTING_TYPES = ["Buy", "Rent"] as const;
const PROPERTY_CONDITIONS = ["New", "Resale"] as const;
const PROPERTY_AGES = ["0–1 Years", "1–5 Years", "5–10 Years", "10+ Years"] as const;
const AVAILABILITY_STATUSES = ["Ready to Move", "Under Construction"] as const;
const BHK_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"] as const;
const FURNISHING = ["Unfurnished", "Semi Furnished", "Fully Furnished"] as const;
const FURNISHED_DETAILS = ["AC", "Wardrobes", "Modular Kitchen", "Geysers", "Beds", "Sofa", "Dining Table", "TV"] as const;
const FACINGS = ["East", "West", "North", "South", "North East", "North West", "South East", "South West"] as const;
const AMENITIES = ["Lift", "Parking", "Swimming Pool", "Gym", "Security", "Club House", "Power Backup", "Children Play Area", "Garden"] as const;
const PAYMENT_OPTIONS = [
  "Price Negotiable", "Bank Loan Available", "EMI Available", "Installments Available",
  "Flexible Payment Plan", "Construction Linked Payment", "Possession Linked Payment",
  "Zero Down Payment", "Low Booking Amount", "Assured Rental Returns", "Investor Friendly",
  "NRI Assistance", "Pre-EMI Support", "Premium Bank Tie-Ups", "Custom Payment Plans",
  "Immediate Registration",
] as const;
const APPROVAL_TYPES = [
  "RERA Approved", "HMDA Approved", "DTCP Approved", "CRDA Approved",
  "Municipal Approved", "Panchayat Approved", "LP Number Available", "Approved Layout",
] as const;

const FLAT_SIZE_TYPES = new Set([
  "Apartment / Flat", "Penthouse", "Studio Apartment",
  "Builder Floor Apartment", "Serviced Apartment",
]);
const LAND_SIZE_TYPES = new Set([
  "Independent House", "Villa", "Duplex / Triplex", "Farm House", "Row House / Townhouse",
]);

const FLAT_UNITS = ["Sq Ft"] as const;
const LAND_UNITS = ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"] as const;

/* ============================================================
   Types
   ============================================================ */

type SizeVariant = { size: string; unit: string; price_per_unit: string; price: string };

type FormState = {
  category: string;
  property_type: string;
  listed_by: string;
  listing_type: string; // Buy | Rent
  property_condition: string;
  property_age: string;
  availability_status: string;
  possession_date: string;
  available_from: string;

  // Sizes
  flat_size: string;
  land_size: string;
  size_unit: string;
  built_area: string;
  size_variants: SizeVariant[];

  // Pricing
  total_price: string;
  price_per_unit: string;
  monthly_rent: string;

  // Property meta
  bhk: string;
  project_name: string;
  gated_community: string; // Yes | No
  total_towers: string;
  total_floors_per_tower: string;
  total_units: string;
  total_land_area: string;

  furnishing: string;
  furnished_details: string[];
  facing: string | string[];
  amenities: string[];
  payment_options: string[];
  approval_types: string[];

  // Location
  country: string;
  state: string;
  city: string;
  locality: string;

  // AI generated
  title: string;
  short_description: string;
  full_description: string;
};

const INITIAL: FormState = {
  category: "",
  property_type: "",
  listed_by: "",
  listing_type: "",
  property_condition: "",
  property_age: "",
  availability_status: "",
  possession_date: "",
  available_from: "",
  flat_size: "",
  land_size: "",
  size_unit: "Sq Ft",
  built_area: "",
  size_variants: [],
  total_price: "",
  price_per_unit: "",
  monthly_rent: "",
  bhk: "",
  project_name: "",
  gated_community: "",
  total_towers: "",
  total_floors_per_tower: "",
  total_units: "",
  total_land_area: "",
  furnishing: "",
  furnished_details: [],
  facing: "",
  amenities: [],
  payment_options: [],
  approval_types: [],
  country: "India",
  state: "",
  city: "",
  locality: "",
  title: "",
  short_description: "",
  full_description: "",
};

/* ============================================================
   UI helpers
   ============================================================ */

function ChipGroup<T extends string>({
  options, value, onChange, multi = false,
}: {
  options: readonly T[];
  value: T | T[] | "";
  onChange: (v: any) => void;
  multi?: boolean;
}) {
  const isSelected = (o: T) =>
    multi ? Array.isArray(value) && value.includes(o) : value === o;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => {
            if (multi) {
              const arr = Array.isArray(value) ? [...value] : [];
              const i = arr.indexOf(o);
              if (i >= 0) arr.splice(i, 1); else arr.push(o);
              onChange(arr);
            } else {
              onChange(o);
            }
          }}
          className={cn(
            "px-3 py-1.5 rounded-full border text-sm transition-all",
            isSelected(o)
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background border-border hover:border-primary/50 hover:bg-muted",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ============================================================
   Component
   ============================================================ */

const STEPS = [
  "Category",
  "Property Details",
  "Pricing & Size",
  "Project & Furnishing",
  "Amenities & Approvals",
  "Location",
  "AI Title & Description",
  "Review & Submit",
] as const;

export default function SellProperty() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [aiTitles, setAiTitles] = useState<{ type: string; label: string; title: string }[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [descLoading, setDescLoading] = useState(false);

  /* ----- Pre-fill user from auth ----- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to list a property");
        navigate("/auth");
      }
    })();
  }, [navigate]);

  /* ----- Auto-save draft to localStorage ----- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sell_property_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((f) => ({ ...f, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("sell_property_draft", JSON.stringify(form)); }
    catch { /* ignore */ }
  }, [form]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ----- Derived UI flags from Excel rules ----- */
  const isBuy = form.listing_type === "Buy";
  const isRent = form.listing_type === "Rent";
  const isResale = form.property_condition === "Resale";
  const showFurnishedDetails = form.furnishing === "Semi Furnished" || form.furnishing === "Fully Furnished";
  const isFlatType = FLAT_SIZE_TYPES.has(form.property_type);
  const isLandType = LAND_SIZE_TYPES.has(form.property_type);
  const sizeUnits = isLandType ? LAND_UNITS : FLAT_UNITS;

  /* ----- When property type changes, reset incompatible size fields ----- */
  useEffect(() => {
    if (isFlatType) {
      setForm((f) => ({ ...f, land_size: "", size_unit: "Sq Ft" }));
    } else if (isLandType) {
      setForm((f) => ({ ...f, flat_size: "" }));
    } else {
      setForm((f) => ({ ...f, land_size: "", flat_size: "" }));
    }
  }, [form.property_type]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Reset dependent fields on Listing Type change ----- */
  useEffect(() => {
    if (isBuy) {
      setForm((f) => ({ ...f, monthly_rent: "", available_from: "" }));
    } else if (isRent) {
      setForm((f) => ({ ...f, total_price: "", price_per_unit: "" }));
    }
  }, [form.listing_type]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Auto-calculate Total Price = Size × Price Per Unit ----- */
  const priceUnitLabel = isLandType ? form.size_unit : "Sq Ft";
  useEffect(() => {
    if (!isBuy) return;
    const size = parseFloat(isLandType ? form.land_size : form.flat_size);
    const ppu = parseFloat(form.price_per_unit);
    if (!isNaN(size) && !isNaN(ppu) && size > 0 && ppu > 0) {
      const total = Math.round(size * ppu);
      setForm((f) => (f.total_price === String(total) ? f : { ...f, total_price: String(total) }));
    }
  }, [form.land_size, form.flat_size, form.price_per_unit, form.size_unit, isBuy, isLandType]);

  /* ----- Indian currency formatter ----- */
  const formatINR = (val: string | number) => {
    const n = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(n) || n <= 0) return "";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  };

  /* ----- Reset property_age when condition is New ----- */
  useEffect(() => {
    if (form.property_condition === "New") update("property_age", "");
  }, [form.property_condition]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Reset furnished_details when Unfurnished ----- */
  useEffect(() => {
    if (form.furnishing === "Unfurnished") update("furnished_details", []);
  }, [form.furnishing]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ============================================================
     AI helpers (titles + descriptions) — assist only, never change flow
     ============================================================ */

  const aiState = useMemo(() => ({
    property_type: form.property_type,
    bhk: form.bhk?.replace(/\D/g, "") || "",
    locality: form.locality,
    city: form.city,
    furnishing: form.furnishing,
    facing: form.facing,
    amenities: form.amenities,
    price: form.total_price || form.monthly_rent,
    listing_type: form.listing_type === "Rent" ? "rent" : "sale",
    project_name: form.project_name,
    gated_community: form.gated_community === "Yes",
    flat_size: form.flat_size,
    land_size: form.land_size,
    size_unit: form.size_unit,
    built_area: form.built_area,
    payment_options: form.payment_options,
    approval_types: form.approval_types,
  }), [form]);

  const generateTitles = async () => {
    setTitlesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        titles: { type: string; label: string; title: string }[];
      }>("ai-generate-titles", { body: { state: aiState } });
      if (error) throw error;
      const t = data?.titles || [];
      setAiTitles(t);
      if (t.length > 0 && !form.title) update("title", t[0].title);
    } catch (e: any) {
      toast.error("Could not generate AI titles");
    } finally {
      setTitlesLoading(false);
    }
  };

  const generateDescriptions = async () => {
    setDescLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        short: string; full: string;
      }>("ai-generate-descriptions", { body: { state: aiState } });
      if (error) throw error;
      if (data?.short) update("short_description", data.short);
      if (data?.full) update("full_description", data.full);
    } catch {
      toast.error("Could not generate descriptions");
    } finally {
      setDescLoading(false);
    }
  };

  /* ============================================================
     Validation per step
     ============================================================ */

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.category) return "Please select a Property Category";
      if (form.category !== "Residential") return "This category is coming soon — please pick Residential for now";
    }
    if (s === 1) {
      if (!form.property_type) return "Please select a Property Type";
      if (!form.listed_by) return "Please select Listed By";
      if (!form.listing_type) return "Please select Listing Type";
      if (!form.property_condition) return "Please select Property Condition";
      if (isResale && !form.property_age) return "Please select Property Age";
      if (!form.availability_status) return "Please select Availability Status";
      if (!form.possession_date) return "Please select Possession Date";
      if (isRent && !form.available_from) return "Please select Available From Date";
    }
    if (s === 2) {
      if (isFlatType && !form.flat_size) return "Please enter Flat Size";
      if (isLandType && !form.land_size) return "Please enter Land Size";
      if (!form.built_area) return "Please enter Built Area (Sq Ft)";
      if (isBuy && !form.total_price) return "Please enter Total Price";
      if (isRent && !form.monthly_rent) return "Please enter Monthly Rent";
    }
    if (s === 3) {
      if (!form.bhk) return "Please select BHK Type";
      if (!form.furnishing) return "Please select Furnishing Status";
    }
    if (s === 5) {
      if (!form.city) return "Please enter City";
      if (!form.locality) return "Please enter Area / Locality";
    }
    if (s === 7) {
      if (!form.title) return "Please choose or write a Title";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step === 5 && aiTitles.length === 0) {
      // Pre-generate AI titles + descriptions as user reaches AI step
      generateTitles();
      generateDescriptions();
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  /* ============================================================
     Submit — creates 1 listing OR multiple (one per size variant)
     ============================================================ */

  const buildPropertyRow = (sizeOverride?: SizeVariant) => {
    const { data: _ } = { data: null };
    const size = sizeOverride?.size || form.flat_size || form.land_size || form.built_area;
    const unit = sizeOverride?.unit || form.size_unit;
    const price = sizeOverride?.price || form.total_price || form.monthly_rent || "0";
    const bhkNum = parseInt(form.bhk) || null;

    // Convert size to sq ft if possible (simple conversion for known units)
    const conv: Record<string, number> = {
      "Sq Ft": 1, "Sq Yard": 9, "Cent": 435.6, "Gunta": 1089, "Acre": 43560, "Bigha": 27000,
    };
    const sizeNum = parseFloat(String(size)) || 0;
    const areaSqft = sizeNum * (conv[unit] || 1);

    return {
      title: form.title,
      description: form.full_description || form.short_description || null,
      city: form.city,
      locality: form.locality,
      address: [form.locality, form.city, form.state, form.country].filter(Boolean).join(", "),
      price: Number(price) || 0,
      area_sqft: areaSqft || null,
      building_area_sqft: parseFloat(form.built_area) || null,
      type: form.property_type,
      bhk: bhkNum,
      bedrooms: bhkNum,
      listing_type: form.listing_type === "Rent" ? "rent" : "sale",
      furnishing: form.furnishing || null,
      property_age: form.property_age || null,
      completion_stage: form.availability_status || "Ready",
      facing: undefined, // not a column — kept in metadata via amenities? skip
      amenities: form.amenities,
      price_negotiable: form.payment_options.includes("Price Negotiable"),
      building_name: form.project_name || null,
      total_floors: parseInt(form.total_floors_per_tower) || null,
      listed_by: (form.listed_by || "seller").toLowerCase(),
      verification_status: "pending",
      is_draft: false,
      is_live: false,
      listing_status: "complete",
      // Keep everything else in original_snapshot so nothing is lost
      original_snapshot: {
        ...form,
        size_variant_applied: sizeOverride || null,
      },
    } as any;
  };

  const submit = async () => {
    const err = validateStep(7);
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }

      // Variants: primary listing + each additional variant
      const variants: (SizeVariant | undefined)[] = [undefined, ...form.size_variants];
      let inserted = 0;
      for (const v of variants) {
        const row = buildPropertyRow(v);
        // Re-generate title per variant when sizes differ
        if (v && v.size) {
          row.title = `${form.title} — ${v.size} ${v.unit}`;
        }
        row.submitted_by = user.id;
        // strip undefined keys
        Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
        const { error: insErr } = await (supabase as any).from("properties").insert(row);
        if (insErr) {
          console.error(insErr);
          toast.error(`Failed: ${insErr.message}`);
          continue;
        }
        inserted++;
      }
      if (inserted > 0) {
        toast.success(
          inserted === 1
            ? "Property listed successfully! Pending verification."
            : `${inserted} listings created (one per size variant).`,
        );
        try { localStorage.removeItem("sell_property_draft"); } catch { /* ignore */ }
        navigate("/dashboard/seller");
      }
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ============================================================
     Render
     ============================================================ */

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Sell Your Property
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-5 md:p-6 space-y-6">

                {/* ============ STEP 0: Category ============ */}
                {step === 0 && (
                  <>
                    <Field label="Property Category" required>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PROPERTY_CATEGORIES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => c.enabled && update("category", c.id)}
                            disabled={!c.enabled}
                            className={cn(
                              "p-3 rounded-lg border text-left transition-all",
                              form.category === c.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:border-primary/50",
                              !c.enabled && "opacity-50 cursor-not-allowed",
                            )}
                          >
                            <div className="font-medium">{c.label}</div>
                            {!c.enabled && (
                              <div className="text-xs mt-0.5 opacity-75">Coming soon</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )}

                {/* ============ STEP 1: Property Details ============ */}
                {step === 1 && (
                  <>
                    <Field label="Property Type" required>
                      <ChipGroup
                        options={RESIDENTIAL_TYPES}
                        value={form.property_type as any}
                        onChange={(v) => update("property_type", v)}
                      />
                    </Field>
                    <Field label="Listed By" required>
                      <ChipGroup options={LISTED_BY} value={form.listed_by as any}
                        onChange={(v) => update("listed_by", v)} />
                    </Field>
                    <Field label="Listing Type" required hint="Choose Buy to sell the property, or Rent to lease it out">
                      <ChipGroup options={LISTING_TYPES} value={form.listing_type as any}
                        onChange={(v) => update("listing_type", v)} />
                    </Field>

                    {/* Dynamic note for Listing Type */}
                    <AnimatePresence mode="wait">
                      {isRent && (
                        <motion.div
                          key="rent-availfrom"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Field label="Available From Date" required hint="Date the property becomes available for tenants">
                            <Input type="date" value={form.available_from}
                              onChange={(e) => update("available_from", e.target.value)} />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field label="Property Condition" required>
                      <ChipGroup options={PROPERTY_CONDITIONS} value={form.property_condition as any}
                        onChange={(v) => update("property_condition", v)} />
                    </Field>

                    {/* Dynamic Property Age — only when Resale */}
                    <AnimatePresence mode="wait">
                      {isResale && (
                        <motion.div
                          key="resale-age"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Field label="Property Age" required>
                            <ChipGroup options={PROPERTY_AGES} value={form.property_age as any}
                              onChange={(v) => update("property_age", v)} />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field label="Availability Status" required>
                      <ChipGroup options={AVAILABILITY_STATUSES} value={form.availability_status as any}
                        onChange={(v) => update("availability_status", v)} />
                    </Field>
                    <Field label="Possession Date" required>
                      <Input type="date" value={form.possession_date}
                        onChange={(e) => update("possession_date", e.target.value)} />
                    </Field>
                  </>
                )}

                {/* ============ STEP 2: Pricing & Size ============ */}
                {step === 2 && (
                  <>
                    {isFlatType && (
                      <>
                        <Field label="Flat Size" required hint="Built area in Sq Ft">
                          <div className="flex gap-2">
                            <Input type="number" placeholder="e.g. 1200" value={form.flat_size}
                              onChange={(e) => update("flat_size", e.target.value)} />
                            <div className="px-3 py-2 rounded-md border bg-muted text-sm self-stretch flex items-center">Sq Ft</div>
                          </div>
                        </Field>
                      </>
                    )}
                    {isLandType && (
                      <Field label="Land Size" required>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="e.g. 200" value={form.land_size}
                            onChange={(e) => update("land_size", e.target.value)} />
                          <select
                            value={form.size_unit}
                            onChange={(e) => update("size_unit", e.target.value)}
                            className="px-3 py-2 rounded-md border bg-background text-sm"
                          >
                            {sizeUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </Field>
                    )}
                    {(isFlatType || isLandType) && (
                      <Field label="Built Area (Sq Ft)" required>
                        <Input type="number" placeholder="e.g. 1200" value={form.built_area}
                          onChange={(e) => update("built_area", e.target.value)} />
                      </Field>
                    )}

                    {/* Dynamic Buy fields */}
                    <AnimatePresence mode="wait">
                      {isBuy && (
                        <motion.div
                          key="buy-pricing"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-4"
                        >
                          <Field
                            label={`Price Per ${priceUnitLabel} (₹)`}
                            required
                            hint="Enter price per selected land unit"
                          >
                            <Input
                              type="number"
                              placeholder="e.g. 5000"
                              value={form.price_per_unit}
                              onChange={(e) => update("price_per_unit", e.target.value)}
                            />
                          </Field>
                          <Field label="Total Price (₹)" required hint="Auto-calculated from size × price per unit (editable)">
                            <Input
                              type="number"
                              placeholder="e.g. 5000000"
                              value={form.total_price}
                              onChange={(e) => update("total_price", e.target.value)}
                            />
                            {form.total_price && (
                              <div className="mt-1 text-sm text-primary font-medium">
                                {formatINR(form.total_price)}
                              </div>
                            )}
                          </Field>
                        </motion.div>
                      )}
                      {isRent && (
                        <motion.div
                          key="rent-pricing"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Field label="Monthly Rent (₹)" required>
                            <Input type="number" placeholder="e.g. 25000" value={form.monthly_rent}
                              onChange={(e) => update("monthly_rent", e.target.value)} />
                            {form.monthly_rent && (
                              <div className="mt-1 text-sm text-primary font-medium">
                                {formatINR(form.monthly_rent)} / month
                              </div>
                            )}
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Multiple Size Variants */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium">Multiple size variants?</p>
                          <p className="text-xs text-muted-foreground">
                            Add variants like 1500 SqFt, 1800 SqFt — each will be saved as a separate
                            listing with its own pricing, AI title and description.
                          </p>
                        </div>
                      </div>
                      {form.size_variants.map((v, i) => {
                        const vSize = parseFloat(v.size) || 0;
                        const vPpu = parseFloat(v.price_per_unit) || 0;
                        const vTotal = vSize > 0 && vPpu > 0 ? vSize * vPpu : 0;
                        return (
                          <div key={i} className="rounded-md border bg-background p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground">
                                Variant {i + 1}
                              </p>
                              <Button variant="ghost" size="icon" onClick={() => {
                                const arr = [...form.size_variants];
                                arr.splice(i, 1);
                                update("size_variants", arr);
                              }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input type="number" placeholder="Size" value={v.size}
                                onChange={(e) => {
                                  const arr = [...form.size_variants];
                                  const size = e.target.value;
                                  const ppu = arr[i].price_per_unit;
                                  const total = (parseFloat(size) || 0) * (parseFloat(ppu) || 0);
                                  arr[i] = { ...arr[i], size, price: total ? String(total) : "" };
                                  update("size_variants", arr);
                                }} />
                              <select
                                value={v.unit}
                                onChange={(e) => {
                                  const arr = [...form.size_variants];
                                  arr[i] = { ...arr[i], unit: e.target.value };
                                  update("size_variants", arr);
                                }}
                                className="px-3 py-2 rounded-md border bg-background text-sm"
                              >
                                {sizeUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Price Per {v.unit} (₹)</Label>
                              <Input type="number" placeholder={`Price per ${v.unit}`}
                                value={v.price_per_unit}
                                onChange={(e) => {
                                  const arr = [...form.size_variants];
                                  const ppu = e.target.value;
                                  const total = (parseFloat(arr[i].size) || 0) * (parseFloat(ppu) || 0);
                                  arr[i] = { ...arr[i], price_per_unit: ppu, price: total ? String(total) : "" };
                                  update("size_variants", arr);
                                }} />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Price: <span className="font-semibold text-foreground">
                                {vTotal > 0 ? formatINR(vTotal) : "—"}
                              </span>
                              <span className="ml-1">(auto-calculated)</span>
                            </div>
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => update("size_variants", [
                          ...form.size_variants,
                          { size: "", unit: form.size_unit, price_per_unit: "", price: "" },
                        ])}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Size Variant
                      </Button>
                    </div>
                  </>
                )}

                {/* ============ STEP 3: Project & Furnishing ============ */}
                {step === 3 && (
                  <>
                    <Field label="BHK Type" required>
                      <ChipGroup options={BHK_TYPES} value={form.bhk as any}
                        onChange={(v) => update("bhk", v)} />
                    </Field>

                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="text-sm font-semibold">Project / Community Details</p>
                      <Field label="Community / Project Name">
                        <Input value={form.project_name} onChange={(e) => update("project_name", e.target.value)}
                          placeholder="e.g. Prestige Lakeside Habitat" />
                      </Field>
                      <Field label="Gated Community">
                        <ChipGroup options={["Yes", "No"] as const} value={form.gated_community as any}
                          onChange={(v) => update("gated_community", v)} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Total Towers">
                          <Input type="number" value={form.total_towers}
                            onChange={(e) => update("total_towers", e.target.value)} />
                        </Field>
                        <Field label="Floors per Tower">
                          <Input type="number" value={form.total_floors_per_tower}
                            onChange={(e) => update("total_floors_per_tower", e.target.value)} />
                        </Field>
                        <Field label="Total Units">
                          <Input type="number" value={form.total_units}
                            onChange={(e) => update("total_units", e.target.value)} />
                        </Field>
                        <Field label="Total Land Area (Acres)">
                          <Input type="number" value={form.total_land_area}
                            onChange={(e) => update("total_land_area", e.target.value)} />
                        </Field>
                      </div>
                    </div>

                    <Field label="Furnishing Status" required>
                      <ChipGroup options={FURNISHING} value={form.furnishing as any}
                        onChange={(v) => update("furnishing", v)} />
                    </Field>
                    {showFurnishedDetails && (
                      <Field label="Furnished Details" hint="Select all that apply">
                        <ChipGroup options={FURNISHED_DETAILS} value={form.furnished_details}
                          onChange={(v) => update("furnished_details", v)} multi />
                      </Field>
                    )}

                    <Field label="Facing">
                      <ChipGroup options={FACINGS} value={form.facing as any}
                        onChange={(v) => update("facing", v)} />
                    </Field>
                  </>
                )}

                {/* ============ STEP 4: Amenities & Approvals ============ */}
                {step === 4 && (
                  <>
                    <Field label="Amenities" hint="Select all that apply">
                      <ChipGroup options={AMENITIES} value={form.amenities}
                        onChange={(v) => update("amenities", v)} multi />
                    </Field>
                    <Field label="Payment Options" hint="Select all that apply">
                      <ChipGroup options={PAYMENT_OPTIONS} value={form.payment_options}
                        onChange={(v) => update("payment_options", v)} multi />
                    </Field>
                    <Field label="Approval Types" hint="Select all that apply">
                      <ChipGroup options={APPROVAL_TYPES} value={form.approval_types}
                        onChange={(v) => update("approval_types", v)} multi />
                    </Field>
                  </>
                )}

                {/* ============ STEP 5: Location ============ */}
                {step === 5 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Country" required>
                        <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
                      </Field>
                      <Field label="State">
                        <Input value={form.state} onChange={(e) => update("state", e.target.value)}
                          placeholder="e.g. Telangana" />
                      </Field>
                      <Field label="City" required>
                        <Input value={form.city} onChange={(e) => update("city", e.target.value)}
                          placeholder="e.g. Hyderabad" />
                      </Field>
                      <Field label="Area / Locality" required>
                        <Input value={form.locality} onChange={(e) => update("locality", e.target.value)}
                          placeholder="e.g. Gachibowli" />
                      </Field>
                    </div>
                  </>
                )}

                {/* ============ STEP 6: AI Title & Description ============ */}
                {step === 6 && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-primary" /> AI Suggestions
                      </p>
                      <Button variant="outline" size="sm"
                        onClick={() => { generateTitles(); generateDescriptions(); }}
                        disabled={titlesLoading || descLoading}>
                        {(titlesLoading || descLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                        Regenerate
                      </Button>
                    </div>

                    <Field label="Title" required hint="Pick an AI suggestion or write your own">
                      <div className="space-y-2">
                        {titlesLoading && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Generating titles…
                          </div>
                        )}
                        {aiTitles.map((t, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => update("title", t.title)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-all",
                              form.title === t.title
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50",
                            )}
                          >
                            <div className="text-xs text-muted-foreground mb-1">{t.label}</div>
                            <div className="text-sm font-medium">{t.title}</div>
                          </button>
                        ))}
                        <Input value={form.title} onChange={(e) => update("title", e.target.value)}
                          placeholder="Or write your own title" />
                      </div>
                    </Field>

                    <Field label="Short Description">
                      <Textarea rows={2} value={form.short_description}
                        onChange={(e) => update("short_description", e.target.value)}
                        placeholder={descLoading ? "Generating…" : "One-line summary"} />
                    </Field>
                    <Field label="Full Description">
                      <Textarea rows={6} value={form.full_description}
                        onChange={(e) => update("full_description", e.target.value)}
                        placeholder={descLoading ? "Generating…" : "Detailed description of your property"} />
                    </Field>
                  </>
                )}

                {/* ============ STEP 7: Review & Submit ============ */}
                {step === 7 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Review your listing details before submitting.</p>
                    <div className="rounded-lg border divide-y">
                      {[
                        ["Category", form.category],
                        ["Property Type", form.property_type],
                        ["Listed By", form.listed_by],
                        ["Listing Type", form.listing_type],
                        ["Condition", form.property_condition + (form.property_age ? ` · ${form.property_age}` : "")],
                        ["Availability", form.availability_status],
                        ["Possession Date", form.possession_date],
                        ...(isRent ? [["Available From", form.available_from] as const] : []),
                        ["Size", isFlatType
                          ? `${form.flat_size} Sq Ft`
                          : isLandType ? `${form.land_size} ${form.size_unit}` : "—"],
                        ["Built Area", `${form.built_area} Sq Ft`],
                        ...(isBuy ? [["Total Price", `₹${form.total_price}`] as const] : []),
                        ...(isRent ? [["Monthly Rent", `₹${form.monthly_rent}`] as const] : []),
                        ["BHK", form.bhk],
                        ["Project", form.project_name || "—"],
                        ["Gated Community", form.gated_community || "—"],
                        ["Furnishing", form.furnishing + (form.furnished_details.length ? ` (${form.furnished_details.join(", ")})` : "")],
                        ["Facing", form.facing || "—"],
                        ["Amenities", form.amenities.join(", ") || "—"],
                        ["Payment Options", form.payment_options.join(", ") || "—"],
                        ["Approvals", form.approval_types.join(", ") || "—"],
                        ["Location", [form.locality, form.city, form.state, form.country].filter(Boolean).join(", ")],
                        ["Title", form.title],
                      ].map(([k, v]) => (
                        <div key={k as string} className="flex gap-3 p-3 text-sm">
                          <span className="w-36 text-muted-foreground flex-shrink-0">{k}</span>
                          <span className="font-medium flex-1 break-words">{v || "—"}</span>
                        </div>
                      ))}
                    </div>

                    {form.size_variants.length > 0 && (
                      <div className="rounded-lg border p-3 bg-primary/5">
                        <p className="text-sm font-semibold mb-2">
                          <CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />
                          {form.size_variants.length + 1} listings will be created
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Primary + {form.size_variants.length} size variant(s) — each with separate
                          pricing and AI-generated title.
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" onClick={back} disabled={submitting}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Submit Listing
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
