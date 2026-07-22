import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { validatePropertyImage, validatePropertyRelevance, validatePropertyText } from "@/lib/validatePropertyFile";
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
import { usePendingPayment } from "@/hooks/usePendingPayment";
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
  Lightbulb,
  Pencil,
  MapPin,
  Home,
  Bath,
  Maximize2,
  Building2,
  Compass,
  Sofa,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import CityAutocomplete from "@/components/auth/CityAutocomplete";
import PlacesAutocompleteInput from "@/components/location/PlacesAutocompleteInput";
import GoogleMapPicker from "@/components/location/GoogleMapPicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { completionTier, missingRequired, answeredFields, NUMBER_QUICK_REPLIES } from "@/config/propertyFieldsConfig";
import { financialRequirementFlow } from "@/config/propertyFlows/financial";
import DocumentUploadWidget from "@/components/financial/DocumentUploadWidget";
import { createConversationEngine, type ConversationEngine } from "@/engines/conversationEngine";
import type { FieldDefinition, NextQuestionResult, PropertyCategory } from "@/engines/types";
import { getPriceSuggestions, getRentSuggestions, getUnitSuggestions, type PriceUnit } from "@/utils/suggestionEngine";
import { mapExtractedToEngineFields } from "@/engines/extractedFieldMapper";

const CORRECTION_RE = /\b(actually|change|instead|it'?s|correction|update|rather|sorry)\b/i;

/**
 * Canonical alias map (Phase 1 standardization).
 * Maps legacy/extracted field names → canonical IDs used by editForm,
 * the review screen, the edit modal, and the submit payload.
 *
 * Canonical IDs: bhk, bathrooms, bedrooms, balconies, property_type,
 * listing_type, area, area_unit, price_per_unit, total_price, land_size,
 * built_area, built_up_area, plot_area, property_age, ownership, facing,
 * gated_community.
 */
const CANONICAL_ALIASES: Record<string, string> = {
  bhk_type: "bhk",
  bathroom_count: "bathrooms",
  purpose: "listing_type",
  type: "property_type",
  sub_type: "property_type",
  flat_size: "area",
  property_facing: "facing",
  furnishing_status: "furnishing",
  ownership_type: "ownership",
  approval_type: "approvals",
  approval: "approvals",

  property_highlights: "highlights",
  coworking_highlights: "highlights",
  agriculture_highlights: "highlights",

  plot_area: "land_size",
  built_up_area: "built_area",
  floor: "floor_number",
  floors: "total_floors",

  assigned_agent: "assign_agent",
  assign_nearest_agent: "assign_agent",

  // Coworking engine IDs -> editForm canonical IDs
  shared_space_type: "workspace_types",
  currently_operating_as: "operating_as",
  industries_working_here: "industries",
  access_24x7: "access_24_7",

  // Misc
  facing_direction: "facing",
};

/**
 * Returns a copy of `src` with canonical field IDs populated from any
 * known aliases. Original keys are preserved so legacy reads keep working
 * during the transition; canonical reads now have a single source of truth.
 */
function toCanonical(src: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = { ...src };
  for (const [alias, canonical] of Object.entries(CANONICAL_ALIASES)) {
    const aliasVal = src[alias];
    const canonVal = out[canonical];
    if (
      (canonVal === undefined || canonVal === "" || canonVal === null) &&
      aliasVal !== undefined &&
      aliasVal !== "" &&
      aliasVal !== null
    ) {
      // For property_type, prefer first item if array
      if (canonical === "property_type" && Array.isArray(aliasVal)) {
        out[canonical] = aliasVal[0];
      } else {
        out[canonical] = aliasVal;
      }
    }
  }
  // Area aggregate fallback: if `area` still empty, derive from built/plot/land sizes.
  if (!out.area) {
    out.area = src.flat_size || src.built_area || src.built_up_area || src.plot_area || src.land_size || "";
  }
  if (!out.area_unit) out.area_unit = src.area_unit || "sq ft";
  return out;
}

/** Resolve any field id (alias or canonical) to its canonical id. */
function canonId(id?: string | null): string {
  if (!id) return "";
  return CANONICAL_ALIASES[id] || id;
}

/**
 * Numeric "count" fields that must be stored as integers across the entire
 * flow (AI answer -> canonical state -> editForm -> DB payload). The AI
 * suggestion chips append display suffixes like "3 Bathrooms" / "10 Floor" /
 * "15 Floors" — those strings break `<input type="number">` in the Edit
 * drawer, leaving the field visually empty. We coerce to plain integers at
 * every write boundary so the same key holds the same shape everywhere.
 */
const COUNT_FIELD_IDS = new Set<string>([
  "bathrooms",
  "bedrooms",
  "balconies",
  "floor_number",
  "total_floors",
  "parking_count",
  "total_parking",
  "seats",
  "cabins",
  "meeting_rooms",
  "conference_rooms",
  "total_plots",
  "total_units",
  "units",
  "total_towers",
  "towers",
  "total_flats",
  "total_villas",
  "total_shops",
  "total_rooms",
  "total_blocks",
  "total_buildings",
  "floors_per_tower",
]);

function toIntCount(v: any): number | "" {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const m = String(v).match(/\d+/);
  return m ? parseInt(m[0], 10) : "";
}

function coerceCountValue(fieldId: string, value: any): any {
  if (!COUNT_FIELD_IDS.has(canonId(fieldId))) return value;
  const n = toIntCount(value);
  return n === "" ? value : n;
}

/** Today (local) as YYYY-MM-DD for date comparison. */
function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isPastDate(input: any): boolean {
  if (!input) return false;
  const s = String(input).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return s < todayIsoDate();
}

/**
 * Cross-field business validation shared by the AI flow, the Edit drawer
 * Save action, and the final Submit. Returns the first error message or
 * `null` when the payload is valid.
 */
export function validateBusinessRules(data: Record<string, any>): string | null {
  const f = toIntCount(data.floor_number ?? data.floor);
  const t = toIntCount(data.total_floors ?? data.floors);
  if (typeof f === "number" && typeof t === "number" && f > t) {
    return "Floor number cannot be greater than total floors.";
  }
  if (isPastDate(data.possession_date)) {
    return "Please provide a valid future possession date.";
  }
  if (isPastDate(data.available_from) || isPastDate(data.available_from_date)) {
    return "Please provide a valid future availability date.";
  }
  return null;
}

/**
 * EDIT_FIELD_CONFIG (Phase 2)
 * ---------------------------------------------------------------
 * Single source of truth for the Edit Drawer. Each section renders
 * all its fields against `editForm` (canonical IDs only). Fields are
 * always editable — empty values are valid input affordances, not
 * filters. Custom blocks (Title, Area & Pricing, Location,
 * Description, Amenities) live outside this config because they have
 * bespoke UX (chips, AI regen, multi-input rows).
 */
export type EditFieldType = "text" | "number" | "select" | "textarea";
export interface EditFieldDef {
  id: string; // canonical id on editForm
  label: string;
  type: EditFieldType;
  placeholder?: string;
  options?: string[]; // for type === "select"
  colSpan?: 1 | 2; // grid span within the section (default 1)
  /** Hide this field for a given property category. Optional. */
  hideFor?: PropertyCategory[];
  /** Only show for these categories. Optional. */
  onlyFor?: PropertyCategory[];
}
export interface EditFieldSection {
  id: string;
  title: string;
  fields: EditFieldDef[];
}

export const EDIT_FIELD_CONFIG: EditFieldSection[] = [
  {
    id: "configuration",
    title: "Configuration",
    fields: [
      { id: "bhk", label: "BHK / Configuration", type: "text", placeholder: "e.g. 3 BHK", onlyFor: ["residential"] },
      { id: "bedrooms", label: "Bedrooms", type: "number", onlyFor: ["residential"] },
      { id: "bathrooms", label: "Bathrooms", type: "number", onlyFor: ["residential"] },
      { id: "balconies", label: "Balconies", type: "number", onlyFor: ["residential"] },
      { id: "property_type", label: "Property type", type: "text", hideFor: ["coworking"] },
      { id: "listing_type", label: "Listing type", type: "text", hideFor: ["coworking"] },
      { id: "listed_by", label: "Listed by", type: "text" },
      {
        id: "parking",
        label: "Parking",
        type: "text",
        placeholder: "e.g. 2 covered",
        onlyFor: ["residential", "commercial"],
      },
    ],
  },
  {
    id: "building",
    title: "Building & Floor",
    fields: [
      { id: "floor_number", label: "Floor number", type: "number", onlyFor: ["residential", "commercial"] },
      { id: "total_floors", label: "Total floors", type: "number", onlyFor: ["residential", "commercial"] },
      {
        id: "property_age",
        label: "Property age",
        type: "text",
        placeholder: "e.g. 5 years",
        onlyFor: ["residential", "commercial"],
      },
      { id: "land_size", label: "Land size", type: "text", hideFor: ["coworking"] },
      { id: "built_area", label: "Built area", type: "text", hideFor: ["plots", "agriculture"] },
      { id: "carpet_area", label: "Carpet area", type: "number", onlyFor: ["residential"] },
      { id: "project_name", label: "Project / Society", type: "text", colSpan: 2, onlyFor: ["residential", "plots"] },
    ],
  },
  {
    id: "furnishing",
    title: "Furnishing & Orientation",
    fields: [
      {
        id: "facing",
        label: "Facing",
        type: "select",
        options: ["", "East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"],
        hideFor: ["coworking"],
      },
      {
        id: "furnishing",
        label: "Furnishing",
        type: "select",
        options: ["", "Furnished", "Semi Furnished", "Unfurnished"],
        onlyFor: ["residential", "commercial"],
      },
    ],
  },
  {
    id: "ownership",
    title: "Ownership & Status",
    fields: [
      {
        id: "ownership",
        label: "Ownership",
        type: "select",
        options: ["", "Freehold", "Leasehold", "Co-operative Society", "Power of Attorney"],
        hideFor: ["coworking"],
      },
      {
        id: "gated_community",
        label: "Gated community",
        type: "select",
        options: ["", "Yes", "No"],
        onlyFor: ["residential", "plots"],
      },
      {
        id: "property_condition",
        label: "Property condition",
        type: "select",
        options: ["", "New", "Resale", "Under Construction"],
        onlyFor: ["residential", "commercial"],
      },
      {
        id: "availability_status",
        label: "Availability",
        type: "select",
        options: ["", "Ready to Move", "Under Construction"],
        onlyFor: ["residential", "commercial"],
      },
      {
        id: "possession_date",
        label: "Possession date",
        type: "text",
        placeholder: "MMM YYYY",
        onlyFor: ["residential", "commercial"],
      },
      {
        id: "available_from_date",
        label: "Available from",
        type: "text",
        placeholder: "MMM YYYY",
        onlyFor: ["residential", "commercial"],
      },
    ],
  },

  {
    id: "legal",
    title: "Legal & Features",
    fields: [
      { id: "approvals", label: "Approvals", type: "text", colSpan: 2 },
      { id: "amenities", label: "Amenities", type: "text", colSpan: 2, hideFor: ["coworking"] },
      { id: "payment_options", label: "Payment options", type: "text", colSpan: 2 },
      { id: "highlights", label: "Highlights", type: "text", colSpan: 2 },
      { id: "assign_agent", label: "Assigned agent", type: "text", colSpan: 2 },
    ],
  },

  {
    id: "charges",
    title: "Charges",
    fields: [
      { id: "maintenance_charges", label: "Maintenance (₹ / month)", type: "number" },
      { id: "security_deposit", label: "Security deposit (₹)", type: "number" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance",
    fields: [
      {
        id: "rera_number",
        label: "RERA number",
        type: "text",
        colSpan: 2,
        placeholder: "e.g. PRM/KA/RERA/...",
        onlyFor: ["residential", "commercial", "plots"],
      },
    ],
  },

  {
    id: "coworking",
    title: "Coworking Details",
    fields: [
      { id: "workspace_types", label: "Workspace Types", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "workspace_plan", label: "Workspace Plan", type: "text", onlyFor: ["coworking"] },
      { id: "access_24_7", label: "24/7 Access", type: "text", onlyFor: ["coworking"] },
      { id: "operating_as", label: "Operating As", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "community_type", label: "Community Type", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "suitable_for", label: "Suitable For", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "industries", label: "Industries", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "workspace_features", label: "Workspace Features", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "office_amenities", label: "Office Amenities", type: "text", colSpan: 2, onlyFor: ["coworking"] },
      { id: "available_from", label: "Available From", type: "text", onlyFor: ["coworking"] },
      { id: "working_hours", label: "Working Hours", type: "text", onlyFor: ["coworking"] },
      {
        id: "workspace_variant_details",
        label: "Workspace Variants",
        type: "textarea",
        colSpan: 2,
        onlyFor: ["coworking"],
      },
      { id: "hourly_price", label: "Hourly price (₹)", type: "number", onlyFor: ["coworking"] },
      { id: "daily_pass_price", label: "Daily pass (₹)", type: "number", onlyFor: ["coworking"] },
      { id: "weekly_price", label: "Weekly price (₹)", type: "number", onlyFor: ["coworking"] },
      { id: "monthly_rent", label: "Monthly rent (₹)", type: "number", onlyFor: ["coworking"] },
      { id: "price_per_seat", label: "Price per seat (₹)", type: "number", onlyFor: ["coworking"] },
    ],
  },

  {
    id: "plot_details",
    title: "Plot Details",
    fields: [
      { id: "plot_type", label: "Plot type", type: "text", onlyFor: ["plots"] },
      { id: "plot_size", label: "Plot size", type: "text", onlyFor: ["plots"] },
      { id: "road_width", label: "Road width", type: "text", onlyFor: ["plots"] },
      { id: "total_plots", label: "Total plots", type: "number", onlyFor: ["plots"] },
      { id: "total_project_area", label: "Total project area", type: "text", onlyFor: ["plots"] },
      { id: "plot_measurements", label: "Plot measurements", type: "text", colSpan: 2, onlyFor: ["plots"] },
      {
        id: "additional_features",
        label: "Additional features",
        type: "text",
        colSpan: 2,
        onlyFor: ["plots", "agriculture"],
      },
    ],
  },

  {
    id: "agriculture_details",
    title: "Agriculture Details",
    fields: [
      { id: "agricultural_land_type", label: "Land type", type: "text", onlyFor: ["agriculture"] },
      { id: "land_area", label: "Land area", type: "text", onlyFor: ["agriculture"] },
      { id: "soil_type", label: "Soil type", type: "text", onlyFor: ["agriculture"] },
      { id: "electricity_available", label: "Electricity available", type: "text", onlyFor: ["agriculture"] },
      { id: "current_usage", label: "Current usage", type: "text", colSpan: 2, onlyFor: ["agriculture"] },
      { id: "crops_grown", label: "Crops grown", type: "text", colSpan: 2, onlyFor: ["agriculture"] },
      { id: "farm_infrastructure", label: "Farm infrastructure", type: "text", colSpan: 2, onlyFor: ["agriculture"] },
      { id: "connectivity", label: "Connectivity", type: "text", colSpan: 2, onlyFor: ["agriculture"] },
      {
        id: "partnership_details",
        label: "Partnership details",
        type: "textarea",
        colSpan: 2,
        onlyFor: ["agriculture"],
      },
    ],
  },

  {
    id: "commercial_details",
    title: "Commercial Details",
    fields: [
      { id: "operating_as", label: "Currently operating as", type: "text", colSpan: 2, onlyFor: ["commercial"] },
      { id: "suitable_for", label: "Suitable for", type: "text", colSpan: 2, onlyFor: ["commercial"] },
      { id: "commercial_amenities", label: "Commercial amenities", type: "text", colSpan: 2, onlyFor: ["commercial"] },
      {
        id: "commercial_furnishing",
        label: "Commercial furnishing",
        type: "text",
        colSpan: 2,
        onlyFor: ["commercial"],
      },
      { id: "visibility_access", label: "Visibility & access", type: "text", colSpan: 2, onlyFor: ["commercial"] },
      {
        id: "business_space_details",
        label: "Business space details",
        type: "textarea",
        colSpan: 2,
        onlyFor: ["commercial"],
      },
    ],
  },

  {
    id: "pricing_extras",
    title: "Pricing",
    fields: [
      {
        id: "rent_amount",
        label: "Rent amount (₹)",
        type: "number",
        onlyFor: ["residential", "commercial", "plots", "agriculture"],
      },
      { id: "monthly_rent", label: "Monthly rent (₹)", type: "number", onlyFor: ["residential"] },
    ],
  },
];

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
  const area = s.area || s.built_area || s.land_size || s.carpet_area || s.shop_area;
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
const BHK_PATTERN = /^\d+(\.\d+)?\s?(BHK)$/i;

const PRICE_UNIT_PATTERN = /^(₹?\s?\d+(,\d+)?)(\s)?(per|\/)(\s)?(sqft|sq ft|sqyd|sq yd)$/i;
const BATHROOM_PATTERN = /^\d+(\+)?\s?(bathroom|bathrooms)$/i;
const FLOOR_PATTERN = /^(\d+)(st|nd|rd|th)?\s?floor$|^ground floor$|^\d+\s?floors$/i;
const MEASUREMENT_PATTERN = /^(\d+(?:\.\d+)?)\s?(sq\s?ft|sqft|sq\s?yd|sqyd|sq\s?m|sqm|acre|acres|gunta|cent)$/i;

const getBhkSuggestions = (input: string) => {
  if (!input) return [];

  const num = input.replace(/[^\d.]/g, "");

  if (!num) return [];

  return [`${num} bhk`];
};

const getPlotSuggestions = (input: string) => {
  if (!/^\d+$/.test(input)) return [];

  return [`${input} Plots`];
};

const COUNT_FIELD_LABELS: Record<string, { singular: string; plural: string }> = {
  total_towers: { singular: "Tower", plural: "Towers" },
  towers: { singular: "Tower", plural: "Towers" },
  floors_per_tower: { singular: "Floor", plural: "Floors" },
  total_units: { singular: "Unit", plural: "Units" },
  units: { singular: "Unit", plural: "Units" },
  total_flats: { singular: "Flat", plural: "Flats" },
  total_villas: { singular: "Villa", plural: "Villas" },
  total_shops: { singular: "Shop", plural: "Shops" },
  total_blocks: { singular: "Block", plural: "Blocks" },
  total_buildings: { singular: "Building", plural: "Buildings" },
  total_rooms: { singular: "Room", plural: "Rooms" },
  total_cabins: { singular: "Cabin", plural: "Cabins" },
  total_seats: { singular: "Seat", plural: "Seats" },
  total_desks: { singular: "Desk", plural: "Desks" },
};

const getCountSuggestions = (input: unknown, fieldId: string): string[] => {
  // Defensive: input may arrive as number/null/undefined when an answered
  // count field (e.g. total_towers stored as integer) is re-loaded into the
  // input via setValue(existing). Coerce to string before regex.
  if (input === null || input === undefined) return [];
  const str = typeof input === "string" ? input : String(input);
  const match = str.match(/^\d+/);
  if (!match) return [];

  const num = match[0];
  const cfg = COUNT_FIELD_LABELS[fieldId];

  // If no config for this field, return empty (no suggestions)
  if (!cfg) return [];

  const n = parseInt(num, 10);
  return [`${num} ${n === 1 ? cfg.singular : cfg.plural}`];
};

const getPriceUnitSuggestions = (input: string) => {
  if (!/^\d+$/.test(input)) return [];

  return [`₹${input} / sqft`, `₹${input} / sq yd`, `₹${input} / acre`, `₹${input} / gunta`, `₹${input} / cent`];
};

const getBathroomSuggestions = (input: string) => {
  if (!/^\d+(\+)?$/.test(input)) return [];

  return [`${input} ${input === "1" ? "Bathroom" : "Bathrooms"}`];
};

const getFloorSuggestions = (input: string, type: "single" | "total" = "single") => {
  if (!/^\d+(\+)?$/.test(input)) return [];

  // ============================================
  // TOTAL FLOORS
  // ============================================

  if (type === "total") {
    return [`${input} Floors`];
  }

  // ============================================
  // SINGLE FLOOR
  // ============================================

  const num = Number(input);

  const suffix =
    num % 10 === 1 && num !== 11
      ? "st"
      : num % 10 === 2 && num !== 12
        ? "nd"
        : num % 10 === 3 && num !== 13
          ? "rd"
          : "th";

  return [`${num}${suffix} Floor`];
};

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
  const fid = canonId(field.id);
  if (fid === "bhk") {
    if (!BHK_PATTERN.test(String(value).trim())) {
      return "Please enter format like 3 BHK";
    }
  }

  if (fid === "price_per_unit") {
    if (!PRICE_UNIT_PATTERN.test(String(value).trim())) {
      return "Please enter format like ₹6000/sqft";
    }
  }

  // ============================================
  // TOTAL PRICE VALIDATION
  // ============================================

  if (fid === "total_price") {
    const text = String(value).toLowerCase().trim();

    // plain number
    const numeric = Number(text.replace(/[^\d.]/g, ""));

    // accepted words
    const hasCurrencyWord =
      text.includes("cr") ||
      text.includes("crore") ||
      text.includes("lakh") ||
      text.includes("lac") ||
      text.includes("million") ||
      text.includes("billion") ||
      text.includes("k");

    // reject tiny meaningless values
    if (!hasCurrencyWord && numeric < 1000) {
      return "Please enter a valid property price";
    }

    // reject invalid text
    if (isNaN(numeric) || numeric <= 0) {
      return "Please enter a valid property price";
    }
  }

  if (fid === "bathrooms") {
    const txt = String(value).trim();

    if (!/^\d+$/.test(txt) && !BATHROOM_PATTERN.test(txt)) {
      return "Please enter valid bathrooms count";
    }
  }
  if (fid === "floor_number") {
    const txt = String(value).trim();
    if (!/^\d+$/.test(txt) && !FLOOR_PATTERN.test(txt)) {
      return "Please enter valid floor";
    }
  }

  if (fid === "total_floors") {
    const txt = String(value).trim();
    if (!/^\d+$/.test(txt) && !FLOOR_PATTERN.test(txt)) {
      return "Please enter valid total floors";
    }
  }
  // ============================================
  // AREA VALIDATION
  // ============================================

  const AREA_FIELDS = [
    "area",
    "built_area",
    "built_up_area",
    "land_size",
    "plot_area",
    "plot_size",
    "road_width",
    "total_project_area",
    "carpet_area",
  ];

  const AREA_UNITS = ["sq ft", "sqft", "sq yd", "sqyd", "sq m", "sqm", "acre", "acres", "gunta", "cent"];

  if (AREA_FIELDS.includes(canonId(field.id))) {
    const text = String(value).toLowerCase().trim();

    const hasNumber = /\d/.test(text);

    const hasUnit = AREA_UNITS.some((u) => text.includes(u));

    if (!hasNumber || !hasUnit) {
      return "Please enter area with unit (example: 1000 Sq Ft)";
    }
  }

  // ============================================
  // TOTAL PLOTS VALIDATION
  // ============================================

  if (canonId(field.id) === "total_plots") {
    if (!/^\d+\s?plots?$/i.test(String(value).trim())) {
      return "Please enter value like 100 Plots";
    }
  }
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

function normalizeToArray(value: any): string[] {
  // already array
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  // comma separated string
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  // everything else
  return [];
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
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  // Guards against fetchNext() appending the same AI question twice for the
  // same resolved field (e.g. after editing a previously answered question).
  const lastAskedFieldIdRef = useRef<string | null>(null);
  const fetchNextCallCountRef = useRef<Record<string, number>>({});

  // Add the pending payment hook
  const { processPendingPayment, hasPending } = usePendingPayment();

  useEffect(() => {
    if (!field) return;
    const fid = canonId(field.id);

    // ============================================
    // BHK Suggestions
    // ============================================

    if (fid === "bhk" && typeof value === "string") {
      setSuggestions(getBhkSuggestions(value));
      return;
    }

    // ============================================
    // PRICE UNIT Suggestions
    // ============================================

    if (fid === "price_per_unit" && typeof value === "string") {
      setSuggestions(getPriceUnitSuggestions(value));
      return;
    }

    if (fid === "bathrooms" && typeof value === "string") {
      setSuggestions(getBathroomSuggestions(value));

      return;
    }
    if (fid === "floor_number" && typeof value === "string") {
      setSuggestions(getFloorSuggestions(value, "single"));

      return;
    }

    if (fid === "total_floors" && typeof value === "string") {
      setSuggestions(getFloorSuggestions(value, "total"));

      return;
    }

    // ============================================
    // TOWER FIELDS Suggestions - ADDED FIX
    // ============================================
    if ((fid === "total_towers" || fid === "towers") && typeof value === "string") {
      const num = value.replace(/[^\d]/g, "");
      if (num && /^\d+$/.test(num)) {
        const n = parseInt(num, 10);
        setSuggestions([`${num} ${n === 1 ? "Tower" : "Towers"}`]);
      } else {
        setSuggestions([]);
      }
      return;
    }

    if (fid === "floors_per_tower" && typeof value === "string") {
      const num = value.replace(/[^\d]/g, "");
      if (num && /^\d+$/.test(num)) {
        const n = parseInt(num, 10);
        setSuggestions([`${num} ${n === 1 ? "Floor" : "Floors"}`]);
      } else {
        setSuggestions([]);
      }
      return;
    }

    // ============================================
    // COUNT FIELDS Suggestions (total_units, units, total_flats, etc.)
    // ============================================
    const countChips = getCountSuggestions(value, fid);
    if (countChips.length) {
      setSuggestions(countChips);
      return;
    }

    if (typeof value === "string") {
      const num = value.trim();

      if (/^\d+$/.test(num)) {
        // Built Area / Flat Size / Carpet Area
        if (
          fid === "area" ||
          fid === "built_area" ||
          fid === "built_up_area" ||
          fid === "carpet_area" ||
          fid === "plot_area" ||
          fid === "plot_size" ||
          fid === "road_width" ||
          fid === "total_project_area"
        ) {
          setSuggestions([]);
          return;
        }
      }

      setSuggestions([]);
    }
  }, [value, field]);
  const [error, setError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<{ field: FieldDef; value: any }[]>([]);
  const [uploading, setUploading] = useState(false);

  const AREA_FIELDS = [
    "area",
    "built_area",
    "built_up_area",
    "land_size",
    "plot_area",
    "plot_size",
    "road_width",
    "total_project_area",
    "carpet_area",
  ];

  const currentFieldId = field ? canonId(field.id) : "";

  const isAreaField = AREA_FIELDS.includes(currentFieldId);

  const hasValidAreaUnit =
    typeof value === "string" && /\d/.test(value) && /(sq\s*ft|sqft|sq\s*yd|sqyd|acre|acres|gunta|cent)/i.test(value);

  const disableSendForArea = isAreaField && typeof value === "string" && value.trim().length > 0 && !hasValidAreaUnit;

  const PRICE_FIELDS = ["monthly_rent", "rent", "total_price", "price_per_unit"];

  const isPriceField = PRICE_FIELDS.includes(currentFieldId);

  const hasValidPriceFormat =
    typeof value === "string" &&
    (/₹/.test(value) ||
      /monthly/i.test(value) ||
      /weekly/i.test(value) ||
      /daily/i.test(value) ||
      /yearly/i.test(value) ||
      /sq\s*ft/i.test(value) ||
      /sqft/i.test(value) ||
      /sq\s*yd/i.test(value));

  const disableSendForPrice =
    isPriceField && typeof value === "string" && value.trim().length > 0 && !hasValidPriceFormat;

  /* Intake (first free-form description) */
  const [intakeDone, setIntakeDone] = useState(false);
  const [intakeText, setIntakeText] = useState("");
  const [extracting, setExtracting] = useState(false);

  /* Smart hint per question (locality-aware AI tip) */
  const [smartHint, setSmartHint] = useState<string | null>(null);

  /* AI titles + review */
  const [aiTitles, setAiTitles] = useState<{ type: string; label: string; title: string }[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [posterTitle, setPosterTitle] = useState<string>("");

  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [verificationRequested, setVerificationRequested] = useState<boolean>(true);

  const openEditSheet = () => {
    const canonical = toCanonical(state);
    // Coerce count fields so <input type="number"> shows the value.
    const coerced: Record<string, any> = { ...canonical };
    for (const id of COUNT_FIELD_IDS) {
      if (coerced[id] !== undefined && coerced[id] !== null && coerced[id] !== "") {
        const n = toIntCount(coerced[id]);
        if (n !== "") coerced[id] = n;
      }
    }
    setEditForm({
      ...coerced,

      title: aiTitles[selectedTitleIdx || 0]?.title || coerced.title || "",

      description: coerced.description || buildPropertyDescription(coerced),
    });

    setShowEditSheet(true);
  };

  const saveEditedDetails = async () => {
    const updated = {
      ...state,
      ...editForm,
    };

    // Block Save when business rules fail (floor/total_floors, dates).
    const ruleError = validateBusinessRules(updated);
    if (ruleError) {
      toast.error(ruleError);
      return;
    }

    setState(updated);

    try {
      engineRef.current?.applyExtractedFields(updated, {
        overwrite: true,
      });
    } catch {}

    setShowEditSheet(false);

    toast.success("Property details updated");
  };

  /* Section-level edit toggles for preview-first review screen */
  const [editSection, setEditSection] = useState<null | "basic" | "description" | "location" | "price" | "amenities">(
    null,
  );
  const [descExpanded, setDescExpanded] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");
  const [showEditSheet, setShowEditSheet] = useState(false);

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
    { id: "financial", label: "Financial", emoji: "💰" },
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

  const regenerateTitles = async () => {
    setTitlesLoading(true);
    try {
      const { data } = await supabase.functions.invoke<{
        titles: { type: string; label: string; title: string }[];
      }>("ai-generate-titles", { body: { state, extracted_title: posterTitle || state.title || "" } });
      const t = data?.titles || [];
      setAiTitles(t);

      if (t.length > 0) {
        if (selectedTitleIdx === null) {
          setSelectedTitleIdx(0);
        }

        setEditForm((p) => ({
          ...p,
          title: p.title && p.title.trim() !== "" ? p.title : t[0].title,
        }));
      }
    } catch (e) {
      console.error("regenerateTitles failed", e);
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
              ? `✨ I understood ${newlyFilled} property detail${newlyFilled === 1 ? "" : "s"} automatically.`
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
      await fetchNext(merged, true);
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

        // ============================================
        // IMPORTANT
        // INITIALIZE REVIEW FORM
        // ============================================

        // ============================================
        // PREPARE COMPLETE EDIT FORM
        // ============================================

        const canonicalState = toCanonical(currentState);

        console.log("COWORKING DATA", {
          workspace_types: canonicalState.workspace_types,
          workspace_plan: canonicalState.workspace_plan,
          workspace_configuration: canonicalState.workspace_configuration,
          workspace_features: canonicalState.workspace_features,
          office_amenities: canonicalState.office_amenities,
          operating_as: canonicalState.operating_as,
          industries: canonicalState.industries,
          community_type: canonicalState.community_type,
          suitable_for: canonicalState.suitable_for,
          access_24_7: canonicalState.access_24_7,
          available_from: canonicalState.available_from,
        });
        setEditForm({
          ...canonicalState,

          // ============================================
          // BASIC INFO
          // ============================================

          title: canonicalState.title || aiTitles[0]?.title || "",

          description: canonicalState.description || buildPropertyDescription(canonicalState),

          property_type: canonicalState.property_type || "",

          residential_type: canonicalState.residential_type || "",

          listing_type: canonicalState.listing_type || "",

          ownership: canonicalState.ownership || "",

          property_condition: canonicalState.property_condition || "",

          property_age: canonicalState.property_age || "",

          // ============================================
          // COWORKING
          // ============================================

          workspace_types: canonicalState.workspace_types || [],

          workspace_plan: canonicalState.workspace_plan || canonicalState.listing_type || "",

          workspace_configuration: canonicalState.workspace_configuration || {},

          workspace_features: canonicalState.workspace_features || [],

          office_amenities: canonicalState.office_amenities || [],

          operating_as: canonicalState.operating_as || "",

          industries: canonicalState.industries || [],

          community_type: canonicalState.community_type || "",

          suitable_for: canonicalState.suitable_for || [],

          access_24_7: canonicalState.access_24_7 || "",

          available_from: canonicalState.available_from || "",

          // ============================================
          // CONFIGURATION
          // ============================================

          bhk: canonicalState.bhk || "",

          bedrooms: toIntCount(canonicalState.bedrooms) || "",

          bathrooms: toIntCount(canonicalState.bathrooms ?? canonicalState.bathroom_count) || "",

          balconies: toIntCount(canonicalState.balconies) || "",

          furnishing: canonicalState.furnishing || "",

          furnishing_items: Array.isArray(canonicalState.furnishing_items) ? canonicalState.furnishing_items : [],

          facing: canonicalState.facing || "",

          gated_community: canonicalState.gated_community ?? "",

          // ============================================
          // AREA
          // ============================================

          floor_number: toIntCount(canonicalState.floor_number ?? canonicalState.floor) || "",

          total_floors: toIntCount(canonicalState.total_floors ?? canonicalState.floors) || "",

          land_size: canonicalState.land_size || canonicalState.plot_area || "",

          built_area: canonicalState.built_area || canonicalState.built_up_area || canonicalState.flat_size || "",

          built_up_area: canonicalState.built_up_area || canonicalState.built_area || "",

          plot_area: canonicalState.plot_area || canonicalState.land_size || "",

          area:
            canonicalState.area ||
            canonicalState.built_area ||
            canonicalState.built_up_area ||
            canonicalState.flat_size ||
            canonicalState.land_size ||
            canonicalState.plot_area ||
            "",

          area_unit: canonicalState.area_unit || "sq ft",

          plot_measurements: canonicalState.plot_measurements || {},

          // ============================================
          // PRICE
          // ============================================

          total_price: canonicalState.total_price || "",

          price_per_unit: canonicalState.price_per_unit || "",

          // ============================================
          // FEATURES
          // ============================================

          amenities: Array.isArray(canonicalState.amenities) ? canonicalState.amenities : [],

          approvals: normalizeToArray(canonicalState.approvals),

          highlights: normalizeToArray(canonicalState.highlights),

          payment_options: normalizeToArray(canonicalState.payment_options),

          // ============================================
          // LOCATION
          // ============================================

          locality: canonicalState.locality || "",
          city: canonicalState.city || "",
          address: canonicalState.address || "",

          // ============================================
          // AGENT
          // ============================================

          assign_agent: canonicalState.assign_agent || "",
        });

        // ============================================
        // AUTO GENERATE TITLES
        // ============================================

        setTimeout(() => {
          if (category !== "financial") regenerateTitles();
        }, 100);

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

      // Debug: track how many times fetchNext resolves to the same field.
      fetchNextCallCountRef.current[fieldId] = (fetchNextCallCountRef.current[fieldId] || 0) + 1;
      console.log("[fetchNext] resolved field", {
        fieldId,
        callCountForField: fetchNextCallCountRef.current[fieldId],
        lastAskedFieldId: lastAskedFieldIdRef.current,
      });

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
      // ============================================
      // SMART SUGGESTIONS
      // ============================================

      if (smartSuggestions?.examples?.length) {
        setSuggestions(smartSuggestions.examples);
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
      // - Guard: do not append the same question twice if the
      //   resolver returned the same fieldId we just asked
      //   (can happen after editing a previously answered field).
      // =======================================================

      if (lastAskedFieldIdRef.current === fieldId) {
        console.log("[fetchNext] duplicate question suppressed", { fieldId });
      } else {
        lastAskedFieldIdRef.current = fieldId;
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "ai",
            kind: "text",
            text: result.question?.prompt || ui.question,
          },
        ]);
      }
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

    const isEditing = !!editingFieldId && canonId(editingFieldId) === canonId(f.id);

    console.log("[commitAnswer] start", {
      currentFieldId: f.id,
      editingFieldId,
      isEditing,
      rawValue: val,
    });

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

    let userMessage = displayText ?? formatAnswer(f, normalized);

    // =========================================================
    // WIDGET PROTECTION
    // =========================================================

    if ((f.type === "workspace_configuration_widget" || f.input === "workspace_configuration_widget") && !displayText) {
      userMessage = "Workspace configuration added";
    }

    setMessages((m) => {
      // When editing, replace the prior user message for this field instead of appending a duplicate
      if (isEditing) {
        const idx = [...m]
          .reverse()
          .findIndex((msg: any) => msg.role === "user" && msg.fieldId && canonId(msg.fieldId) === canonId(f.id));
        if (idx !== -1) {
          const realIdx = m.length - 1 - idx;
          const copy = [...m];
          copy[realIdx] = { ...(copy[realIdx] as any), text: userMessage, fieldId: f.id } as any;
          return copy;
        }
      }
      return [
        ...m,
        {
          id: uid(),
          role: "user",
          kind: "text",
          text: userMessage,
          fieldId: f.id,
        } as any,
      ];
    });

    // =========================================================
    // NEW STATE
    // =========================================================

    const canonicalFieldId = canonId(f.id);

    // ============================================
    // FIELDS THAT SHOULD SKIP TEXT VALIDATION
    // These are count fields (towers, floors, units, etc.) that
    // contain numbers + words (e.g. "3 Towers", "10 Floors")
    // which would otherwise fail validatePropertyText().
    // ============================================
    const SKIP_VALIDATION_FIELDS = [
      "city",
      "locality",
      "project_name",
      "assign_agent",
      "possession_date",
      "available_from_date",

      "property_age",
      "ownership",
      "facing",
      "furnishing",

      "approvals",
      "highlights",
      "payment_options",
      "parking",

      // AREA
      "area",
      "built_area",
      "built_up_area",
      "land_size",
      "plot_area",
      "carpet_area",

      // FLOORS
      "floor_number",
      "total_floors",

      // COMMERCIAL
      "business_space_details",
      "workspace_configuration",
      "workspace_configuration_details",

      // PRICE
      "total_price",
      "price_per_unit",
      "rent",
      "monthly_rent",

      // NUMERIC PROPERTY FIELDS
      "seats",
      "cabins",
      "meeting_rooms",
      "conference_rooms",

      // TOWER AND COUNT FIELDS - FIX FOR THE ERROR
      "total_towers",
      "towers",
      "floors_per_tower",
      "total_units",
      "units",
      "total_flats",
      "total_villas",
      "total_shops",
      "total_blocks",
      "total_buildings",
      "total_rooms",
      "total_cabins",
      "total_seats",
      "total_desks",
    ];

    // CRITICAL FIX: Determine if we should run text validation
    // We only validate if:
    // 1. The input is a string
    // 2. The field's input type is "text" or "textarea" (not number, date, etc.)
    // 3. The field is NOT in our skip list
    const isTextLikeField = f.input === "text" || f.input === "textarea";
    const shouldSkipValidation = SKIP_VALIDATION_FIELDS.includes(canonicalFieldId);
    const shouldValidate =
      typeof normalized === "string" && normalized.trim().length > 2 && isTextLikeField && !shouldSkipValidation;

    console.log("[commitAnswer] validation check", {
      normalized,
      isTextLikeField,
      shouldSkipValidation,
      shouldValidate,
      canonicalFieldId,
    });

    if (shouldValidate) {
      const validation = validatePropertyText(normalized);

      if (!validation.valid) {
        console.log("[commitAnswer] validation failed", validation);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "ai",
            kind: "text",
            text: "Please provide property-related information so I can continue the listing process.",
          },
        ]);

        return;
      }
    }

    const finalFieldId = f.type === "plot_measurement_widget" ? "plot_measurements" : canonicalFieldId;

    // ============================================
    // FIELD-NAME STANDARDIZATION
    // Coerce count-style fields (bathrooms, floor_number, total_floors, …)
    // to plain integers so the same key holds the same shape in chat
    // state, editForm, and the DB payload. Prevents the "empty Edit
    // input" bug where "3 Bathrooms" / "10 Floor" string suffixes break
    // <input type="number">.
    // ============================================
    normalized = coerceCountValue(canonicalFieldId, normalized);

    // Diagnostic: log tower/units pipeline so we can trace any future crash.
    if (
      canonicalFieldId === "total_towers" ||
      canonicalFieldId === "towers" ||
      canonicalFieldId === "floors_per_tower" ||
      canonicalFieldId === "total_units" ||
      canonicalFieldId === "units"
    ) {
      console.log("[commitAnswer] tower/units processed", {
        fieldId: f.id,
        canonicalFieldId,
        rawValue: val,
        displayText,
        normalized,
        typeofNormalized: typeof normalized,
      });
    }

    // ============================================
    // BUSINESS-RULE VALIDATION (AI flow)
    // ============================================
    if (canonicalFieldId === "floor_number" || canonicalFieldId === "total_floors") {
      const merged = { ...state, [canonicalFieldId]: normalized };
      const err = validateBusinessRules(merged);
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (canonicalFieldId === "possession_date" && isPastDate(normalized)) {
      toast.error("Please provide a valid future possession date.");
      return;
    }
    if (
      (canonicalFieldId === "available_from" || canonicalFieldId === "available_from_date") &&
      isPastDate(normalized)
    ) {
      toast.error("Please provide a valid future availability date.");
      return;
    }

    const newState = {
      ...state,

      [f.id]: normalized,

      [finalFieldId]: normalized,
    };

    // =========================================================
    // HISTORY
    // =========================================================

    setHistory((h) => {
      const existingIndex = h.findIndex((x) => canonId(x.field.id) === canonId(f.id));

      console.log("[commitAnswer] history before update", {
        length: h.length,
        existingIndex,
        ids: h.map((x) => x.field.id),
      });

      let next: typeof h;
      // Editing an already answered question — replace in place, never append
      if (existingIndex >= 0) {
        const copy = [...h];
        copy[existingIndex] = { field: f, value: normalized };
        next = copy;
      } else {
        next = [...h, { field: f, value: normalized }];
      }

      console.log("[commitAnswer] history after update", {
        length: next.length,
        ids: next.map((x) => x.field.id),
      });

      return next;
    });

    // =========================================================
    // SAVE STATE
    // =========================================================

    setState(newState);

    setError(null);

    // =========================================================
    // APPLY ENGINE ANSWER
    // =========================================================

    try {
      engineRef.current?.applyAnswer(canonicalFieldId, normalized);
    } catch {}

    // =========================================================
    // Clear edit mode AFTER applying the answer so fetchNext
    // resumes from the first unanswered field (preserves Q4..Qn).
    // =========================================================

    if (isEditing) {
      setEditingFieldId(null);
    }

    setValue("");

    // NOTE: Do NOT reset lastAskedFieldIdRef here. If the resolver returns
    // the same active question (common after editing an earlier answer
    // while a later question is already on-screen), the guard inside
    // fetchNext must suppress re-appending it.
    console.log("[commitAnswer] before fetchNext", {
      isEditing,
      lastAskedFieldId: lastAskedFieldIdRef.current,
    });

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

    setHistory((h) => {
      const existingIndex = h.findIndex((x) => canonId(x.field.id) === canonId(field.id));

      if (existingIndex >= 0) {
        const copy = [...h];

        copy[existingIndex] = {
          field,
          value: null,
        };

        return copy;
      }

      return [
        ...h,
        {
          field,
          value: null,
        },
      ];
    });

    // =========================================================
    // NEW STATE
    // IMPORTANT
    // REMOVE FIELD
    // =========================================================

    const newState = {
      ...state,
    };

    const canonicalFieldId = canonId(skippedId);

    delete newState[skippedId];
    delete newState[canonicalFieldId];

    if (field.type === "plot_measurement_widget") {
      delete newState["plot_measurements"];
    }

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
   BACK - UPDATED to go to category selector
=========================================================== */

  const onBack = async () => {
    // If we're in the review screen (done === true), go back to the last question
    if (done) {
      setDone(false);
      // Remove the "review" messages
      setMessages((m) => {
        const copy = [...m];
        while (copy.length && copy[copy.length - 1].role === "ai") {
          copy.pop();
        }
        return copy;
      });
      if (history.length > 0) {
        const last = history[history.length - 1];
        setField(last.field);
        setValue(last.value ?? "");
      }
      return;
    }

    // If we're in the intake bar (after category selected, before any questions answered)
    if (intakeDone && history.length === 0 && !done) {
      // Go back to category selection (2nd image)
      setCategory(null);
      setIntakeDone(false);
      setDone(false);
      setField(null);
      setState({});
      setHistory([]);
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
      engineRef.current = null;
      return;
    }

    // If no history, go back to category selection
    if (history.length === 0) {
      setCategory(null);
      setIntakeDone(false);
      setDone(false);
      setField(null);
      setState({});
      setHistory([]);
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
      engineRef.current = null;
      return;
    }

    const prev = history[history.length - 1];

    setHistory(history.slice(0, -1));

    const cleared = { ...state };
    const canonicalFieldId = canonId(prev.field.id);
    delete cleared[prev.field.id];
    delete cleared[canonicalFieldId];

    if (prev.field.type === "plot_measurement_widget") {
      delete cleared["plot_measurements"];
    }

    setState(cleared);
    setDone(false);

    setMessages((m) => {
      const copy = [...m];
      while (copy.length && copy[copy.length - 1].role === "ai") {
        copy.pop();
      }
      if (copy.length && copy[copy.length - 1].role === "user") {
        copy.pop();
      }
      return copy;
    });

    try {
      const engine = engineRef.current;
      if (engine) {
        const s = engine.getState();
        s.skipped = s.skipped.filter((id) => id !== prev.field.id);
      }
    } catch {}

    engineRef.current = createConversationEngine(category!);
    lastAskedFieldIdRef.current = null;
    fetchNextCallCountRef.current = {};
    engineRef.current.applyExtractedFields(cleared, { overwrite: true });

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
        const imageUrl = await fileToDataUrl(file);

        const imageValidation = await validatePropertyImage(imageUrl);

        if (!imageValidation.valid) {
          setMessages((m) => m.filter((x) => x.id !== bubbleId));

          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "ai",
              kind: "text",
              text: "This image doesn't appear related to a property listing. Please upload property photos, brochures, layouts, floor plans, or interiors.",
            },
          ]);

          return;
        }
        // Show user's image bubble immediately so chat is not "blocked"
        const previewUrl = URL.createObjectURL(file);
        setMessages((m) => {
          // insert image bubble BEFORE the typing bubble
          const idx = m.findIndex((x) => x.id === bubbleId);
          const imgMsg: ChatMsg = { id: uid(), role: "user", kind: "image", url: previewUrl };
          if (idx === -1) return [...m, imgMsg];
          return [...m.slice(0, idx), imgMsg, ...m.slice(idx)];
        });

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
          imageUrl: previewUrl,
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

      // ============================================
      // VALIDATE PROPERTY DOCUMENT RELEVANCE
      // ============================================

      if (extracted && extracted.length > 20) {
        const relevance = await validatePropertyRelevance(extracted);

        if (!relevance.valid) {
          setMessages((m) => m.filter((x) => x.id !== bubbleId));

          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "ai",
              kind: "text",
              text:
                relevance.reason ||
                "This document doesn't appear related to a property listing. Please upload property brochures, layouts, floor plans, or real-estate documents.",
            },
          ]);

          return;
        }

        // ============================================
        // LOW CONFIDENCE WARNING
        // ============================================

        if (relevance.confidence < 0.15) {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "ai",
              kind: "text",
              text: "I found limited property-related information in this document. I'll still try to extract details, but some data may be incomplete.",
            },
          ]);
        }
      }

      if (extracted && extracted.length >= 20) {
        const combined = [intakeText.trim(), extracted].filter(Boolean).join("\n\n");
        await runAiExtraction({ text: combined, appendUserText: false, sharedTypingId: bubbleId });
        return;
      }

      // ============================================
      // OCR EXTRACTION FAILED
      // STOP INVALID DOCUMENT FLOW
      // ============================================

      // ============================================
      // OCR TEXT NOT DETECTED
      // TRY PDF IMAGE EXTRACTION FALLBACK
      // ============================================

      if (!extracted || extracted.length < 20) {
        // ============================================
        // PDF IMAGE FALLBACK
        // ============================================

        if (isPdf) {
          const pageImages = await renderPdfPagesToImages(file);

          if (pageImages.length > 0) {
            await runAiExtraction({
              text: intakeText || "Extract property details from brochure",

              imageUrl: pageImages[0],

              appendUserText: false,

              sharedTypingId: bubbleId,
            });

            return;
          }
        }

        // ============================================
        // COMPLETE FAILURE
        // ============================================

        setMessages((m) => m.filter((x) => x.id !== bubbleId));

        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "ai",
            kind: "text",
            text: "I couldn't detect enough property-related information in this document. Please upload a clearer brochure, layout, floor plan, or property document.",
          },
        ]);

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
    // ============================================
    // FINANCIAL category — separate flow: insert into financial_leads
    // so any financial provider can view and contact the applicant.
    // ============================================
    if (category === "financial") {
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
        const src: any = { ...state, ...editForm };
        const parseNum = (v: any) => {
          const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
          return isFinite(n) && n > 0 ? n : null;
        };
        const amount = parseNum(src.required_amount) ?? parseNum(src.amount_requested) ?? parseNum(src.loan_amount);

        // Try to read display name + phone from profile
        let customerName = (user.user_metadata?.full_name as string) || (user.email?.split("@")[0] ?? "Applicant");
        let phone: string | null = (user.user_metadata?.phone as string) || null;
        try {
          const { data: prof } = await (supabase.from as any)("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .maybeSingle();
          if (prof?.full_name) customerName = prof.full_name;
          if (prof?.phone) phone = prof.phone;
        } catch {
          /* ignore */
        }

        const requirementText = [
          src.requirement_type && `Type: ${src.requirement_type}`,
          src.category && `Category: ${src.category}`,
          src.applicant_type && `Applicant: ${src.applicant_type}`,
          src.employment_business_profile && `Profile: ${src.employment_business_profile}`,
          src.credit_score && `Credit: ${src.credit_score}`,
          src.preferred_finance_source && `Prefers: ${src.preferred_finance_source}`,
          src.property_information && `Property: ${src.property_information}`,
          src.example_description,
        ]
          .filter(Boolean)
          .join(" • ");

        const locationStr = [src.locality, src.city, src.state_name].filter(Boolean).join(", ") || null;

        const documents = Array.isArray(src.documents)
          ? src.documents
          : Array.isArray(src.upload_documents?.files)
            ? src.upload_documents.files
            : [];

        const { error } = await (supabase.from as any)("financial_leads").insert({
          lead_type: "buyer",
          customer_name: customerName,
          requirement: requirementText || null,
          budget: amount,
          location: locationStr,
          city: src.city || null,
          contact_email: user.email || null,
          contact_phone: phone,
          source_user_id: user.id,
          price: 0,
          is_purchased: false,
          documents,
          full_details: src,
        });
        if (error) throw error;

        toast.success("Financial request submitted ✅", {
          description: "Our financial partners will reach out shortly.",
        });
        navigate("/dashboard/financial");
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Could not submit financial request");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Block Publish when business rules fail (floor/total_floors, dates).
    const ruleError = validateBusinessRules({ ...state, ...editForm });
    if (ruleError) {
      toast.error(ruleError);
      return;
    }
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
      const area = parseFloat(String(editForm.area).replace(/[^\d.]/g, "")) || null;
      // Pull a price out of whichever field the flow used.
      // Sale flows store under total_price/property_price; rent flows under
      // monthly_rent/rental_price/rent; coworking adds hourly/daily/weekly/per-seat tiers.
      const parseNum = (v: any) => {
        const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
        return isFinite(n) && n > 0 ? n : null;
      };
      const isRentListing = String(editForm.listing_type || state.listing_type || "").toLowerCase() === "rent";
      const rentCandidates = [
        editForm.monthly_rent,
        state.monthly_rent,
        editForm.rent_amount,
        state.rent_amount,
        editForm.rental_price,
        state.rental_price,
        editForm.rent,
        state.rent,
        editForm.price_per_seat,
        state.price_per_seat,
        editForm.weekly_price,
        state.weekly_price,
        editForm.daily_pass_price,
        state.daily_pass_price,
        editForm.hourly_price,
        state.hourly_price,
      ];
      const saleCandidates = [
        editForm.total_price,
        state.total_price,
        editForm.property_price,
        state.property_price,
        editForm.price,
        state.price,
        editForm.amount,
        state.amount,
      ];
      const ordered = isRentListing ? [...rentCandidates, ...saleCandidates] : [...saleCandidates, ...rentCandidates];
      let totalPrice: number | null = null;
      for (const c of ordered) {
        const n = parseNum(c);
        if (n) {
          totalPrice = n;
          break;
        }
      }
      const UNIT_TO_SQFT: Record<string, number> = {
        "sq ft": 1,
        "sq m": 10.7639,
        gunta: 1089,
        acre: 43560,
        cent: 435.6,
        "sq yd": 9,
        "sq yard": 9,
      };
      const areaSqft = area ? Math.round(area * (UNIT_TO_SQFT[editForm.area_unit] || 1)) : null;

      const typesArr = Array.isArray(state.type) ? state.type : state.type ? [state.type] : [];
      const primaryType = typesArr[0] || null;

      const finalTitle =
        (editForm.title && editForm.title.trim()) ||
        (selectedTitleIdx !== null ? aiTitles[selectedTitleIdx]?.title : "") ||
        `${editForm.bhk || ""} ${primaryType || "Property"} in ${editForm.locality || editForm.city || ""}`.trim();

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

        // ============================================
        // BASIC INFO
        // ============================================

        title: finalTitle,

        description: editForm.description || buildPropertyDescription(editForm) || null,

        type: primaryType,

        listing_type: editForm.listing_type?.toLowerCase() === "rent" ? "rent" : "sale",

        listed_by: isAgentMode ? "agent" : (editForm.listed_by || state.listed_by || "owner").toLowerCase(),

        // ============================================
        // PRICE
        // ============================================

        price: totalPrice,

        area_sqft: areaSqft,

        // ============================================
        // CONFIGURATION
        // ============================================

        bhk: editForm.bhk ? parseFloat(String(editForm.bhk).replace(/[^\d.]/g, "")) || null : null,

        bedrooms:
          editForm.bedrooms || editForm.bhk
            ? parseFloat(String(editForm.bedrooms || editForm.bhk).replace(/[^\d.]/g, "")) || null
            : null,

        bathrooms: editForm.bathrooms ? parseInt(String(editForm.bathrooms).replace(/[^\d]/g, "")) || null : null,

        balconies: editForm.balconies ? parseInt(String(editForm.balconies).replace(/[^\d]/g, "")) || null : null,

        floor_number: editForm.floor_number
          ? parseInt(String(editForm.floor_number).replace(/[^\d]/g, "")) || null
          : null,

        total_floors: editForm.total_floors
          ? parseInt(String(editForm.total_floors).replace(/[^\d]/g, "")) || null
          : null,

        furnishing: editForm.furnishing || null,

        property_age: editForm.property_age || null,

        // ============================================
        // AREA (extra area fields preserved in document_urls below)
        // ============================================

        building_area_sqft: editForm.built_up_area
          ? parseFloat(String(editForm.built_up_area).replace(/[^\d.]/g, "")) || null
          : null,

        // ============================================
        // LOCATION
        // ============================================

        city: editForm.city || null,

        locality: editForm.locality || null,

        address: editForm.address || null,

        pincode: editForm.pincode || state.pincode || null,

        // Territory (auto-assigns responsible district admin via DB trigger)
        country: editForm.country || state.country || null,

        state: editForm.state_name || state.state_name || state.state || null,

        district: editForm.district || state.district || null,

        // ============================================
        // FEATURES (facing/ownership/highlights/payment_options/etc. preserved in document_urls)
        // ============================================

        amenities: editForm.amenities || [],

        // ============================================
        // DOCUMENTS
        // ============================================

        rera_id: editForm.rera_number || state.rera_number || null,

        images: state.media_urls || [],

        // ============================================
        // STATUS
        // ============================================

        is_draft: false,

        verified: false,

        verification_status,

        listing_status,

        assigned_agent_id,

        // ============================================
        // AGENT
        // ============================================

        agent_submitted_at: isAgentMode && isTrustedAgent ? new Date().toISOString() : null,

        agent_data: isAgentMode
          ? {
              ...editForm,
              agent_id: agentRecord?.id,
              submitted_by_agent: true,
            }
          : null,

        // ============================================
        // RAW DETAILS
        // ============================================

        document_urls: {
          ...editForm,

          created_by_role: isAgentMode ? "agent" : "seller",

          created_by_id: isAgentMode && agentRecord ? agentRecord.id : user.id,
        },

        verification_requested: verificationRequested,
      };
      // If owner declined verification, route admin to direct-approval (no agent)
      if (!verificationRequested) {
        payload.verification_status = "pending";
        payload.assigned_agent_id = null;
      }

      // Safety net: only send columns that exist on the `properties` table.
      const PROPERTIES_COLUMNS = new Set([
        "submitted_by",
        "title",
        "description",
        "type",
        "listing_type",
        "listed_by",
        "price",
        "price_negotiable",
        "maintenance_charges",
        "booking_amount",
        "area_sqft",
        "building_area_sqft",
        "bhk",
        "bedrooms",
        "bathrooms",
        "balconies",
        "floor_number",
        "total_floors",
        "total_parking",
        "elevators",
        "furnishing",
        "completion_stage",
        "property_age",
        "building_name",
        "city",
        "locality",
        "address",
        "pincode",
        "country",
        "state",
        "district",
        "latitude",
        "longitude",
        "amenities",
        "retail_centres",
        "rera_id",
        "rera_document_url",
        "images",
        "video_urls",
        "is_draft",
        "is_featured",
        "is_live",
        "verified",
        "verification_status",
        "listing_status",
        "assigned_agent_id",
        "agent_submitted_at",
        "agent_data",
        "agent_notes",
        "field_verification",
        "document_urls",
        "original_snapshot",
        "final_data",
        "slug",
        "trust_score",
        "rejection_reason",
        "expiry_date",
        "featured_until",
        "boost_payment_ref",
        "builder_id",
        "verification_requested",
      ]);
      const cleanPayload: any = {};
      for (const k of Object.keys(payload)) {
        if (PROPERTIES_COLUMNS.has(k)) cleanPayload[k] = payload[k];
      }

      // ✅ STEP 1: Save property FIRST (no payment yet)
      const { data: inserted, error: insErr } = await (supabase.from as any)("properties")
        .insert(cleanPayload)
        .select("id")
        .single();
      if (insErr) throw insErr;

      const propertyId = inserted?.id;

      // ✅ STEP 2: Process payment if there's a pending payment (pay-per-post or subscription)
      if (hasPending && propertyId) {
        const paymentSuccess = await processPendingPayment(propertyId);
        if (!paymentSuccess) {
          // Property already deleted in the function if payment failed
          setSubmitting(false);
          return;
        }
      }

      // ✅ STEP 3: Save granular field key/values to property_details (one row per field)
      if (propertyId) {
        const detailRows = Object.entries(editForm)
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

      // Auto-assign agent only if owner asked for verification AND not a trusted agent flow
      if (propertyId && verificationRequested && !(isAgentMode && isTrustedAgent)) {
        try {
          await supabase.functions.invoke("auto-assign-agent", { body: { property_id: propertyId } });
        } catch (e) {
          console.warn("auto-assign failed", e);
        }
      }

      // ✅ STEP 4: Update posting count (if free post was used)
      if (!hasPending) {
        // Free post was used - increment count
        await supabase.rpc("increment_posting_count", { _user_id: user.id });
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
          description: hasPending
            ? "Payment processed. We're assigning a verification agent now."
            : "We're assigning a verification agent now. You'll be notified shortly.",
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

  const jumpToField = async (fieldId: string) => {
    const index = history.findIndex((h) => h.field.id === fieldId);

    if (index === -1) return;

    const target = history[index];

    console.log("[jumpToField] entering edit mode", {
      fieldId: target.field.id,
      previousValue: target.value,
      historyLength: history.length,
      historyIds: history.map((h) => h.field.id),
    });

    // ============================================
    // EXPLICIT EDIT MODE
    // - keep all history entries
    // - keep all state answers
    // - keep all chat messages (Q4..Qn user/ai bubbles stay)
    // - keep engine progress; commitAnswer will resume from
    //   the first still-unanswered field after the edit.
    // ============================================

    setEditingFieldId(target.field.id);

    setField(target.field);

    setValue(target.value ?? "");

    // Reset suggestions for the edited field; the resumed question's
    // smartSuggestions will be re-fetched on commit via fetchNext.
    setSuggestions([]);

    // ============================================
    // IN-PLACE EDIT — DO NOT MUTATE CONVERSATION HISTORY
    // Editing is an update operation only:
    // - Do NOT append a new AI question bubble for the edited field.
    //   The edit UI is rendered via the active input + suggestions area
    //   (driven by `field`), not by inserting new chat messages.
    // - Do NOT touch `lastAskedFieldIdRef`. It still points at the
    //   currently pending downstream question (e.g. Q8). When
    //   commitAnswer -> fetchNext resolves back to that same field,
    //   the duplicate-question guard inside fetchNext will suppress
    //   re-appending it, preserving the original chat order and
    //   leaving exactly one active question on screen.
    // ============================================

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });

    // Re-sync engine with the full current answer set (non-destructive).
    try {
      engineRef.current?.applyExtractedFields(state, { overwrite: false });
    } catch {}

    setDone(false);

    toast.success(`Editing ${target.field.question}`);
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overflow-hidden">
      <Navigation />

      {/* Chat header - with Back button (hidden on category selector) */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-16 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* BACK BUTTON - only show when NOT on category selector */}
          {!showCategoryPicker && (
            <button
              type="button"
              onClick={() => {
                // Reset to category selection
                setCategory(null);
                setIntakeDone(false);
                setDone(false);
                setField(null);
                setState({});
                setHistory([]);
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
                engineRef.current = null;
              }}
              className="h-9 w-9 shrink-0 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground transition"
              title="Back to categories"
              aria-label="Back to categories"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

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
        </div>
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
                  <div className="flex items-center gap-2">
                    <Bubble msg={msg} />

                    {msg.role === "user" && msg.kind === "text" && (msg as any).fieldId && (
                      <button
                        type="button"
                        onClick={() => jumpToField((msg as any).fieldId)}
                        className="opacity-60 hover:opacity-100 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Edit mode banner — shows the edited field's question so the displayed
                question, suggestions, and input value always refer to the same field.
                Restored automatically on save (editingFieldId cleared in commitAnswer). */}
            {editingFieldId && field && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full justify-start"
              >
                <div className="max-w-[85%] rounded-2xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wide text-primary/80 font-semibold mb-0.5">
                    Editing answer
                  </div>
                  <div className="text-sm text-foreground">{field.question}</div>
                </div>
              </motion.div>
            )}

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
                        onClick={async () => {
                          if (isMulti) {
                            setValue(active ? arr.filter((x) => x !== opt) : [...arr, opt]);
                            return;
                          }

                          await commitAnswer(opt);
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

            {/* Document upload widget — financial flow */}
            {field?.id === "upload_documents" && !loadingNext && !done && Array.isArray(value) && value.length > 0 && (
              <DocumentUploadWidget
                docTypes={value as string[]}
                onSubmit={async (uploaded) => {
                  const types = value as string[];
                  setEditForm((f: any) => ({
                    ...f,
                    upload_documents: types,
                    documents: uploaded,
                  }));
                  // Commit the original multi-select array so engine validation passes;
                  // file URLs are kept alongside in editForm + state.
                  await commitAnswer(
                    types,
                    `${uploaded.length} document(s) uploaded: ${uploaded.map((u) => u.type).join(", ")}`,
                  );
                }}
              />
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
                        setValue(opt);
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

            {/* ============================================
    DYNAMIC INPUT SUGGESTIONS
============================================ */}

            {Array.isArray(suggestions) && suggestions.length > 0 && typeof suggestions[0] === "string" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 pt-1 pl-1"
              >
                {suggestions.map((sug) => {
                  const active = value === sug;

                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={async () => {
                        await commitAnswer(sug);
                      }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium border transition shadow-sm",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-primary/5 border-border",
                      )}
                    >
                      {sug}
                    </button>
                  );
                })}
              </motion.div>
            )}

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
                    // Save only fields that have a real value; never overwrite
                    // existing state with empty strings/nulls. Missing optional
                    // fields must not fail submission.
                    const locationFieldId = field?.id || "location";

                    const hasVal = (v: any) =>
                      v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");

                    const partial: Record<string, any> = {};
                    [
                      "country",
                      "state_name",
                      "district",
                      "city",
                      "locality",
                      "sub_locality",
                      "landmark",
                      "address",
                      "pincode",
                      "latitude",
                      "longitude",
                      "place_id",
                    ].forEach((k) => {
                      if (hasVal((data as any)[k])) partial[k] = (data as any)[k];
                    });

                    const merged = {
                      ...state,
                      ...partial,
                      [locationFieldId]: {
                        ...(state?.[locationFieldId] || {}),
                        ...partial,
                      },
                    };

                    setState(merged);

                    try {
                      engineRef.current?.applyExtractedFields(
                        {
                          ...partial,
                          [locationFieldId]: merged[locationFieldId],
                        },
                        { overwrite: true },
                      );
                    } catch {}

                    // Short summary from whatever's available.
                    const summary =
                      [data.locality, data.city, data.state_name].filter((s) => hasVal(s)).join(", ") ||
                      data.address ||
                      data.pincode ||
                      "Location saved";

                    setMessages((m) => [
                      ...m,
                      {
                        id: uid(),
                        role: "user",
                        kind: "text",
                        text: `📍 ${summary}`,
                      },
                    ]);

                    await fetchNext(merged);
                  }}
                />
              </div>
            )}
            {field?.type === "plot_measurement_widget" && (
              <div className="pt-3">
                <PlotMeasurementWidget
                  value={value}
                  onChange={setValue}
                  optional={field.optional}
                  onSkip={onSkip}
                  onComplete={async (plotData) => {
                    const formatted = Object.entries(plotData || {})
                      .map(([key, v]: any) => {
                        const side = key.replace("_measurement", "");
                        return `${side}: ${v.value} ${v.unit}`;
                      })
                      .join(", ");

                    await commitAnswer(plotData, formatted || "Plot measurements added", field);
                  }}
                />
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

            {/* Final review screen — premium AI-generated property preview */}
            {done &&
              (() => {
                const fmtINR = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
                const fmtPrice = (n: number) => {
                  if (!n || !isFinite(n)) return "";
                  if (n >= 1e7) return `₹ ${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 2)} Cr`;
                  if (n >= 1e5) return `₹ ${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 2)} Lakh`;
                  return `₹ ${fmtINR(n)}`;
                };
                /* Resolve a canonical value by checking editForm first, then state,
                 * across all known aliases. Fixes the review screen showing blanks
                 * when the AI stored an answer under an alias key (e.g. bhk_type,
                 * residential_type, built_up_area, flat_size). */
                const PREVIEW_ALIASES: Record<string, string[]> = {
                  property_type: ["property_type", "residential_type", "sub_type", "type"],
                  listing_type: ["listing_type", "purpose"],
                  bhk: ["bhk", "bhk_type", "configuration"],
                  bedrooms: ["bedrooms", "bedroom_count"],
                  bathrooms: ["bathrooms", "bathroom_count"],
                  balconies: ["balconies", "balcony_count"],
                  floor_number: ["floor_number", "floor"],
                  total_floors: ["total_floors", "floors"],
                  built_up_area: ["built_up_area", "built_area", "builtup_area", "building_area_sqft", "flat_size"],
                  carpet_area: ["carpet_area"],
                  area: [
                    "area",
                    "area_sqft",
                    "total_area",
                    "flat_size",
                    "built_up_area",
                    "built_area",
                    "plot_area",
                    "land_size",
                  ],
                  plot_area: ["plot_area", "land_size", "land_area"],
                  facing: ["facing", "facing_direction"],
                  furnishing: ["furnishing", "furnishing_status"],
                  property_age: ["property_age", "age"],
                  property_condition: ["property_condition", "condition"],
                  availability_status: ["availability_status", "possession_status"],
                  possession_date: ["possession_date"],
                  available_from: ["available_from_date", "available_from"],
                  parking: ["parking", "parking_type"],
                  ownership: ["ownership", "ownership_type"],
                  project_name: ["project_name", "society_name", "building_name"],
                  total_price: ["total_price", "price", "expected_price"],
                  monthly_rent: ["monthly_rent", "rent"],
                  maintenance_charges: ["maintenance_charges", "maintenance"],
                  security_deposit: ["security_deposit", "deposit"],
                  gated_community: ["gated_community"],
                  area_unit: ["area_unit"],
                };
                const pick = (id: string): any => {
                  const keys = PREVIEW_ALIASES[id] || [id];
                  for (const k of keys) {
                    const v = (editForm as any)[k] ?? (state as any)[k];
                    if (v === null || v === undefined || v === "") continue;
                    if (Array.isArray(v) && v.length === 0) continue;
                    return v;
                  }
                  return undefined;
                };

                const areaN = Number(pick("area")) || 0;
                const totalPrice =
                  Number(String(pick("total_price") ?? "").replace(/[^\d.]/g, "")) ||
                  Number(String(pick("monthly_rent") ?? "").replace(/[^\d.]/g, "")) ||
                  0;

                const propTypeRaw = pick("property_type");
                const sub = (Array.isArray(propTypeRaw) ? propTypeRaw[0] : propTypeRaw) || "Property";
                const purpose = (pick("listing_type") || "sale").toString().toLowerCase();
                const locLine = [editForm.locality || state.locality, editForm.city || state.city]
                  .filter(Boolean)
                  .join(", ");
                const cap = (v: any) =>
                  typeof v === "string" && v.length ? v.charAt(0).toUpperCase() + v.slice(1) : v;
                const asStr = (v: any) =>
                  Array.isArray(v) ? v.filter(Boolean).join(", ") : v == null ? "" : String(v);

                // BHK normalize ("3 BHK" or "3")
                const bhkRaw = pick("bhk") || pick("bedrooms") || "";
                const bhkLabel = bhkRaw ? (String(bhkRaw).match(/bhk/i) ? String(bhkRaw) : `${bhkRaw} BHK`) : "";
                const bathRaw = pick("bathrooms") ?? "";
                const facingRaw = pick("facing") || "";
                const furnishing = pick("furnishing") || "";
                const floorNum = pick("floor_number");
                const totalFloorsVal = pick("total_floors");
                const floorLine =
                  floorNum != null && floorNum !== ""
                    ? `${floorNum}${totalFloorsVal ? ` of ${totalFloorsVal}` : ""}`
                    : "";

                /* Canonical detail map — render in this order, skip empty */
                const has = (v: any) =>
                  v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
                const unit = pick("area_unit") || "sq ft";

                const builtUp = pick("built_up_area");
                const carpet = pick("carpet_area");
                const plot = pick("plot_area");
                const gated = pick("gated_community");
                const detailRows: Array<{ key: string; label: string; value: string }> = [
                  { key: "property_type", label: "Property Type", value: has(propTypeRaw) ? asStr(propTypeRaw) : "" },
                  { key: "listing_type", label: "Listing For", value: cap(purpose) },
                  { key: "bhk", label: "Configuration", value: bhkLabel },
                  { key: "bathrooms", label: "Bathrooms", value: asStr(bathRaw) },
                  { key: "balconies", label: "Balconies", value: asStr(pick("balconies")) },
                  { key: "floor", label: "Floor", value: floorLine },
                  { key: "total_floors", label: "Total Floors", value: asStr(totalFloorsVal) },
                  {
                    key: "area",
                    label: "Built-up Area",
                    value: has(builtUp) ? `${builtUp} ${unit}` : has(pick("area")) ? `${pick("area")} ${unit}` : "",
                  },
                  {
                    key: "carpet",
                    label: "Carpet Area",
                    value: has(carpet) ? `${carpet} ${unit}` : "",
                  },
                  {
                    key: "plot",
                    label: "Plot / Land Area",
                    value: has(plot) ? `${plot} ${unit}` : "",
                  },
                  { key: "furnishing", label: "Furnishing", value: cap(asStr(furnishing)) },
                  { key: "facing", label: "Facing", value: cap(asStr(facingRaw)) },
                  { key: "property_age", label: "Property Age", value: asStr(pick("property_age")) },
                  {
                    key: "property_condition",
                    label: "Condition",
                    value: cap(asStr(pick("property_condition"))),
                  },
                  {
                    key: "availability_status",
                    label: "Availability",
                    value: cap(asStr(pick("availability_status"))),
                  },
                  {
                    key: "possession_date",
                    label: "Possession",
                    value: asStr(pick("possession_date")),
                  },
                  {
                    key: "available_from",
                    label: "Available From",
                    value: asStr(pick("available_from")),
                  },
                  { key: "parking", label: "Parking", value: asStr(pick("parking")) },
                  {
                    key: "gated_community",
                    label: "Gated Community",
                    value: has(gated) ? (/^y|true/i.test(String(gated)) ? "Yes" : "No") : "",
                  },
                  {
                    key: "ownership",
                    label: "Ownership",
                    value: cap(asStr(pick("ownership"))),
                  },
                  {
                    key: "maintenance",
                    label: "Maintenance",
                    value: has(pick("maintenance_charges")) ? `₹ ${fmtINR(Number(pick("maintenance_charges")))}` : "",
                  },
                  {
                    key: "security_deposit",
                    label: "Security Deposit",
                    value: has(pick("security_deposit")) ? `₹ ${fmtINR(Number(pick("security_deposit")))}` : "",
                  },
                  { key: "project_name", label: "Project", value: asStr(pick("project_name")) },
                ].filter((r) => has(r.value));

                const arrFlat = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
                const allHighlights = Array.from(
                  new Set(
                    [
                      ...arrFlat(editForm.property_highlights || state.property_highlights),
                      ...arrFlat(editForm.amenities || state.amenities),
                      ...arrFlat(editForm.payment_options || state.payment_options),
                      ...arrFlat(editForm.approvals || state.approvals),
                      ...arrFlat(editForm.furnishing_items || state.furnishing_items),
                    ].filter(Boolean),
                  ),
                );

                const descTooLong = (editForm.description || "").length > 280;
                const photos: string[] = editForm.media_urls || state.media_urls || [];

                const isFinancial = category === "financial";
                const titleReady = isFinancial ? true : !!editForm.title.trim();
                const canPublish = isFinancial ? !submitting : titleReady && !submitting && !titlesLoading;

                const SectionCard: React.FC<{
                  title: string;
                  icon?: React.ReactNode;
                  action?: React.ReactNode;
                  children: React.ReactNode;
                }> = ({ title, icon, action, children }) => (
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
                      </div>
                      {action}
                    </div>
                    <div className="p-5">{children}</div>
                  </div>
                );

                const EditBtn = () => (
                  <button
                    type="button"
                    onClick={() => setShowEditSheet(true)}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                );

                /* ------ Edit drawer: REVIEW + CORRECTION (answered-only) ------
                 * Rule: render a field ONLY IF the AI actually collected a value
                 * for it (or the user typed one). Category onlyFor/hideFor still
                 * gate visibility, but the primary filter is `answered === true`.
                 * Aliases handle the AI mapping bug where the same logical field
                 * lives under different keys (e.g. built_area vs built_up_area).
                 */
                const activeCategory = (category || (state as any).property_category || (state as any).category) as
                  | PropertyCategory
                  | undefined;

                const FIELD_ALIASES: Record<string, string[]> = {
                  built_area: ["built_area", "built_up_area", "builtup_area", "building_area_sqft", "flat_size"],
                  built_up_area: ["built_up_area", "built_area", "builtup_area", "building_area_sqft", "flat_size"],
                  area: ["area", "area_sqft", "total_area"],
                  bhk: ["bhk", "configuration"],
                  bathrooms: ["bathrooms", "bathroom_count"],
                  bedrooms: ["bedrooms"],
                  floor_number: ["floor_number", "floor"],
                  total_floors: ["total_floors"],
                  property_type: ["property_type", "residential_type", "type"],
                  listing_type: ["listing_type"],
                  listed_by: ["listed_by", "owner_type"],
                  project_name: ["project_name", "society_name", "building_name"],
                  total_price: ["total_price", "price"],
                  price_per_unit: ["price_per_unit", "price_per_sqft"],
                  monthly_rent: ["monthly_rent", "rent"],
                  furnishing: ["furnishing", "furnishing_status"],
                  facing: ["facing"],
                  amenities: ["amenities"],
                  approvals: ["approvals"],
                  payment_options: ["payment_options"],
                  highlights: ["highlights"],
                  gated_community: ["gated_community"],
                  property_age: ["property_age"],
                };

                const readValue = (id: string): any => {
                  const keys = FIELD_ALIASES[id] || [id];
                  for (const k of keys) {
                    const v = (editForm as any)[k] ?? (state as any)[k];
                    if (v === null || v === undefined || v === "") continue;
                    if (Array.isArray(v) && v.length === 0) continue;
                    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
                    return v;
                  }
                  return undefined;
                };

                const isAnswered = (id: string) => readValue(id) !== undefined;

                const CATEGORY_SECTION_GATE: Record<string, PropertyCategory> = {
                  coworking: "coworking",
                  plot_details: "plots",
                  agriculture_details: "agriculture",
                  commercial_details: "commercial",
                };

                // Always-editable scaffolding fields a review screen needs.
                const ALWAYS_SHOW = new Set<string>(["title", "description", "city", "locality"]);

                const visibleSections = EDIT_FIELD_CONFIG.filter((section) => {
                  const gated = CATEGORY_SECTION_GATE[section.id];
                  if (gated && activeCategory && gated !== activeCategory) return false;
                  return true;
                })
                  .map((section) => ({
                    ...section,
                    fields: section.fields.filter((f) => {
                      if (activeCategory) {
                        if (f.onlyFor && !f.onlyFor.includes(activeCategory)) return false;
                        if (f.hideFor && f.hideFor.includes(activeCategory)) return false;
                      }
                      // Primary rule: render only if answered (or always-show).
                      if (ALWAYS_SHOW.has(f.id)) return true;
                      return isAnswered(f.id);
                    }),
                  }))
                  .filter((s) => s.fields.length > 0);

                // Backfill editForm aliases so the input shows the AI value
                // (e.g. AI stored `built_up_area` but field id is `built_area`).
                for (const section of visibleSections) {
                  for (const f of section.fields) {
                    if (
                      (editForm as any)[f.id] === undefined ||
                      (editForm as any)[f.id] === null ||
                      (editForm as any)[f.id] === ""
                    ) {
                      const v = readValue(f.id);
                      if (v !== undefined) (editForm as any)[f.id] = v;
                    }
                  }
                }

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-4 pb-28"
                  >
                    {/* 1. HERO */}
                    <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-primary/5 via-card to-emerald-500/5 shadow-md">
                      <div className="relative h-44 sm:h-60 bg-muted overflow-hidden">
                        {photos[0] ? (
                          <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/40">
                            <ImagePlus className="h-8 w-8 mb-2 opacity-50" />
                            <div className="text-xs">Add photos to make your listing shine</div>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/85 backdrop-blur text-[10px] font-semibold uppercase tracking-wider text-primary">
                          <Sparkles className="h-3 w-3" /> AI-generated preview
                        </div>
                        {photos.length > 1 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-background/85 backdrop-blur text-[10px] font-semibold">
                            +{photos.length - 1} photos
                          </div>
                        )}
                      </div>
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {totalPrice > 0 && (
                              <div className="text-2xl sm:text-3xl font-bold text-primary">{fmtPrice(totalPrice)}</div>
                            )}
                            <h1 className="mt-1 text-lg sm:text-xl font-semibold leading-snug">
                              {editForm.title ||
                                (titlesLoading ? (
                                  <span className="inline-flex items-center gap-2 text-muted-foreground italic font-normal">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Generating title…
                                  </span>
                                ) : (
                                  `${bhkLabel ? bhkLabel + " " : ""}${cap(sub)} for ${purpose}`
                                ))}
                            </h1>
                            {locLine && (
                              <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" /> {locLine}
                              </div>
                            )}
                          </div>
                          <EditBtn />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          {bhkLabel && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                              <Home className="h-3 w-3" /> {bhkLabel}
                            </span>
                          )}
                          {areaN > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                              <Maximize2 className="h-3 w-3" /> {areaN} {unit}
                            </span>
                          )}
                          {bathRaw && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                              <Bath className="h-3 w-3" /> {bathRaw} Bath
                            </span>
                          )}
                          {floorLine && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                              <Building2 className="h-3 w-3" /> {floorLine}
                            </span>
                          )}
                          {facingRaw && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                              <Compass className="h-3 w-3" /> {cap(facingRaw)}
                            </span>
                          )}
                          {furnishing && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                              <Sofa className="h-3 w-3" /> {cap(furnishing)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. DESCRIPTION */}
                    <SectionCard
                      title="Description"
                      icon={<Sparkles className="h-4 w-4 text-primary" />}
                      action={<EditBtn />}
                    >
                      <div>
                        <div
                          className={cn(
                            "relative text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed",
                            !descExpanded && descTooLong && "max-h-28 overflow-hidden",
                          )}
                        >
                          {editForm.description || (
                            <span className="italic text-muted-foreground">No description yet</span>
                          )}
                          {!descExpanded && descTooLong && (
                            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                          )}
                        </div>
                        {descTooLong && (
                          <button
                            type="button"
                            onClick={() => setDescExpanded((v) => !v)}
                            className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {descExpanded ? (
                              <>
                                Show less <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Read more <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </SectionCard>

                    {/* 3. HIGHLIGHTS */}
                    {allHighlights.length > 0 && (
                      <SectionCard
                        title="Property Highlights"
                        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        action={<EditBtn />}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {allHighlights.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-muted/50">
                              <span className="h-5 w-5 shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </span>
                              <span className="truncate">{h}</span>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {/* 4. DETAILS — only user-filled rows */}
                    {detailRows.length > 0 && (
                      <SectionCard
                        title="Property Details"
                        icon={<Home className="h-4 w-4 text-primary" />}
                        action={<EditBtn />}
                      >
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                          {detailRows.map((r, i) => (
                            <div
                              key={r.key}
                              className={cn(
                                "flex items-center justify-between py-2.5 text-sm border-b border-border/50",
                                i >= detailRows.length - (detailRows.length % 2 === 0 ? 2 : 1) && "sm:border-b-0",
                              )}
                            >
                              <dt className="text-muted-foreground">{r.label}</dt>
                              <dd className="font-medium text-right">{r.value}</dd>
                            </div>
                          ))}
                          {totalPrice > 0 && (
                            <div className="flex items-center justify-between py-2.5 text-sm sm:col-span-2 border-t border-border/60 mt-1">
                              <dt className="text-muted-foreground">Total Price</dt>
                              <dd className="font-semibold text-primary">{fmtPrice(totalPrice)}</dd>
                            </div>
                          )}
                        </dl>
                      </SectionCard>
                    )}

                    {/* 5. LOCATION */}
                    {(locLine || editForm.address) && (
                      <SectionCard
                        title="Location"
                        icon={<MapPin className="h-4 w-4 text-primary" />}
                        action={<EditBtn />}
                      >
                        <div className="space-y-1">
                          <div className="text-base font-medium">{locLine || "—"}</div>
                          {editForm.address && <div className="text-sm text-muted-foreground">{editForm.address}</div>}
                        </div>
                      </SectionCard>
                    )}

                    {/* 6. PHOTOS */}
                    <SectionCard
                      title={`Photos (${photos.length})`}
                      icon={<ImageIcon className="h-4 w-4 text-primary" />}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                      />
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {photos.map((url: string, i: number) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
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
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition"
                        >
                          {uploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <ImagePlus className="h-5 w-5" />
                              <span className="text-[10px] font-medium">Add more</span>
                            </>
                          )}
                        </button>
                      </div>
                    </SectionCard>

                    {/* 7. AI TITLES — not for financial */}
                    {!isFinancial && (
                      <SectionCard
                        title="AI Suggested Titles"
                        icon={<Wand2 className="h-4 w-4 text-primary" />}
                        action={
                          <button
                            type="button"
                            onClick={regenerateTitles}
                            disabled={titlesLoading}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            {titlesLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Regenerate
                          </button>
                        }
                      >
                        {titlesLoading && aiTitles.length === 0 ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" /> Crafting titles…
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {aiTitles.slice(0, 3).map((t, i) => {
                              const active = selectedTitleIdx === i;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTitleIdx(i);
                                    setEditForm((p) => ({ ...p, title: t.title }));
                                  }}
                                  className={cn(
                                    "w-full text-left p-3 rounded-xl border transition flex items-start gap-3",
                                    active
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-background hover:border-primary/40",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                      active ? "border-primary bg-primary" : "border-muted-foreground/40",
                                    )}
                                  >
                                    {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                                      {t.label}
                                    </div>
                                    <div className="text-sm">{t.title}</div>
                                  </div>
                                </button>
                              );
                            })}
                            {aiTitles.length === 0 && (
                              <div className="text-xs text-muted-foreground italic">
                                No titles yet — tap Regenerate.
                              </div>
                            )}
                          </div>
                        )}
                      </SectionCard>
                    )}

                    {/* 8. STICKY ACTION BAR */}
                    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
                      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex flex-col gap-1.5">
                        {!isFinancial && !titleReady && (
                          <div className="text-[11px] text-muted-foreground text-center">
                            {titlesLoading ? "Generating title…" : "Pick or write a title to enable publish"}
                          </div>
                        )}
                        {!isFinancial && (
                          <div className="rounded-xl border border-border bg-card p-3 mb-1">
                            <div className="text-sm font-semibold mb-1">
                              Would you like a nearby JAAGA verification agent to verify your property?
                            </div>
                            <div className="text-[11px] text-muted-foreground mb-2">
                              Verified listings get a trust badge and rank higher. You can skip this and list as
                              unverified.
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={verificationRequested ? "default" : "outline"}
                                onClick={() => setVerificationRequested(true)}
                                className="flex-1"
                              >
                                Yes, verify
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={!verificationRequested ? "default" : "outline"}
                                onClick={() => setVerificationRequested(false)}
                                className="flex-1"
                              >
                                No, list as unverified
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowEditSheet(true)}
                            className="flex-1 sm:flex-none"
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit details
                          </Button>
                          <Button
                            onClick={onSubmit}
                            disabled={!canPublish}
                            className="flex-1 bg-gradient-to-r from-primary to-emerald-500 text-white hover:opacity-95 disabled:opacity-50"
                          >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isFinancial ? "Submit Request" : "Publish Property"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* EDIT DRAWER — dynamic, only filled fields */}
                    <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
                      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>
                            {isFinancial ? "Review your financial request" : "Edit property details"}
                          </SheetTitle>
                          <SheetDescription>
                            {isFinancial
                              ? "Verify your details below. Edit any field before submitting."
                              : "Update any field. Changes apply to your preview instantly."}
                          </SheetDescription>
                        </SheetHeader>

                        <div className="mt-6 space-y-6 pb-24">
                          {/* Title — not for financial */}
                          {!isFinancial && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Listing title
                              </h4>
                              <Input
                                value={editForm.title}
                                onChange={(e) => {
                                  setEditForm((p) => ({ ...p, title: e.target.value }));
                                  setSelectedTitleIdx(null);
                                }}
                                placeholder="e.g. Spacious 3 BHK Independent House in Kondapur"
                              />
                            </div>
                          )}

                          {/* FINANCIAL: render only answered flow fields */}
                          {isFinancial &&
                            (() => {
                              const ff: any = (financialRequirementFlow as any).fields || {};
                              const src: any = { ...state, ...editForm };
                              const entries = Object.entries(ff).filter(([k]) => {
                                const v = src[k];
                                if (v === null || v === undefined || v === "") return false;
                                if (Array.isArray(v) && v.length === 0) return false;
                                if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
                                  return false;
                                return true;
                              });
                              if (entries.length === 0) {
                                return (
                                  <p className="text-sm text-muted-foreground italic">
                                    No answers captured yet — go back and chat with the AI.
                                  </p>
                                );
                              }
                              return (
                                <div className="space-y-3">
                                  {entries.map(([key, def]: [string, any]) => {
                                    const v = (editForm as any)[key] ?? (state as any)[key];
                                    const label = (def.question || key).replace(/:$/, "");
                                    const isArr = Array.isArray(v);
                                    const isObj = !isArr && v !== null && typeof v === "object";
                                    const options: string[] = def.options || [];
                                    const type = def.type;
                                    const setVal = (nv: any) => setEditForm((p) => ({ ...p, [key]: nv }));
                                    if (type === "single_select" && options.length > 0) {
                                      return (
                                        <div key={key}>
                                          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                          <select
                                            value={String(v ?? "")}
                                            onChange={(e) => setVal(e.target.value)}
                                            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                          >
                                            {options.map((o) => (
                                              <option key={o} value={o}>
                                                {o}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    }
                                    if (type === "multi_select" && options.length > 0) {
                                      const arr: string[] = isArr ? v : v ? [v] : [];
                                      return (
                                        <div key={key}>
                                          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                          <div className="flex flex-wrap gap-1.5">
                                            {options.map((o) => {
                                              const on = arr.includes(o);
                                              return (
                                                <button
                                                  key={o}
                                                  type="button"
                                                  onClick={() => setVal(on ? arr.filter((x) => x !== o) : [...arr, o])}
                                                  className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs border transition",
                                                    on
                                                      ? "bg-primary text-primary-foreground border-primary"
                                                      : "bg-background border-border hover:border-primary/40",
                                                  )}
                                                >
                                                  {o}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    }
                                    if (def.inputMode === "textarea") {
                                      return (
                                        <div key={key}>
                                          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                          <Textarea value={String(v ?? "")} onChange={(e) => setVal(e.target.value)} />
                                        </div>
                                      );
                                    }
                                    // smart_location object — show editable summary fields
                                    if (isObj) {
                                      return (
                                        <div key={key}>
                                          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                          <pre className="text-xs bg-muted/40 p-2 rounded-md whitespace-pre-wrap">
                                            {JSON.stringify(v, null, 2)}
                                          </pre>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={key}>
                                        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                        <Input value={String(v ?? "")} onChange={(e) => setVal(e.target.value)} />
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                          {/* Config-driven sections — non-financial only */}
                          {!isFinancial &&
                            visibleSections.map((section) => (
                              <div key={section.id} className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  {section.title}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {section.fields.map((f) => {
                                    const span = f.colSpan === 2 ? "col-span-2" : "";
                                    const rawVal = (editForm as any)[f.id];
                                    const isArr = Array.isArray(rawVal);
                                    const isObj = !isArr && rawVal !== null && typeof rawVal === "object";
                                    // Format a {value, unit} measurement object → "20 Ft"
                                    const fmtMeasure = (m: any): string => {
                                      if (m == null) return "";
                                      if (typeof m !== "object") return String(m);
                                      if ("value" in m || "unit" in m) {
                                        const v = m.value ?? "";
                                        const u = m.unit ?? "";
                                        return [v, u].filter(Boolean).join(" ").trim();
                                      }
                                      return Object.entries(m)
                                        .filter(([, v]) => v !== null && v !== undefined && v !== "")
                                        .map(([k, v]) => `${k}: ${fmtMeasure(v)}`)
                                        .join(", ");
                                    };
                                    // Display value: arrays -> "a, b, c", objects -> formatted
                                    const val = isArr
                                      ? (rawVal as any[])
                                          .map((x) => (typeof x === "object" ? fmtMeasure(x) : x))
                                          .join(", ")
                                      : isObj
                                        ? fmtMeasure(rawVal)
                                        : (rawVal ?? "");
                                    const setVal = (v: any) => setEditForm((p) => ({ ...p, [f.id]: v }));
                                    const onTextChange = (raw: string) => {
                                      if (isArr) {
                                        setVal(
                                          raw
                                            .split(",")
                                            .map((s) => s.trim())
                                            .filter(Boolean),
                                        );
                                      } else {
                                        setVal(raw);
                                      }
                                    };
                                    return (
                                      <div key={f.id} className={span}>
                                        <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                                        {f.type === "select" ? (
                                          <select
                                            value={String(val || "")}
                                            onChange={(e) => setVal(e.target.value)}
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                          >
                                            {(f.options || []).map((o) => (
                                              <option key={o} value={o}>
                                                {o || "—"}
                                              </option>
                                            ))}
                                          </select>
                                        ) : f.type === "textarea" ? (
                                          <Textarea
                                            value={val}
                                            placeholder={f.placeholder}
                                            onChange={(e) => onTextChange(e.target.value)}
                                            rows={3}
                                          />
                                        ) : (
                                          <Input
                                            type={isArr || isObj ? "text" : f.type}
                                            value={val}
                                            placeholder={f.placeholder}
                                            onChange={(e) => onTextChange(e.target.value)}
                                            readOnly={isObj}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                          {/* Area & Pricing */}
                          {(areaN > 0 || totalPrice > 0) && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Area & Pricing
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Area</label>
                                  <Input
                                    type="number"
                                    value={editForm.area ?? ""}
                                    onChange={(e) => setEditForm((p) => ({ ...p, area: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                                  <select
                                    value={editForm.area_unit ?? "sq ft"}
                                    onChange={(e) => setEditForm((p) => ({ ...p, area_unit: e.target.value }))}
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                  >
                                    {["sq ft", "sq yard", "sq m", "gunta", "acre", "cent"].map((u) => (
                                      <option key={u}>{u}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {totalPrice > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Total: <span className="font-semibold text-primary">{fmtPrice(totalPrice)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Location */}
                          {true && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Location
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Search location (city, area, address)
                                  </label>
                                  <PlacesAutocompleteInput
                                    value={editForm.city ?? ""}
                                    country="IN"
                                    onChange={(t) => setEditForm((p) => ({ ...p, city: t }))}
                                    onSelect={(loc) =>
                                      setEditForm((p) => ({
                                        ...p,
                                        city: loc.city || p.city || "",
                                        locality: loc.locality || p.locality || "",
                                        address: loc.formattedAddress || p.address || "",
                                        state: loc.state || p.state || "",
                                        country: loc.country || p.country || "",
                                        pincode: loc.postalCode || p.pincode || "",
                                        latitude: loc.latitude ?? p.latitude,
                                        longitude: loc.longitude ?? p.longitude,
                                        place_id: loc.placeId,
                                        formatted_address: loc.formattedAddress,
                                      }))
                                    }
                                    placeholder="Start typing — e.g. Whitefield, Bengaluru"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Pin exact location on map
                                  </label>
                                  <GoogleMapPicker
                                    lat={editForm.latitude ?? null}
                                    lng={editForm.longitude ?? null}
                                    onChange={(la, ln) => setEditForm((p) => ({ ...p, latitude: la, longitude: ln }))}
                                    label=""
                                    height="280px"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">City</label>
                                  <Input
                                    value={editForm.city ?? ""}
                                    onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Locality</label>
                                  <Input
                                    value={editForm.locality ?? ""}
                                    onChange={(e) => setEditForm((p) => ({ ...p, locality: e.target.value }))}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">Address / landmark</label>
                                  <Input
                                    value={editForm.address ?? ""}
                                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {true && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Description
                              </h4>
                              <Textarea
                                value={editForm.description ?? ""}
                                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                rows={6}
                                className="resize-none rounded-xl text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setEditForm((p) => ({ ...p, description: buildPropertyDescription(p) }))}
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <Sparkles className="h-3 w-3" /> Regenerate with AI
                              </button>
                            </div>
                          )}

                          {/* Amenities / Highlights */}
                          {((editForm.amenities || []).length > 0 || allHighlights.length > 0) && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Amenities & Highlights
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {(editForm.amenities || []).map((a: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
                                  >
                                    {a}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditForm((p) => ({
                                          ...p,
                                          amenities: (p.amenities || []).filter((_: any, idx: number) => idx !== i),
                                        }))
                                      }
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
                                  placeholder="Add amenity"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && newAmenity.trim()) {
                                      e.preventDefault();
                                      setEditForm((p) => ({
                                        ...p,
                                        amenities: [...(p.amenities || []), newAmenity.trim()],
                                      }));
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
                                      setEditForm((p) => ({
                                        ...p,
                                        amenities: [...(p.amenities || []), newAmenity.trim()],
                                      }));
                                      setNewAmenity("");
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <SheetFooter className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] -mx-6 px-6 gap-2 flex-row">
                          <Button variant="outline" className="flex-1" onClick={() => setShowEditSheet(false)}>
                            Cancel
                          </Button>
                          <Button
                            className="flex-1 bg-gradient-to-r from-primary to-emerald-500 text-white"
                            onClick={() => {
                              setShowEditSheet(false);
                              toast.success("Changes saved to preview");
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" /> Save changes
                          </Button>
                        </SheetFooter>
                      </SheetContent>
                    </Sheet>
                  </motion.div>
                );
              })()}
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

    {/* Selected Category Badge - shows what user selected */}
    {category && (
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs text-muted-foreground">Selected:</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
          {CATEGORY_OPTIONS.find((opt) => opt.id === category)?.emoji}
          {CATEGORY_OPTIONS.find((opt) => opt.id === category)?.label}
        </span>
      </div>
    )}

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
                      // Count-style number fields (totals, counts) should NOT get measurement-unit chips.
                      const isCountField =
                        /^(total_(plots|units|towers|floors|flats|villas|shops|rooms|cabins|seats|desks|blocks|buildings|members)|no_of_|num_|number_of_|bedrooms|bathrooms|balconies|parking|floor_number)/i.test(
                          field.id,
                        );
                      const fidCanon = canonId(field.id);
                      // Fields that handle their own suggestions via `suggestions` state — skip generic chips.
                      const HANDLED_BY_CUSTOM = new Set([
                        "price_per_unit",
                        "bhk",
                        "bathrooms",
                        "floor_number",
                        "total_plots",
                        "total_towers",
                        "towers",
                        "floors_per_tower",
                        "total_units",
                        "units",
                        ...Object.keys(COUNT_FIELD_LABELS),
                      ]);
                      if (HANDLED_BY_CUSTOM.has(fidCanon)) {
                        return null;
                      }
                      const sType =
                        field.suggestionType ||
                        (/rent/i.test(field.id)
                          ? "rental_duration"
                          : /price|amount|cost|budget/i.test(field.id)
                            ? "price"
                            : !isCountField && /area|size|sqft|sqyd|land|plot_(size|area)|built/i.test(field.id)
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
                      } else if (canonId(field?.id) === "total_plots") {
                        chips = getPlotSuggestions(String(value));
                      } else if (canonId(field?.id) === "total_towers" || canonId(field?.id) === "towers") {
                        const num = String(value).replace(/[^\d]/g, "");
                        if (num && /^\d+$/.test(num)) {
                          const n = parseInt(num, 10);
                          chips = [
                            {
                              value: `${num} ${n === 1 ? "Tower" : "Towers"}`,
                              label: `${num} ${n === 1 ? "Tower" : "Towers"}`,
                            },
                          ];
                        }
                      } else if (canonId(field?.id) === "floors_per_tower") {
                        const num = String(value).replace(/[^\d]/g, "");
                        if (num && /^\d+$/.test(num)) {
                          const n = parseInt(num, 10);
                          chips = [
                            {
                              value: `${num} ${n === 1 ? "Floor" : "Floors"}`,
                              label: `${num} ${n === 1 ? "Floor" : "Floors"}`,
                            },
                          ];
                        }
                      } else if (canonId(field?.id) === "total_units" || canonId(field?.id) === "units") {
                        const num = String(value).replace(/[^\d]/g, "");
                        if (num && /^\d+$/.test(num)) {
                          const n = parseInt(num, 10);
                          chips = [
                            {
                              value: `${num} ${n === 1 ? "Unit" : "Units"}`,
                              label: `${num} ${n === 1 ? "Unit" : "Units"}`,
                            },
                          ];
                        }
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
                            onChange={(e) => {
                              const val = e.target.value;

                              setValue(val);

                              const fid = canonId(field?.id);

                              // ============================================
                              // BHK Suggestions
                              // ============================================

                              if (fid === "bhk") {
                                setSuggestions(getBhkSuggestions(val));
                                return;
                              }

                              // ============================================
                              // PRICE PER UNIT Suggestions
                              // ============================================

                              if (fid === "price_per_unit") {
                                setSuggestions(getPriceUnitSuggestions(val));
                                return;
                              }

                              if (fid === "bathrooms") {
                                setSuggestions(getBathroomSuggestions(val));
                                return;
                              }

                              if (fid === "floor_number") {
                                setSuggestions(getFloorSuggestions(val));

                                return;
                              }

                              // ============================================
                              // TOWER FIELDS Suggestions
                              // ============================================
                              if (fid === "total_towers" || fid === "towers") {
                                const num = val.replace(/[^\d]/g, "");
                                if (num && /^\d+$/.test(num)) {
                                  const n = parseInt(num, 10);
                                  setSuggestions([`${num} ${n === 1 ? "Tower" : "Towers"}`]);
                                } else {
                                  setSuggestions([]);
                                }
                                return;
                              }

                              if (fid === "floors_per_tower") {
                                const num = val.replace(/[^\d]/g, "");
                                if (num && /^\d+$/.test(num)) {
                                  const n = parseInt(num, 10);
                                  setSuggestions([`${num} ${n === 1 ? "Floor" : "Floors"}`]);
                                } else {
                                  setSuggestions([]);
                                }
                                return;
                              }

                              // ============================================
                              // COUNT FIELDS (total_units, units, etc.)
                              // ============================================
                              if (fid === "total_units" || fid === "units") {
                                const num = val.replace(/[^\d]/g, "");
                                if (num && /^\d+$/.test(num)) {
                                  const n = parseInt(num, 10);
                                  setSuggestions([`${num} ${n === 1 ? "Unit" : "Units"}`]);
                                } else {
                                  setSuggestions([]);
                                }
                                return;
                              }

                              const countChips = getCountSuggestions(val, fid);
                              if (countChips.length) {
                                setSuggestions(countChips);
                                return;
                              }

                              // ============================================
                              // CLEAR SUGGESTIONS
                              // ============================================

                              setSuggestions([]);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                const fid = canonId(field?.id);

                                // ============================================
                                // BLOCK INVALID BHK
                                // ============================================

                                if (fid === "bhk" && !BHK_PATTERN.test(String(value).trim())) {
                                  return;
                                }

                                // ============================================
                                // BLOCK INVALID PRICE UNIT
                                // ============================================

                                if (fid === "price_per_unit" && !PRICE_UNIT_PATTERN.test(String(value).trim())) {
                                  return;
                                }

                                // ============================================
                                // BLOCK INVALID BATHROOM
                                // ============================================

                                if (fid === "bathrooms" && !BATHROOM_PATTERN.test(String(value).trim())) {
                                  return;
                                }

                                if (fid === "floor_number" && !FLOOR_PATTERN.test(String(value).trim())) {
                                  return;
                                }

                                if (
                                  (fid === "flat_size" || fid === "built_up_area" || fid === "land_size") &&
                                  !MEASUREMENT_PATTERN.test(String(value).trim())
                                ) {
                                  return;
                                }

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
                      disabled={
                        loadingNext ||
                        // BHK
                        (canonId(field?.id) === "bhk" && !BHK_PATTERN.test(String(value).trim())) ||
                        // Price Per Unit
                        (canonId(field?.id) === "price_per_unit" && !PRICE_UNIT_PATTERN.test(String(value).trim())) ||
                        // Measurement Fields (must contain unit)
                        ((canonId(field?.id) === "flat_size" ||
                          canonId(field?.id) === "area" ||
                          canonId(field?.id) === "built_area" ||
                          canonId(field?.id) === "built_up_area" ||
                          canonId(field?.id) === "land_size" ||
                          canonId(field?.id) === "plot_area" ||
                          canonId(field?.id) === "plot_size" ||
                          canonId(field?.id) === "road_width" ||
                          canonId(field?.id) === "carpet_area") &&
                          !MEASUREMENT_PATTERN.test(String(value).trim())) ||
                        // Bathrooms
                        (canonId(field?.id) === "bathrooms" && !BATHROOM_PATTERN.test(String(value).trim())) ||
                        // Floor Number
                        (canonId(field?.id) === "floor_number" && !FLOOR_PATTERN.test(String(value).trim())) ||
                        // Total Floors
                        (canonId(field?.id) === "total_floors" && !FLOOR_PATTERN.test(String(value).trim())) ||
                        // Rent / Price fields - plain number not allowed

                        ((canonId(field?.id) === "monthly_rent" ||
                          canonId(field?.id) === "rent" ||
                          canonId(field?.id) === "rent_amount" ||
                          canonId(field?.id) === "total_price" ||
                          canonId(field?.id) === "price_per_unit") &&
                          /^\d+$/.test(String(value).trim())) ||
                        // Total Plots
                        (canonId(field?.id) === "total_plots" && !/^\d+\s?plots?$/i.test(String(value).trim())) ||
                        // Total Towers
                        (canonId(field?.id) === "total_towers" && !/^\d+\s?towers?$/i.test(String(value).trim())) ||
                        (canonId(field?.id) === "towers" && !/^\d+\s?towers?$/i.test(String(value).trim())) ||
                        // Floors per Tower
                        (canonId(field?.id) === "floors_per_tower" && !/^\d+\s?floors?$/i.test(String(value).trim())) ||
                        // Total Units
                        ((canonId(field?.id) === "total_units" || canonId(field?.id) === "units") &&
                          !/^\d+\s?units?$/i.test(String(value).trim()))
                      }
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
  // Defensive: never render an invalid message — guard against undefined/null
  // shapes that could otherwise crash the entire chat and trigger the global
  // error boundary.
  if (!msg || typeof msg !== "object") {
    console.warn("[Bubble] skipped invalid msg", msg);
    return null;
  }

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
        <img
          src={(msg as any).url}
          alt=""
          className="rounded-xl max-h-64 object-cover"
          loading="lazy"
          decoding="async"
        />
        {(msg as any).caption && <div className="px-2 py-1 text-xs opacity-90">{(msg as any).caption}</div>}
      </div>
    );
  }

  // Coerce non-string text safely; React cannot render objects directly.
  const text = (msg as any).text;
  const safeText =
    text === null || text === undefined
      ? ""
      : typeof text === "string" || typeof text === "number"
        ? String(text)
        : (() => {
            try {
              return JSON.stringify(text);
            } catch {
              return "";
            }
          })();

  return <div className={base}>{safeText}</div>;
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
