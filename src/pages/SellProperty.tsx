import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import SmartLocationWidget from "@/components/ai/widgets/SmartLocationWidget";
import PlotMeasurementWidget from "@/components/widgets/PlotMeasurementWidget";
import WorkspaceConfigurationWidget from "@/components/widgets/WorkspaceConfigurationWidget";
import {
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Wand2,
  ArrowRight,
  ImagePlus,
  X,
  Mic,
  MicOff,
  Send,
  Image as ImageIcon,
  Camera,
  Pencil,
  Lightbulb,
} from "lucide-react";
import CityAutocomplete from "@/components/auth/CityAutocomplete";
import { cn } from "@/lib/utils";
import { completionTier, missingRequired, answeredFields, NUMBER_QUICK_REPLIES } from "@/config/propertyFieldsConfig";
import { createConversationEngine, type ConversationEngine } from "@/engines/conversationEngine";
import type { FieldDefinition, NextQuestionResult, PropertyCategory } from "@/engines/types";
import { getPriceSuggestions, getRentSuggestions, getUnitSuggestions, type PriceUnit } from "@/utils/suggestionEngine";
import { mapExtractedToEngineFields } from "@/engines/extractedFieldMapper";

const CORRECTION_RE = /\b(actually|change|instead|it'?s|correction|update|rather|sorry)\b/i;

/** Build a natural, SEO-friendly description deterministically from collected state. */
function buildPropertyDescription(s: Record<string, any>): string {
  const cap = (v: any) =>
    String(v ?? "")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const lower = (v: any) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  const typeLabel = [s.bhk && `${s.bhk} BHK`, s.sub_type || s.property_type || s.type].filter(Boolean).join(" ").trim();
  const purpose = lower(s.listing_type || s.purpose) === "rent" ? "rent" : "sale";
  const locality = s.locality || s.area || s.sub_locality;
  const city = s.city || s.location?.city;
  const where = [locality, city].filter(Boolean).join(", ") || "a sought-after neighbourhood";
  const area = s.built_up_area || s.built_area || s.plot_area || s.carpet_area || s.land_size || s.shop_area;
  const unit = s.area_unit || s.unit_type || "sq ft";
  const facing = s.facing ? `${lower(s.facing)}-facing` : "";
  const furnishing = s.furnishing ? `${lower(s.furnishing)}` : "";
  const floor = s.floor_number
    ? `situated on the ${s.floor_number}${s.total_floors ? ` of ${s.total_floors}` : ""} floor`
    : "";
  const project = s.project_name ? `part of the well-planned ${cap(s.project_name)} project` : "";
  const amenities: string[] = Array.isArray(s.amenities) ? s.amenities : [];
  const highlights: string[] = Array.isArray(s.property_highlights) ? s.property_highlights : [];
  const gated = /gated|community|township/i.test(highlights.join(" ")) || s.gated_community === true;
  const approvals = [s.rera_id && `RERA approved (${s.rera_id})`, s.approval_type].filter(Boolean).join(", ");
  const price = s.total_price || s.property_price || s.amount || s.budget || s.monthly_rent || s.rent;
  const priceLine = price
    ? purpose === "rent"
      ? `Offered at a competitive rent of ₹${price}.`
      : `Priced at ₹${price}, this property offers strong long-term value.`
    : "";

  // ---------- Paragraph 1 — headline + core specs ----------
  const p1Parts: string[] = [];
  if (typeLabel) {
    p1Parts.push(`Presenting a ${facing ? facing + " " : ""}${typeLabel} available for ${purpose} in ${where}.`);
  } else {
    p1Parts.push(`A thoughtfully designed property available for ${purpose} in ${where}.`);
  }
  if (area) {
    p1Parts.push(
      `The home spans ${area} ${unit}${floor ? `, ${floor}` : ""}${
        furnishing ? `, and is offered ${furnishing}` : ""
      }.`,
    );
  } else if (floor || furnishing) {
    p1Parts.push(
      [floor && `It is ${floor}`, furnishing && `offered ${furnishing}`].filter(Boolean).join(" and ") + ".",
    );
  }
  if (project) p1Parts.push(`${cap(project)}, it enjoys a well-maintained address.`);

  // ---------- Paragraph 2 — amenities + lifestyle ----------
  const p2Parts: string[] = [];
  if (amenities.length) {
    p2Parts.push(`Residents enjoy a curated set of amenities including ${amenities.slice(0, 8).join(", ")}.`);
  }
  if (gated) p2Parts.push(`The property sits inside a secure gated community with 24x7 access control.`);
  if (s.parking) p2Parts.push(`${cap(s.parking)} parking is available for convenience.`);
  if (highlights.length) p2Parts.push(`Key highlights: ${highlights.slice(0, 5).join(", ")}.`);
  if (!p2Parts.length)
    p2Parts.push(
      `The layout has been designed for comfortable everyday living with ample natural light and ventilation.`,
    );

  // ---------- Paragraph 3 — connectivity + investment ----------
  const p3Parts: string[] = [];
  if (locality || city) {
    p3Parts.push(
      `${cap(locality || city)} is well-connected to major business hubs, schools, hospitals and retail destinations, making daily commute effortless.`,
    );
  }
  if (approvals) p3Parts.push(`The project is ${approvals}.`);
  if (priceLine) p3Parts.push(priceLine);
  p3Parts.push(
    purpose === "rent"
      ? `An ideal pick for families and professionals looking for a move-in-ready home in ${where}.`
      : `With steady appreciation in the area, this is a compelling opportunity for both end-users and investors.`,
  );
  if (s.highlights && typeof s.highlights === "string") p3Parts.push(String(s.highlights));

  return [p1Parts.join(" "), p2Parts.join(" "), p3Parts.join(" ")]
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

/* ============================================================
   Engine field -> UI FieldDef adapter
   ============================================================ */
function adaptEngineField(fieldId: string, raw: any): FieldDef {
  const t = (raw?.type || raw?.input || "text") as string;
  const map: Record<string, FieldDef["input"]> = {
    single_select: "single",
    single: "single",
    multi_select: "multi",
    multi: "multi",
    yesno: "yesno",
    price: "number",
    price_per_unit: "number",
    rental_price: "number",
    measurement: "number",
    measurement_unit: "single",
    number: "number",
    future_date: "date",
    date: "date",
    group: "textarea",
    textarea: "textarea",
    location: "city",
    city: "city",
    locality: "locality",
    media_upload: "media",
    media: "media",
    phone: "phone",
    email: "email",
    text: "text",
    plot_measurement_widget: "text",
    workspace_configuration_widget: "workspace_configuration_widget",
  };
  const ss = raw?.smartSuggestions || {};
  const isMeasurementUnit = t === "measurement_unit" || ss.type === "dynamic_measurement_units";
  const renderMode = raw?.renderMode || "input";
  const widgetType = raw?.widget || null;
  const groupedFields = raw?.groupedFields || [];
  return {
    id: fieldId,
    type: t,
    renderMode,
    widgetType,
    groupedFields,
    question: raw?.question || raw?.label || `Please provide ${fieldId.replace(/_/g, " ")}`,
    placeholder: raw?.placeholder,
    input: map[t] || "text",
    options: Array.isArray(raw?.options)
      ? raw.options
      : isMeasurementUnit && Array.isArray(ss.units)
        ? ss.units
        : undefined,
    required: raw?.required === true,
    optional: raw?.required !== true || raw?.allowSkip === true,
    allowSkip: raw?.allowSkip === true,
    units: Array.isArray(raw?.units) ? raw.units : Array.isArray(ss.units) ? ss.units : undefined,
    durations: Array.isArray(ss.durations) ? ss.durations : undefined,
    examples: Array.isArray(ss.examples) ? ss.examples : undefined,
    searchable: ss.searchable === true,
    realtime: ss.realtime === true,
    suggestionType:
      t === "rental_price"
        ? "rental_duration"
        : t === "measurement" || t === "measurement_unit"
          ? "measurement_units"
          : t === "price" || t === "price_per_unit"
            ? "price"
            : ss.type === "indian_price_format" || ss.type === "price" || ss.type === "dynamic_price_per_unit"
              ? "price"
              : ss.type === "rental_duration" || ss.type === "rental_duration_suggestions"
                ? "rental_duration"
                : ss.type === "measurement_units" || ss.type === "dynamic_measurement_units"
                  ? "measurement_units"
                  : ss.type,
    raw,
  };
}

/* ============================================================
   Types
   ============================================================ */
type FieldDef = {
  id: string;
  type?: string;
  section?: string;
  question: string;
  placeholder?: string;
  renderMode?: "input" | "widget";
  widgetType?: "SmartLocationWidget" | null;
  groupedFields?: string[];
  input:
    | "text"
    | "textarea"
    | "number"
    | "phone"
    | "email"
    | "single"
    | "multi"
    | "yesno"
    | "media"
    | "city"
    | "locality"
    | "price_unit"
    | "date"
    | "plot_measurement_widget"
    | "workspace_configuration_widget";
  options?: string[];
  optional?: boolean;
  required?: boolean;
  allowSkip?: boolean;
  units?: string[];
  durations?: string[];
  examples?: string[];
  searchable?: boolean;
  realtime?: boolean;
  suggestionType?: string;
  raw?: any;
};

type NextResp =
  | { done: true; state_patch?: Record<string, any> }
  | {
      done: false;
      field: FieldDef;
      suggestions: string[];
      progress: { filled: number; total: number };
      state_patch?: Record<string, any>;
      clarification?: boolean;
    };

type ChatMsg =
  | { id: string; role: "ai"; kind: "text"; text: string }
  | { id: string; role: "ai"; kind: "typing" }
  | { id: string; role: "user"; kind: "text"; text: string }
  | { id: string; role: "user"; kind: "image"; url: string; caption?: string };

const phoneRE = /^[6-9]\d{9}$/;
const pinRE = /^\d{6}$/;
const uid = () => Math.random().toString(36).slice(2, 10);

function isEmpty(v: any) {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    // price unit object
    if ("unit" in v || "area" in v || "pricePerUnit" in v) {
      return !v.unit || !v.area || !v.pricePerUnit;
    }

    // generic object (plot widget etc.)
    return Object.keys(v).length === 0;
  }
  return false;
}

/** A field is optional if it's marked optional OR not marked required. */
function isOptional(f: FieldDef | null | undefined): boolean {
  if (!f) return false;
  if (f.optional) return true;
  return f.required !== true;
}

function validate(field: FieldDef, value: any): string | null {
  if (isOptional(field) && isEmpty(value)) return null;
  if (isEmpty(value)) return "This field is required";
  if (field.input === "phone" && !phoneRE.test(String(value))) return "Enter a valid 10-digit mobile number";
  if (field.input === "email") {
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!re.test(String(value))) return "Enter a valid email";
  }
  if (field.input === "number" && isNaN(Number(value))) return "Enter a valid number";
  if (field.id === "pincode" && !pinRE.test(String(value))) return "Enter a valid 6-digit PIN";
  if (field.input === "price_unit") {
    if (isNaN(Number(value.area)) || Number(value.area) <= 0) return "Enter a valid area";
    if (isNaN(Number(value.pricePerUnit)) || Number(value.pricePerUnit) <= 0) return "Enter a valid price per unit";
  }
  return null;
}

/** Pretty-print a user's answer for the chat bubble */
function formatAnswer(field: FieldDef, value: any): string {
  if (value === null || value === undefined || value === "") return "Skipped";
  if (Array.isArray(value)) return value.join(", ");
  if (field.input === "price_unit") {
    const v = value as { unit: string; area: string; pricePerUnit: string };
    const total = Number(v.area) * Number(v.pricePerUnit);
    const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));
    return `${v.area} ${v.unit} × ₹${fmt(Number(v.pricePerUnit))}/${v.unit}  ≈  ₹${fmt(total)}`;
  }
  if (
    (field.type === "plot_measurement_widget" || (field.input as string) === "plot_measurement_widget") &&
    typeof value === "object"
  ) {
    return Object.entries(value)
      .map(([k, v]: any) => {
        const side = k.replace("_measurement", "");

        return `${side}: ${v.value} ${v.unit}`;
      })
      .join(", ");
  }

  if (
    (field.type === "workspace_configuration_widget" || field.input === "workspace_configuration_widget") &&
    typeof value === "object"
  ) {
    return "Workspace configuration added";
  }

  return String(value);
}

export default function SellProperty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAgentMode = searchParams.get("as") === "agent";
  /* Session / answers state */
  const [state, setState] = useState<Record<string, any>>({});
  const [field, setField] = useState<FieldDef | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [progress, setProgress] = useState<{ filled: number; total: number }>({ filled: 0, total: 1 });
  const [value, setValue] = useState<any>("");
  const [error, setError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<{ field: FieldDef; value: any }[]>([]);
  const [uploading, setUploading] = useState(false);

  /* Intake (first free-form description) */
  const [intakeDone, setIntakeDone] = useState(false);
  const [intakeText, setIntakeText] = useState("");
  const [extracting, setExtracting] = useState(false);

  /* Smart hint per question (locality-aware AI tip) */
  const [smartHint, setSmartHint] = useState<string | null>(null);

  /* Edit-previous drawer */
  const [editorOpen, setEditorOpen] = useState(false);

  /* AI titles + review */
  const [aiTitles, setAiTitles] = useState<{ type: string; label: string; title: string }[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [posterTitle, setPosterTitle] = useState<string>("");

  /* Editable review fields (mirror state but allow live edits on review screen) */
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewLocality, setReviewLocality] = useState("");
  const [reviewCity, setReviewCity] = useState("");
  const [reviewAddress, setReviewAddress] = useState("");
  const [reviewArea, setReviewArea] = useState("");
  const [reviewPricePerUnit, setReviewPricePerUnit] = useState("");
  const [reviewUnit, setReviewUnit] = useState("sq ft");
  const [reviewAmenities, setReviewAmenities] = useState<string[]>([]);
  const [reviewDescription, setReviewDescription] = useState("");
  const [newAmenity, setNewAmenity] = useState("");

  /* Chat transcript */
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  /* Voice */
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  /* Deterministic conversation engine — created AFTER user picks a category */
  const engineRef = useRef<ConversationEngine | null>(null);
  const [category, setCategory] = useState<PropertyCategory | null>(null);

  const CATEGORY_OPTIONS: { id: PropertyCategory; label: string; emoji: string }[] = [
    { id: "residential", label: "Residential", emoji: "🏠" },
    { id: "commercial", label: "Commercial", emoji: "🏢" },
    { id: "plots", label: "Plots / Land", emoji: "📐" },
    { id: "agriculture", label: "Agricultural", emoji: "🌾" },
    { id: "coworking", label: "Co-working", emoji: "💼" },
  ];

  /* ----- Auto-scroll on new messages ----- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loadingNext]);

  /* ----- Smart locality-aware hint per current field ----- */
  useEffect(() => {
    if (!field) {
      setSmartHint(null);
      return;
    }
    let cancelled = false;
    setSmartHint(null);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke<{ hint: string | null }>("ai-smart-hint", {
          body: { field_id: field.id, state },
        });
        if (!cancelled && data?.hint) setSmartHint(data.hint);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.id]);

  /* ----- When the chat is "done", seed review fields and fetch AI titles ----- */
  useEffect(() => {
    if (!done) return;
    const pu = state.price_unit || {};
    setReviewTitle(state.title || "");
    setReviewLocality(state.locality || "");
    setReviewCity(state.city || "");
    setReviewAddress(state.address || "");
    setReviewArea(pu.area || state.built_up_area || state.plot_area || "");
    setReviewPricePerUnit(pu.pricePerUnit || "");
    setReviewUnit(pu.unit || state.area_unit || "sq ft");
    setReviewAmenities(Array.isArray(state.amenities) ? state.amenities : []);
    if (!reviewDescription) {
      setReviewDescription(state.description || buildPropertyDescription(state));
    }
    if (aiTitles.length === 0) regenerateTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const regenerateTitles = async () => {
    setTitlesLoading(true);
    try {
      const { data } = await supabase.functions.invoke<{
        titles: { type: string; label: string; title: string }[];
      }>("ai-generate-titles", { body: { state, extracted_title: posterTitle || state.title || "" } });
      const t = data?.titles || [];
      setAiTitles(t);
      if (t.length > 0 && selectedTitleIdx === null) {
        setSelectedTitleIdx(0);
        if (!reviewTitle) setReviewTitle(t[0].title);
      }
    } catch (e: any) {
      toast.error("Could not generate titles");
    } finally {
      setTitlesLoading(false);
    }
  };

  /* ----- Setup speech recognition ----- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      if (txt) setValue((prev: any) => (typeof prev === "string" ? txt : prev));
    };
    rec.onerror = () => {
      setIsListening(false);
      toast.error("Voice failed. Try again.");
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  const toggleVoice = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast.error("Voice not supported in this browser");
      return;
    }
    if (isListening) {
      rec.stop();
      setIsListening(false);
    } else {
      try {
        rec.start();
        setIsListening(true);
      } catch {
        /* already started */
      }
    }
  };

  /* ----- Pre-fill seller from auth ----- */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("name, phone, email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        const prefill = {
          contact_name: (profile as any).name,
          contact_mobile: (profile as any).phone,
          mobile_number: (profile as any).phone,
          contact_email: (profile as any).email,
        };
        setState((s) => ({
          ...s,
          contact_name: prefill.contact_name || s.contact_name,
          contact_mobile: prefill.contact_mobile || s.contact_mobile,
          mobile_number: prefill.mobile_number || (s as any).mobile_number,
          contact_email: prefill.contact_email || s.contact_email,
        }));
        try {
          engineRef.current?.applyExtractedFields(prefill, { overwrite: false });
        } catch {
          /* engine not ready yet — fetchNext will sync later */
        }
      }
    })();
  }, []);

  /* ----- Greeting + property category prompt ----- */
  useEffect(() => {
    setMessages([
      {
        id: uid(),
        role: "ai",
        kind: "text",
        text: "👋 Hi! I'll help you list your property.",
      },
      {
        id: uid(),
        role: "ai",
        kind: "text",
        text: "What type of property are you listing?",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- Handle category selection — initialize engine dynamically ----- */
  const selectCategory = (cat: PropertyCategory) => {
    if (category) return;
    const opt = CATEGORY_OPTIONS.find((o) => o.id === cat);
    engineRef.current = createConversationEngine(cat);
    setCategory(cat);
    setState((s) => ({ ...s, property_category: cat }));
    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", kind: "text", text: opt?.label || cat },
      {
        id: uid(),
        role: "ai",
        kind: "text",
        text: `Great — let's list your ${opt?.label || cat} property. Tell me about it — type, speak, or upload an image, PDF or brochure. Or skip to go step by step.`,
      },
    ]);
  };

  /* ----- Run AI extraction on free-form text / poster image and start the structured flow ----- */
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected image"));
      reader.readAsDataURL(file);
    });

  const buildDetectedSummary = (ext: Record<string, any>) => {
    const parts: string[] = [];
    if (ext.bhk) parts.push(`${ext.bhk}BHK`);
    if (ext.sub_type) parts.push(ext.sub_type);
    if (ext.project_name && !parts.includes(ext.project_name)) parts.push(ext.project_name);

    const tail: string[] = [];
    if (ext.location) tail.push(`in ${ext.location}`);
    if (ext.city) tail.push(ext.city);
    if (ext.built_up_area) tail.push(`${ext.built_up_area} ${ext.area_unit || "sq ft"}`);
    if (ext.price_per_unit)
      tail.push(`₹${new Intl.NumberFormat("en-IN").format(Number(ext.price_per_unit))}/${ext.area_unit || "unit"}`);
    if (ext.furnishing) tail.push(ext.furnishing);
    if (ext.purpose) tail.push(`for ${ext.purpose}`);

    return [parts.join(" "), tail.join(", ")].filter(Boolean).join(" ").trim();
  };

  const normalizeListingState = (incoming: Record<string, any>) => {
    const next = { ...incoming };
    const existingPriceUnit = typeof next.price_unit === "object" && next.price_unit ? next.price_unit : {};
    const inferredArea =
      next.plot_area || next.built_up_area || next.shop_area || next.total_area || next.carpet_area || "";
    const inferredUnit = next.unit || next.area_unit || existingPriceUnit.unit || "sq ft";
    const inferredPricePerUnit = next.price_per_unit || existingPriceUnit.pricePerUnit || "";

    if (inferredArea || inferredPricePerUnit || existingPriceUnit.area || existingPriceUnit.pricePerUnit) {
      next.price_unit = {
        unit: inferredUnit,
        area: String(existingPriceUnit.area || inferredArea || ""),
        pricePerUnit: String(existingPriceUnit.pricePerUnit || inferredPricePerUnit || ""),
      };
    }

    return next;
  };

  const runAiExtraction = async ({
    text,
    imageUrl,
    appendUserText = true,
    sharedTypingId,
  }: {
    text?: string;
    imageUrl?: string;
    appendUserText?: boolean;
    /** When provided, reuse this single typing bubble — don't create or remove our own. */
    sharedTypingId?: string;
  }) => {
    const trimmedText = text?.trim() || "";
    if (!trimmedText && !imageUrl) {
      toast.error("Please describe your property or upload a poster first");
      return;
    }

    if (trimmedText && appendUserText) {
      setMessages((m) => [...m, { id: uid(), role: "user", kind: "text", text: trimmedText }]);
    }

    if (trimmedText) setIntakeText("");
    setExtracting(true);

    // Single loading bubble for the whole upload+OCR+extract+next-question flow
    const typingId = sharedTypingId || uid();
    if (!sharedTypingId) {
      setMessages((m) => [...m, { id: typingId, role: "ai", kind: "typing" }]);
    }

    // Track which fields were newly detected (current_state is single source of truth — only count NEW ones)
    const before = state;
    let merged: Record<string, any> = { ...state };
    try {
      const { data, error } = await supabase.functions.invoke<{
        extracted: Record<string, any>;
        listing_state: Record<string, any>;
      }>("ai-extract-property", {
        body: { text: trimmedText, image_url: imageUrl },
      });
      if (error) throw error;

      const incomingState = normalizeListingState(data?.listing_state || {});
      const ext = data?.extracted || {};

      // Translate raw AI extraction into the engine's canonical field IDs
      // so the resolver can mark them answered and skip those questions.
      const mappedEngine = mapExtractedToEngineFields(ext, category);

      merged = { ...before, ...incomingState, ...mappedEngine };
      setState(merged);

      // Push mapped values into the engine immediately (overwrite=true)
      // so already-known questions are skipped on the very next fetchNext().
      try {
        if (engineRef.current && Object.keys(mappedEngine).length) {
          engineRef.current.applyExtractedFields(mappedEngine, { overwrite: true });
        }
      } catch (err) {
        console.warn("[SellProperty] applyExtractedFields failed", err);
      }

      const detectedTitle = (ext.title || ext.project_name || "").toString().trim();
      if (detectedTitle && !posterTitle) setPosterTitle(detectedTitle);

      // Count ONLY newly saved fields (not already in state, non-empty, non-duplicate)
      const newlyFilled = Object.entries({ ...incomingState, ...mappedEngine }).filter(([k, v]) => {
        if (v === "" || v === null || v === undefined) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        const prev = (before as any)[k];
        const wasEmpty =
          prev === undefined || prev === null || prev === "" || (Array.isArray(prev) && prev.length === 0);
        return wasEmpty;
      }).length;

      setMessages((m) => [
        ...m.filter((x) => x.id !== typingId),
        {
          id: uid(),
          role: "ai",
          kind: "text",
          text:
            newlyFilled > 0
              ? `✨ Auto-filled ${newlyFilled} detail${newlyFilled === 1 ? "" : "s"}. Just a few quick questions left.`
              : "Got it — let me ask a couple of quick questions.",
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m.filter((x) => x.id !== typingId),
        { id: uid(), role: "ai", kind: "text", text: "Couldn't fully read that — let's continue step by step." },
      ]);
    } finally {
      setExtracting(false);
      setIntakeDone(true);
      // Re-use the same typing bubble for the next question fetch — no flicker
      const nextTypingId = uid();
      setMessages((m) => [...m, { id: nextTypingId, role: "ai", kind: "typing" }]);
      await fetchNext(merged, true, nextTypingId);
    }
  };

  const submitIntake = async () => {
    await runAiExtraction({ text: intakeText });
  };

  const skipIntake = async () => {
    setIntakeDone(true);
    setMessages((m) => [...m, { id: uid(), role: "user", kind: "text", text: "Let's go step by step" }]);
    await fetchNext(state, true);
  };

  /* ----- Resolve next field via the deterministic local engine ----- */
  const fetchNext = async (currentState: Record<string, any>, _isFirst = false, sharedTypingId?: string) => {
    setLoadingNext(true);

    setError(null);

    const typingId = sharedTypingId || uid();

    // =========================================================
    // SHOW TYPING
    // =========================================================

    if (!sharedTypingId) {
      setMessages((m) => [
        ...m,
        {
          id: typingId,
          role: "ai",
          kind: "typing",
        },
      ]);
    }

    try {
      const engine = engineRef.current!;

      // =======================================================
      // IMPORTANT
      // APPLY ONLY SAFE EXTRACTED FIELDS
      // =======================================================

      if (currentState && Object.keys(currentState).length > 0) {
        engine.applyExtractedFields(currentState, {
          overwrite: false,
        });
      }

      // =======================================================
      // GET NEXT QUESTION
      // =======================================================

      const result: NextQuestionResult = engine.next();

      // =======================================================
      // SMALL HUMAN DELAY
      // =======================================================

      await new Promise((r) => setTimeout(r, 180));

      // =======================================================
      // REMOVE TYPING
      // =======================================================

      setMessages((m) => m.filter((x) => x.id !== typingId));

      // =======================================================
      // COMPLETED
      // =======================================================

      if (result.done || !result.field) {
        setDone(true);

        setField(null);

        setProgress(result.progress);

        setSuggestions([]);

        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "ai",
            kind: "text",
            text: "🎉 That's everything I need! Review your details below and publish when ready.",
          },
        ]);

        return;
      }

      // =======================================================
      // FIELD SETUP
      // =======================================================

      const fieldId = (result.field as any).id || (result.question as any)?.fieldId;

      const ui = adaptEngineField(fieldId, result.field);

      // =======================================================
      // IMPORTANT
      // STORE FIELD
      // =======================================================

      setField(ui);

      // =======================================================
      // REALTIME SMART SUGGESTIONS
      // =======================================================

      const smartSuggestions = (result.question as any)?.smartSuggestions;

      const units = (result.question as any)?.units || [];

      // -------------------------------------------------------
      // DO NOT CLEAR SUGGESTIONS
      // -------------------------------------------------------

      if (smartSuggestions) {
        setSuggestions([
          {
            type: "smart",
            config: smartSuggestions,
            units,
          },
        ]);
      } else {
        setSuggestions([]);
      }

      // =======================================================
      // PROGRESS
      // =======================================================

      setProgress(result.progress);

      // =======================================================
      // EXISTING VALUE
      // =======================================================

      const existing = currentState?.[fieldId];

      if (existing !== undefined && existing !== null && existing !== "") {
        setValue(existing);
      } else if (ui.input === "multi") {
        setValue([]);
      } else if (ui.input === "price_unit") {
        setValue({
          unit: "sq ft",
          area: "",
          pricePerUnit: "",
        });
      } else {
        setValue("");
      }

      // =======================================================
      // AI MESSAGE
      // =======================================================

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "ai",
          kind: "text",
          text: result.question?.prompt || ui.question,
        },
      ]);
    } catch (e: any) {
      // =======================================================
      // REMOVE TYPING
      // =======================================================

      setMessages((m) => m.filter((x) => x.kind !== "typing"));

      // =======================================================
      // ERROR
      // =======================================================

      setError(e.message || "Could not load next question");

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "ai",
          kind: "text",
          text: "Hmm, I had trouble continuing. Tap retry or type your answer.",
        },
      ]);
    } finally {
      setLoadingNext(false);
    }
  };

  /* ----- Commit a value (used by suggestion chips & main submit) ----- */
  /* ===========================================================
   COMMIT ANSWER
=========================================================== */

  const commitAnswer = async (val: any, displayText?: string, targetField?: FieldDef) => {
    const f = targetField || field;

    if (!f) {
      return;
    }

    // =========================================================
    // NORMALIZE STRING INPUT
    // =========================================================

    let normalized = val;

    if (typeof val === "string") {
      normalized = val.trim();

      // -------------------------------------------------------
      // empty
      // -------------------------------------------------------

      if (normalized === "") {
        return;
      }

      // -------------------------------------------------------
      // skip keywords
      // -------------------------------------------------------

      const lower = normalized.toLowerCase();

      if (lower === "skip" || lower === "skipped" || lower === "na" || lower === "n/a") {
        await onSkip();

        return;
      }
    }

    // =========================================================
    // USER MESSAGE
    // =========================================================

    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: "user",
        kind: "text",
        text: displayText ?? formatAnswer(f, normalized),
      },
    ]);

    // =========================================================
    // NEW STATE
    // =========================================================

    const newState = {
      ...state,
      [f.id]: normalized,
    };

    // =========================================================
    // HISTORY
    // =========================================================

    setHistory((h) => [
      ...h,
      {
        field: f,
        value: normalized,
      },
    ]);

    // =========================================================
    // SAVE STATE
    // =========================================================

    setState(newState);

    setError(null);

    // =========================================================
    // APPLY ENGINE ANSWER
    // =========================================================

    try {
      engineRef.current?.applyAnswer(f.id, normalized);
    } catch {}

    // =========================================================
    // IMPORTANT
    // clear AFTER apply
    // =========================================================

    setValue("");

    // =========================================================
    // FETCH NEXT
    // =========================================================

    await fetchNext(newState);
  };

  /* ===========================================================
   NEXT
=========================================================== */

  const onNext = async () => {
    if (!field) {
      return;
    }

    // =========================================================
    // CONVERSATIONAL CORRECTIONS
    // =========================================================

    if (
      typeof value === "string" &&
      value.trim().length > 6 &&
      CORRECTION_RE.test(value) &&
      (field.input === "text" || field.input === "textarea")
    ) {
      await runAiExtraction({
        text: value,
      });

      return;
    }

    // =========================================================
    // VALIDATE
    // =========================================================

    const err = validate(field, value);

    if (err) {
      setError(err);

      return;
    }

    // =========================================================
    // COMMIT
    // =========================================================

    await commitAnswer(value);
  };

  /* ===========================================================
   SKIP
=========================================================== */

  const onSkip = async () => {
    if (!field || !isOptional(field)) {
      return;
    }

    const skippedId = field.id;

    // =========================================================
    // USER MESSAGE
    // =========================================================

    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: "user",
        kind: "text",
        text: "Skip",
      },
    ]);

    // =========================================================
    // HISTORY
    // =========================================================

    setHistory((h) => [
      ...h,
      {
        field,
        value: null,
      },
    ]);

    // =========================================================
    // NEW STATE
    // IMPORTANT
    // REMOVE FIELD
    // =========================================================

    const newState = {
      ...state,
    };

    delete newState[skippedId];

    // =========================================================
    // SAVE STATE
    // =========================================================

    setState(newState);

    setValue("");

    setError(null);

    // =========================================================
    // ENGINE SKIP
    // =========================================================

    try {
      engineRef.current?.skipField(skippedId);
    } catch {}

    // =========================================================
    // IMPORTANT
    // USE UPDATED STATE
    // =========================================================

    await fetchNext(newState);
  };

  /* ===========================================================
   BACK
=========================================================== */

  const onBack = async () => {
    if (history.length === 0) {
      navigate("/dashboard");
      return;
    }

    const prev = history[history.length - 1];

    // =========================================================
    // REMOVE HISTORY
    // =========================================================

    setHistory(history.slice(0, -1));

    // =========================================================
    // CLEAR STATE
    // =========================================================

    const cleared = {
      ...state,
    };

    delete cleared[prev.field.id];

    setState(cleared);

    setDone(false);

    // =========================================================
    // REMOVE CHAT PAIR
    // =========================================================

    setMessages((m) => {
      const copy = [...m];

      // -------------------------------------------------------
      // remove trailing ai
      // -------------------------------------------------------

      while (copy.length && copy[copy.length - 1].role === "ai") {
        copy.pop();
      }

      // -------------------------------------------------------
      // remove user answer
      // -------------------------------------------------------

      if (copy.length && copy[copy.length - 1].role === "user") {
        copy.pop();
      }

      return copy;
    });

    // =========================================================
    // IMPORTANT
    // REMOVE SKIPPED TOO
    // =========================================================

    try {
      const engine = engineRef.current;

      if (engine) {
        const s = engine.getState();

        s.skipped = s.skipped.filter((id) => id !== prev.field.id);
      }
    } catch {}

    // =========================================================
    // FETCH
    // =========================================================

    await fetchNext(cleared);
  };

  /* ----- Property images upload ----- */
  const handleFiles = async (files: FileList, options?: { showChatBubble?: boolean }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to upload");
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [...(state.media_urls || [])];
      for (const file of Array.from(files).slice(0, 10)) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("property-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        urls.push(pub.publicUrl);
        if (options?.showChatBubble !== false) {
          setMessages((m) => [...m, { id: uid(), role: "user", kind: "image", url: pub.publicUrl }]);
        }
      }
      setState((s) => ({ ...s, media_urls: urls }));
      toast.success(`${urls.length} photo(s) added`);

      // If the user is currently being asked for media, treat the upload
      // as the answer and advance the conversation (don't leave the field hanging
      // and don't fall through to the skip path).
      if (field && field.input === "media") {
        await commitAnswer(urls, `${urls.length} photo(s) attached`);
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ----- AI clean: remove ALL text/PII from poster via Nano Banana inpainting ----- */
  const redactPosterFile = async (file: File): Promise<File> => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const { data } = await supabase.functions.invoke<{ cleaned_url: string | null }>("clean-poster-image", {
        body: { image_url: dataUrl },
      });
      const cleanedUrl = data?.cleaned_url;
      if (!cleanedUrl || !cleanedUrl.startsWith("data:image")) {
        // AI couldn't clean — upload original (better than a black-box poster)
        console.warn("AI clean returned no image, using original");
        return file;
      }
      // Convert data URL → File
      const res = await fetch(cleanedUrl);
      const blob = await res.blob();
      const cleanName = file.name.replace(/\.[^.]+$/, "") + "-clean.jpg";
      return new File([blob], cleanName, { type: blob.type || "image/jpeg" });
    } catch (e) {
      console.warn("AI poster clean failed, uploading original", e);
      return file;
    }
  };

  /* ----- Load pdfjs once with a working worker ----- */
  const loadPdfjs = async (): Promise<any> => {
    const pdfjs: any = await import("pdfjs-dist");
    try {
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || "4.0.379"}/build/pdf.worker.min.mjs`;
    }
    return pdfjs;
  };

  /* ----- Render the first N pages of a PDF to JPEG data URLs (for OCR fallback) ----- */
  const renderPdfPagesToImages = async (file: File, maxPages = 3): Promise<string[]> => {
    try {
      const pdfjs = await loadPdfjs();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const out: string[] = [];
      const n = Math.min(pdf.numPages, maxPages);
      for (let i = 1; i <= n; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        out.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      return out;
    } catch (e) {
      console.warn("pdf->image render failed", e);
      return [];
    }
  };

  /* ----- Extract text from PDF: try server first, then pdfjs text layer ----- */
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke<{ text: string }>("extract-pdf-text", {
        body: { pdf_data_url: dataUrl },
      });
      if (!error && data?.text && data.text.trim().length >= 20) {
        return data.text.trim();
      }
    } catch (e) {
      console.warn("server pdf extract failed, falling back to pdfjs", e);
    }
    try {
      const pdfjs = await loadPdfjs();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const pages: string[] = [];
      const maxPages = Math.min(pdf.numPages, 15);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((it: any) => it.str).join(" "));
      }
      return pages.join("\n\n").trim();
    } catch (e) {
      console.warn("pdfjs extract failed", e);
      return "";
    }
  };

  /* ----- Extract text from DOC/DOCX using mammoth ----- */
  const extractDocxText = async (file: File): Promise<string> => {
    const mammoth: any = await import("mammoth");
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result?.value || "").trim();
  };

  /* ----- Quick-attach: image, PDF, DOC, DOCX (AI extracts silently) ----- */
  const handleQuickImage = async (files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isDoc =
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".doc") ||
      name.endsWith(".docx");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isDoc && !isImage) {
      toast.error("Unsupported file. Please upload an image, PDF, or DOC/DOCX.");
      return;
    }

    // ONE shared loading bubble for the entire upload + OCR + extraction + next-question flow
    const bubbleId = uid();
    setMessages((m) => [...m, { id: bubbleId, role: "ai", kind: "typing" }]);

    try {
      if (isImage) {
        // Show user's image bubble immediately so chat is not "blocked"
        const previewUrl = URL.createObjectURL(file);
        setMessages((m) => {
          // insert image bubble BEFORE the typing bubble
          const idx = m.findIndex((x) => x.id === bubbleId);
          const imgMsg: ChatMsg = { id: uid(), role: "user", kind: "image", url: previewUrl };
          if (idx === -1) return [...m, imgMsg];
          return [...m.slice(0, idx), imgMsg, ...m.slice(idx)];
        });

        const imageUrl = await fileToDataUrl(file);

        // Fire-and-forget: redact + upload happens in background and silently
        // appends to media_urls when ready. It does NOT block the chat.
        (async () => {
          try {
            const redacted = await redactPosterFile(file);
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const path = `${user.id}/${Date.now()}-${redacted.name}`;
            const { error: upErr } = await supabase.storage.from("property-images").upload(path, redacted);
            if (upErr) return;
            const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
            setState((s) => ({ ...s, media_urls: [...(s.media_urls || []), pub.publicUrl] }));
          } catch {
            /* silent */
          }
        })();

        // Run extraction reusing the SAME typing bubble (no flicker, no duplicate loaders)
        await runAiExtraction({
          text: intakeText,
          imageUrl,
          appendUserText: !!intakeText.trim(),
          sharedTypingId: bubbleId,
        });
        return;
      }

      // PDF / DOC / DOCX path — extract text, feed to AI silently
      // Show file attachment bubble immediately (don't block chat)
      setMessages((m) => {
        const idx = m.findIndex((x) => x.id === bubbleId);
        const fileMsg: ChatMsg = { id: uid(), role: "user", kind: "text", text: `📎 ${file.name}` };
        if (idx === -1) return [...m, fileMsg];
        return [...m.slice(0, idx), fileMsg, ...m.slice(idx)];
      });

      let extracted = "";
      try {
        extracted = isPdf ? await extractPdfText(file) : await extractDocxText(file);
      } catch (err) {
        console.warn("Doc text extraction failed", err);
      }

      if (extracted && extracted.length >= 20) {
        const combined = [intakeText.trim(), extracted].filter(Boolean).join("\n\n");
        await runAiExtraction({ text: combined, appendUserText: false, sharedTypingId: bubbleId });
        return;
      }

      // Fallback: render the FIRST PDF page as an image (single AI call, not per-page)
      if (isPdf) {
        const pageImages = await renderPdfPagesToImages(file, 1);
        if (pageImages.length > 0) {
          await runAiExtraction({
            text: intakeText || "Extract every property detail visible in this brochure.",
            imageUrl: pageImages[0],
            appendUserText: false,
            sharedTypingId: bubbleId,
          });
          return;
        }
      }

      // Nothing extracted — clear the loader and tell the user
      setMessages((m) => m.filter((x) => x.id !== bubbleId));
      toast.error("Couldn't read that file. Try a clearer PDF/document or paste the details.");
    } catch (e: any) {
      setMessages((m) => m.filter((x) => x.id !== bubbleId));
      toast.error(e.message || "Could not analyze the file");
    }
  };

  /* ----- Final submit ----- */
  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        navigate("/auth");
        return;
      }

      // Use review-screen edits as the source of truth
      const area = Number(reviewArea) || null;
      const ppu = Number(reviewPricePerUnit) || null;
      const totalPrice = area && ppu ? area * ppu : null;
      const UNIT_TO_SQFT: Record<string, number> = {
        "sq ft": 1,
        "sq m": 10.7639,
        gunta: 1089,
        acre: 43560,
        cent: 435.6,
        "sq yard": 9,
      };
      const areaSqft = area ? Math.round(area * (UNIT_TO_SQFT[reviewUnit] || 1)) : null;

      const typesArr = Array.isArray(state.type) ? state.type : state.type ? [state.type] : [];
      const primaryType = typesArr[0] || null;

      const finalTitle =
        (reviewTitle && reviewTitle.trim()) ||
        (selectedTitleIdx !== null ? aiTitles[selectedTitleIdx]?.title : "") ||
        `${state.bhk || ""} ${primaryType || "Property"} in ${reviewLocality || reviewCity || ""}`.trim();

      // Detect agent mode and trust level
      let agentRecord: any = null;
      let isTrustedAgent = false;
      if (isAgentMode) {
        const { data: agentRow } = await (supabase.from as any)("agents")
          .select("id, user_id, verified, trust_score")
          .eq("user_id", user.id)
          .maybeSingle();
        agentRecord = agentRow;
        isTrustedAgent = !!(agentRow && agentRow.verified && (Number(agentRow.trust_score) || 0) >= 80);
      }

      // Status decisions
      let verification_status = "pending";
      let listing_status = "complete";
      let assigned_agent_id: string | null = null;
      if (isAgentMode && agentRecord) {
        if (isTrustedAgent) {
          verification_status = "agent_verified_pending"; // pending admin approval
          listing_status = "verified"; // ready for admin review/publish
          assigned_agent_id = agentRecord.id;
        } else {
          verification_status = "pending";
          listing_status = "complete";
        }
      }

      const payload: any = {
        submitted_by: user.id,
        title: finalTitle,
        description: reviewDescription || state.description || buildPropertyDescription(state) || null,
        type: primaryType,
        listing_type: (state.purpose || "sale").toLowerCase(),
        listed_by: isAgentMode ? "agent" : (state.listed_by || "owner").toLowerCase(),
        price: totalPrice,
        area_sqft: areaSqft,
        bhk: state.bhk ? parseInt(String(state.bhk)) || null : null,
        bedrooms: state.bhk ? parseInt(String(state.bhk)) || null : null,
        bathrooms: state.bathrooms ? Number(state.bathrooms) : null,
        balconies: state.balconies ? Number(state.balconies) : null,
        floor_number: state.floor_number ? Number(state.floor_number) : null,
        total_floors: state.total_floors ? Number(state.total_floors) : null,
        city: reviewCity || null,
        locality: reviewLocality || null,
        address: reviewAddress || null,
        pincode: state.pincode || null,
        furnishing: state.furnishing || null,
        amenities: reviewAmenities,
        rera_id: state.rera_number || null,
        images: state.media_urls || [],
        is_draft: false,
        verified: false,
        verification_status,
        listing_status,
        assigned_agent_id,
        agent_submitted_at: isAgentMode && isTrustedAgent ? new Date().toISOString() : null,
        agent_data: isAgentMode ? { ...state, agent_id: agentRecord?.id, submitted_by_agent: true } : null,
        document_urls: {
          ...state,
          created_by_role: isAgentMode ? "agent" : "seller",
          created_by_id: isAgentMode && agentRecord ? agentRecord.id : user.id,
        },
      };

      const { data: inserted, error: insErr } = await (supabase.from as any)("properties")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Save granular field key/values to property_details (one row per field)
      const propertyId = inserted?.id;
      if (propertyId) {
        const detailRows = Object.entries(state)
          .filter(([_, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => ({
            property_id: propertyId,
            field_key: k,
            field_value: typeof v === "object" ? v : { value: v },
          }));
        if (detailRows.length > 0) {
          await (supabase.from as any)("property_details").insert(detailRows);
        }
      }

      // Auto-assign agent only for seller flow OR non-trusted agent submissions
      if (propertyId && !(isAgentMode && isTrustedAgent)) {
        try {
          await supabase.functions.invoke("auto-assign-agent", { body: { property_id: propertyId } });
        } catch (e) {
          console.warn("auto-assign failed", e);
        }
      }

      if (isAgentMode && isTrustedAgent) {
        toast.success("Property submitted ✅", {
          description: "As a trusted agent, your listing goes directly to admin for approval.",
        });
        navigate("/dashboard/agent");
      } else if (isAgentMode) {
        toast.success("Property submitted ✅", {
          description: "Your listing is in admin review queue.",
        });
        navigate("/dashboard/agent");
      } else {
        toast.success("Your property is submitted ✅", {
          description: "We're assigning a verification agent now. You'll be notified shortly.",
        });
        navigate("/dashboard/seller");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Could not submit listing");
    } finally {
      setSubmitting(false);
    }
  };

  const tier = completionTier(state);
  const pct = tier.pct;
  const missing = missingRequired(state);
  const answered = answeredFields(state);

  const showCategoryPicker = !category && !done;
  const showIntakeBar = !!category && !intakeDone && !done;
  const showInputBar =
    showCategoryPicker || showIntakeBar || (intakeDone && field && !done && field.renderMode !== "widget");
  const isMultiline = field?.input === "textarea";

  const tierBadgeClasses: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    Partial: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    Good: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    Premium: "bg-gradient-to-r from-primary/15 to-emerald-500/15 text-primary border-primary/30",
  };

  /** Jump back to a previously answered field (edit it). Removes everything after it. */
  const jumpToField = (fieldId: string) => {
    setEditorOpen(false);
    const idx = history.findIndex((h) => h.field.id === fieldId);
    if (idx === -1) return;
    const keep = history.slice(0, idx);
    const cleared = { ...state };
    for (const h of history.slice(idx)) delete cleared[h.field.id];
    setHistory(keep);
    setState(cleared);
    setDone(false);
    // trim trailing AI/user pair messages until we'd re-ask this question
    setMessages((m) => {
      // best-effort: keep messages then re-fetch will append a fresh question bubble
      return m;
    });
    fetchNext(cleared);
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overflow-hidden">
      <Navigation />

      {/* Chat header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-16 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="h-9 w-9 shrink-0 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground transition"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm flex items-center gap-2">
              JAAGA X Assistant
              <span className="text-[10px] font-normal text-emerald-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                online
              </span>
            </div>
            <div className="text-xs text-muted-foreground">AI-guided property listing</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorOpen((o) => !o)}
              disabled={answered.length === 0}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted transition disabled:opacity-40"
              title="Edit previous answers"
            >
              <Pencil className="h-3 w-3" /> Edit ({answered.length})
            </button>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    tierBadgeClasses[tier.label],
                  )}
                >
                  {tier.label}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1 w-24 mt-1" />
              {missing.length > 0 && intakeDone && (
                <div className="text-[9px] text-muted-foreground mt-0.5">{missing.length} required left</div>
              )}
            </div>
          </div>
        </div>

        {/* Edit-previous-answers drawer */}
        <AnimatePresence>
          {editorOpen && answered.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/40 overflow-hidden"
            >
              <div className="container max-w-3xl mx-auto px-4 py-3">
                <div className="text-[11px] text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Tap any answer to edit it (this will rewind to that question)</span>
                  <button onClick={() => setEditorOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {answered.map(({ field: f, value: v }) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => jumpToField(f.id)}
                      className="group flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary hover:bg-primary/5 transition"
                    >
                      <span className="text-muted-foreground">{f.id.replace(/_/g, " ")}:</span>
                      <span className="font-medium max-w-[140px] truncate">
                        {Array.isArray(v)
                          ? v.join(", ")
                          : typeof v === "object"
                            ? `${(v as any).area} ${(v as any).unit}`
                            : String(v)}
                      </span>
                      <Pencil className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat scroll area */}
      {!showCategoryPicker && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            paddingBottom: "180px",
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.04) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <div className="container max-w-3xl mx-auto px-3 sm:px-4 pt-4 pb-6 space-y-2 flex flex-col">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <Bubble msg={msg} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Quick-reply chips for the current field (single / multi / yesno) */}
            {field &&
              !loadingNext &&
              !done &&
              (field.input === "single" || field.input === "yesno" || field.input === "multi") && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 pt-1 pl-1"
                >
                  {(field.input === "yesno" ? ["Yes", "No"] : field.options || []).map((opt) => {
                    const isMulti = field.input === "multi";
                    const arr: string[] = Array.isArray(value) ? value : [];
                    const active = isMulti ? arr.includes(opt) : value === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (isMulti) {
                            setValue(active ? arr.filter((x) => x !== opt) : [...arr, opt]);
                          } else {
                            setValue(opt);

                            setTimeout(async () => {
                              await commitAnswer(opt, opt);
                            }, 80);
                          }
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-medium border transition shadow-sm",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card hover:bg-primary/5 border-border",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </motion.div>
              )}

            {/* Quick-reply chips for NUMBER fields — never leave a blank input */}
            {field && !loadingNext && !done && field.input === "number" && NUMBER_QUICK_REPLIES[field.id] && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 pt-1 pl-1"
              >
                {NUMBER_QUICK_REPLIES[field.id].map((opt) => {
                  const active = String(value) === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        // strip "+" or "Ground" → numeric where possible
                        const numeric =
                          opt === "Ground" ? 0 : opt.endsWith("+") ? Number(opt.slice(0, -1)) : Number(opt);
                        const sendVal = isNaN(numeric) ? opt : numeric;
                        setValue(sendVal);
                        setTimeout(async () => {
                          await commitAnswer(sendVal, opt);
                        }, 80);
                      }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium border transition shadow-sm",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-primary/5 border-border",
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
                <span className="text-[10px] text-muted-foreground self-center pl-1">or enter manually below</span>
              </motion.div>
            )}
            {field && smartHint && !loadingNext && !done && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="pl-1 pt-1">
                <div className="inline-flex items-start gap-2 max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-sm bg-amber-500/8 border border-amber-500/20 text-[11px]">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-px" />
                  <span className="text-foreground/90">{smartHint}</span>
                </div>
              </motion.div>
            )}

            {/* SMART WIDGETS */}

            {/* SMART WIDGETS */}

            {field?.renderMode === "widget" && field.widgetType === "SmartLocationWidget" && (
              <div className="pt-3">
                <SmartLocationWidget
                  initialValue={{
                    country: state.country || "India",

                    state_name: state.state_name || state.state || "",

                    city: state.city || "",

                    locality: state.locality || "",

                    sub_locality: state.sub_locality || "",

                    landmark: state.landmark || "",

                    address: state.address || "",

                    pincode: state.pincode || "",
                  }}
                  onSubmit={async (data) => {
                    // ============================================
                    // MERGE LOCATION FIELDS
                    // ============================================

                    const locationFieldId = field?.id || "location";

                    const merged = {
                      ...state,
                      country: data.country,
                      state_name: data.state_name,
                      city: data.city,
                      locality: data.locality,
                      sub_locality: data.sub_locality,
                      landmark: data.landmark,
                      address: data.address,
                      pincode: data.pincode,
                      // Mark the composite location field itself as answered
                      // so the engine doesn't re-ask the same widget forever.
                      [locationFieldId]: {
                        country: data.country,
                        state_name: data.state_name,
                        city: data.city,
                        locality: data.locality,
                        sub_locality: data.sub_locality,
                        landmark: data.landmark,
                        address: data.address,
                        pincode: data.pincode,
                      },
                    };

                    // ============================================
                    // SAVE STATE
                    // ============================================

                    setState(merged);

                    // ============================================
                    // APPLY TO ENGINE
                    // ============================================

                    try {
                      engineRef.current?.applyExtractedFields(
                        {
                          country: data.country,
                          state_name: data.state_name,
                          city: data.city,
                          locality: data.locality,
                          sub_locality: data.sub_locality,
                          landmark: data.landmark,
                          address: data.address,
                          pincode: data.pincode,
                          [locationFieldId]: merged[locationFieldId],
                        },
                        {
                          overwrite: true,
                        },
                      );
                    } catch {}

                    // ============================================
                    // USER MESSAGE
                    // ============================================

                    setMessages((m) => [
                      ...m,

                      {
                        id: uid(),

                        role: "user",

                        kind: "text",

                        text: `${data.locality}, ${data.city}`,
                      },
                    ]);

                    // ============================================
                    // CONTINUE FLOW
                    // ============================================

                    await fetchNext(merged);
                  }}
                />
              </div>
            )}
            {field?.type === "plot_measurement_widget" && (
              <div className="pt-3">
                <PlotMeasurementWidget field={field.raw} value={value} onChange={setValue} />
              </div>
            )}
            {field?.type === "workspace_configuration_widget" && (
              <div className="pt-3">
                <WorkspaceConfigurationWidget
                  field={field.raw}
                  value={value}
                  onChange={(v) => {
                    commitAnswer(v);
                  }}
                />
              </div>
            )}

            {/* Required/optional inline indicator */}
            {field && !loadingNext && !done && (
              <div className="pl-1 pt-1">
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    isOptional(field) ? "text-muted-foreground" : "text-primary bg-primary/10",
                  )}
                >
                  {isOptional(field) ? "Optional · you can skip" : "Required"}
                </span>
              </div>
            )}

            {error && <div className="pl-1 text-xs text-destructive">{error}</div>}

            {/* Final review screen */}
            {done && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
                {/* AI title picker */}
                <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-emerald-500/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">AI-suggested titles</h3>
                    </div>
                    <button
                      type="button"
                      onClick={regenerateTitles}
                      disabled={titlesLoading}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {titlesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Regenerate
                    </button>
                  </div>
                  <div className="space-y-2">
                    {titlesLoading && aiTitles.length === 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Crafting titles…
                      </div>
                    )}
                    {aiTitles.map((t, i) => {
                      const active = selectedTitleIdx === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedTitleIdx(i);
                            setReviewTitle(t.title);
                            setEditingTitle(false);
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border transition",
                            active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                              {t.label}
                            </span>
                            {active && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <div className="text-sm">{t.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Editable review */}
                <div className="rounded-2xl border border-emerald-500/30 bg-card p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h2 className="font-semibold">Review & publish</h2>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                      <span>Title</span>
                      <button
                        type="button"
                        onClick={() => setEditingTitle((v) => !v)}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" /> {editingTitle ? "Done" : "Edit"}
                      </button>
                    </label>
                    {editingTitle ? (
                      <Input
                        value={reviewTitle}
                        onChange={(e) => {
                          setReviewTitle(e.target.value);
                          setSelectedTitleIdx(null);
                        }}
                        placeholder="Listing title"
                      />
                    ) : (
                      <div className="text-sm font-medium px-3 py-2 rounded-lg bg-muted/40 border border-border">
                        {reviewTitle || <span className="text-muted-foreground italic">No title yet</span>}
                      </div>
                    )}
                  </div>

                  {/* AI-generated Description */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wand2 className="h-3 w-3 text-primary" /> Description
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewDescription(buildPropertyDescription(state))}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" /> Regenerate
                      </button>
                    </label>
                    <Textarea
                      value={reviewDescription}
                      onChange={(e) => setReviewDescription(e.target.value)}
                      rows={4}
                      placeholder="A natural, SEO-friendly description will appear here…"
                      className="resize-none rounded-xl text-sm"
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">City</label>
                      <Input value={reviewCity} onChange={(e) => setReviewCity(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Locality</label>
                      <Input value={reviewLocality} onChange={(e) => setReviewLocality(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                      <Input
                        value={reviewAddress}
                        onChange={(e) => setReviewAddress(e.target.value)}
                        placeholder="Street / landmark"
                      />
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Price</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        placeholder="Area"
                        value={reviewArea}
                        onChange={(e) => setReviewArea(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder={`₹/${reviewUnit}`}
                        value={reviewPricePerUnit}
                        onChange={(e) => setReviewPricePerUnit(e.target.value)}
                      />
                      <select
                        value={reviewUnit}
                        onChange={(e) => setReviewUnit(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {["sq ft", "sq yard", "sq m", "gunta", "acre", "cent"].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    {Number(reviewArea) > 0 && Number(reviewPricePerUnit) > 0 && (
                      <div className="mt-2 text-sm flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold text-primary">
                          ₹{" "}
                          {new Intl.NumberFormat("en-IN").format(
                            Math.round(Number(reviewArea) * Number(reviewPricePerUnit)),
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amenities */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Amenities</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {reviewAmenities.length === 0 && (
                        <span className="text-[11px] text-muted-foreground italic">No amenities added</span>
                      )}
                      {reviewAmenities.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
                        >
                          {a}
                          <button
                            type="button"
                            onClick={() => setReviewAmenities((arr) => arr.filter((_, idx) => idx !== i))}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                        placeholder="e.g. Lift, Gym, Power backup"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newAmenity.trim()) {
                            e.preventDefault();
                            setReviewAmenities((arr) => [...arr, newAmenity.trim()]);
                            setNewAmenity("");
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newAmenity.trim()) {
                            setReviewAmenities((arr) => [...arr, newAmenity.trim()]);
                            setNewAmenity("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Photos ({(state.media_urls || []).length})
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {(state.media_urls || []).map((url: string, i: number) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setState((s) => ({
                                ...s,
                                media_urls: s.media_urls.filter((_: any, idx: number) => idx !== i),
                              }))
                            }
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="aspect-square rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Other captured details */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">All captured details</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(state).map(([k, v]) =>
                        v &&
                        !["media_urls", "amenities", "title", "city", "locality", "address", "price_unit"].includes(
                          k,
                        ) ? (
                          <Badge key={k} variant="secondary" className="font-normal text-[10px]">
                            {k.replace(/_/g, " ")}:{" "}
                            {Array.isArray(v) ? v.join(", ") : typeof v === "object" ? "✓" : String(v)}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                    </Button>
                    <Button
                      onClick={onSubmit}
                      disabled={submitting}
                      size="sm"
                      className="bg-gradient-to-r from-primary to-emerald-500 flex-1"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Submit Property
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Input dock */}
      {showInputBar && (
        <div className="sticky bottom-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="container max-w-4xl mx-auto px-3 sm:px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            {/* =======================================================
          CATEGORY SELECTOR
      ======================================================= */}

            {showCategoryPicker ? (
              <div className="flex flex-col items-center justify-center py-6 sm:py-10">
                <div className="text-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold">What type of property are you listing?</h2>

                  <p className="text-sm text-muted-foreground mt-2">
                    Choose a category to begin your AI-assisted listing
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => selectCategory(opt.id)}
                      className="group rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all p-4 text-left shadow-sm hover:shadow-md"
                    >
                      <div className="text-2xl mb-2">{opt.emoji}</div>

                      <div className="font-medium text-sm">{opt.label}</div>

                      <div className="text-[11px] text-muted-foreground mt-1">AI guided flow</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : showIntakeBar ? (
              <>
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => e.target.files && handleQuickImage(e.target.files)}
                />

                <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* ===================================================
                SUGGESTION HEADER
            =================================================== */}

                  <div className="px-4 pt-3 pb-2 border-b border-border/40 bg-muted/20">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      AI can detect property type, price, area, location, BHK and more
                    </div>
                  </div>

                  {/* ===================================================
                INPUT ROW
            =================================================== */}

                  <div className="flex items-end gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      className="h-11 w-11 shrink-0 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>

                    <div className="flex-1">
                      <Textarea
                        value={intakeText}
                        onChange={(e) => setIntakeText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();

                            submitIntake();
                          }
                        }}
                        rows={2}
                        placeholder='Example: "3 BHK flat in Kondapur 1200 sqft for sale"'
                        className="resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none min-h-[52px]"
                        disabled={extracting}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={cn(
                        "h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition",
                        isListening
                          ? "bg-destructive text-destructive-foreground animate-pulse"
                          : "border border-border bg-background hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={submitIntake}
                      disabled={extracting || !intakeText.trim()}
                      className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-50"
                    >
                      {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* ===================================================
                FOOTER
            =================================================== */}

                  <div className="flex items-center justify-between px-4 pb-3">
                    <span className="text-[11px] text-muted-foreground">
                      Upload image, brochure, PDF or type manually
                    </span>

                    <button
                      type="button"
                      onClick={skipIntake}
                      disabled={extracting}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Skip intake
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* ===================================================
              FLOATING AI SUGGESTIONS
          =================================================== */}

                {field && !loadingNext && !done && field.input === "number" && value && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(() => {
                      const sType =
                        field.suggestionType ||
                        (/rent/i.test(field.id)
                          ? "rental_duration"
                          : /price|amount|cost|budget/i.test(field.id)
                            ? "price"
                            : /area|size|sqft|sqyd|land|plot|built/i.test(field.id)
                              ? "measurement_units"
                              : undefined);

                      let chips: any[] = [];

                      if (sType === "rental_duration") {
                        chips = getRentSuggestions(value, field.durations);
                      } else if (sType === "price" || sType === "price_per_unit") {
                        chips = getPriceSuggestions(value);
                      } else if (sType === "measurement_units") {
                        chips = getUnitSuggestions(
                          value,
                          (field.units && field.units.length
                            ? field.units
                            : ["Sq Ft", "Sq Yard", "Acre", "Gunta", "Cent"]) as PriceUnit[],
                        );
                      }

                      return chips.map((c: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => commitAnswer(c.value || c, c.label || String(c))}
                          className="px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs font-medium transition"
                        >
                          {c.label || String(c)}
                        </button>
                      ));
                    })()}
                  </div>
                )}

                {/* ===================================================
              MAIN INPUT
          =================================================== */}

                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => e.target.files && handleQuickImage(e.target.files)}
                />

                <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-end gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      className="h-11 w-11 shrink-0 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>

                    <div className="flex-1">
                      {/* DATE INPUT */}

                      {field?.input === "date" && (
                        <Input
                          type="date"
                          value={value || ""}
                          onChange={(e) => setValue(e.target.value)}
                          className="h-12 rounded-2xl"
                        />
                      )}

                      {/* TEXTAREA */}

                      {isMultiline ? (
                        <Textarea
                          value={value || ""}
                          onChange={(e) => setValue(e.target.value)}
                          rows={2}
                          placeholder="Type your answer..."
                          className="resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none min-h-[52px]"
                        />
                      ) : (
                        field?.input !== "date" && (
                          <Input
                            value={value || ""}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();

                                onNext();
                              }
                            }}
                            type={field?.input === "number" ? "number" : "text"}
                            placeholder="Type your answer..."
                            className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-11"
                          />
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={cn(
                        "h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition",

                        isListening
                          ? "bg-destructive text-destructive-foreground animate-pulse"
                          : "border border-border bg-background hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={onNext}
                      disabled={loadingNext}
                      className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-50"
                    >
                      {loadingNext ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* ===================================================
                FOOTER ACTIONS
            =================================================== */}

                <div className="flex items-center justify-between px-4 pb-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Back
                  </button>

                  {isOptional(field) && (
                    <button type="button" onClick={onSkip} className="text-[11px] text-primary hover:underline">
                      Skip
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Bubble — WhatsApp style
   ============================================================ */
function Bubble({ msg }: { msg: ChatMsg }) {
  if (msg.kind === "typing") {
    return (
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-card border border-border px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <Dot delay={0} />
          <Dot delay={0.15} />
          <Dot delay={0.3} />
        </div>
      </div>
    );
  }

  const isUser = msg.role === "user";
  const base = cn(
    "max-w-[80%] sm:max-w-[70%] px-3.5 py-2.5 shadow-sm text-sm break-words",
    isUser
      ? "bg-gradient-to-br from-primary to-emerald-500 text-white rounded-2xl rounded-br-sm"
      : "bg-card border border-border rounded-2xl rounded-bl-sm",
  );

  if (msg.kind === "image") {
    return (
      <div className={cn(base, "p-1.5")}>
        <img src={msg.url} alt="" className="rounded-xl max-h-64 object-cover" loading="lazy" decoding="async" />
        {msg.caption && <div className="px-2 py-1 text-xs opacity-90">{msg.caption}</div>}
      </div>
    );
  }

  return <div className={base}>{msg.text}</div>;
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
      animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
    />
  );
}

/* ============================================================
   Primary actions row (Back / Skip / Continue)
   ============================================================ */
function PrimaryActions({
  onNext,
  onSkip,
  onBack,
  optional,
  canBack,
  loading,
  nextLabel = "Continue",
}: {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  optional: boolean;
  canBack: boolean;
  loading: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={!canBack}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <div className="flex gap-2">
        {optional && (
          <Button variant="outline" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
        <Button size="sm" onClick={onNext} disabled={loading} className="bg-gradient-to-r from-primary to-emerald-500">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          {nextLabel} <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Price unit composer
   ============================================================ */
function PriceUnitComposer({
  value,
  onChange,
  onNext,
  onBack,
  canBack,
  loading,
}: {
  value: any;
  onChange: (v: any) => void;
  onNext: () => void;
  onBack: () => void;
  canBack: boolean;
  loading: boolean;
}) {
  const v = value && typeof value === "object" ? value : { unit: "sq ft", area: "", pricePerUnit: "" };
  const units = ["sq ft", "sq yard", "sq m", "gunta", "acre", "cent"];
  const total = Number(v.area) > 0 && Number(v.pricePerUnit) > 0 ? Number(v.area) * Number(v.pricePerUnit) : 0;
  const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {units.map((u) => {
          const active = v.unit === u;
          return (
            <button
              key={u}
              type="button"
              onClick={() => onChange({ ...v, unit: u })}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-primary/5 border-border",
              )}
            >
              {u}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder={`Area (${v.unit})`}
          value={v.area}
          onChange={(e) => onChange({ ...v, area: e.target.value })}
        />
        <Input
          type="number"
          placeholder={`₹ / ${v.unit}`}
          value={v.pricePerUnit}
          onChange={(e) => onChange({ ...v, pricePerUnit: e.target.value })}
        />
      </div>
      {total > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold text-primary">₹ {fmt(total)}</span>
        </div>
      )}
      <PrimaryActions
        onNext={onNext}
        onSkip={() => {}}
        onBack={onBack}
        optional={false}
        canBack={canBack}
        loading={loading}
      />
    </div>
  );
}
