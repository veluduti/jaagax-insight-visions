/**
 * Agent public-profile derivation helpers.
 *
 * Everything here derives from real `agents` row data (and related counts)
 * only — no invented stats, services, badges or areas. When a value is
 * unknown the corresponding UI element is simply not produced.
 */

import { toArray } from "./agentDiscovery";

export interface AgentProfileLike {
  id?: string | null;
  agent_code?: string | null;
  name?: string | null;
  agency_name?: string | null;
  bio?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  cities_served?: string | string[] | null;
  localities_served?: string | string[] | null;
  languages?: string | string[] | null;
  languages_spoken?: string[] | null;
  specializations?: string[] | null;
  experience_years?: number | null;
  sales_count?: number | null;
  rent_count?: number | null;
  avg_rating?: number | null;
  total_ratings?: number | null;
  trust_score?: number | null;
  verified?: boolean | null;
  office_address?: string | null;
  created_at?: string | null;
}

/* ---------------- Specialization catalog ---------------- */

export interface SpecializationDef {
  id: string;
  label: string;
  subtitle: string;
  /** lowercase keywords matched against the agent's saved specializations */
  keywords: RegExp;
}

export const SPECIALIZATION_CATALOG: SpecializationDef[] = [
  { id: "residential", label: "Residential", subtitle: "Apartments, Villas, Independent Houses", keywords: /residential|apartment|flat|villa|house|home/ },
  { id: "commercial", label: "Commercial", subtitle: "Office Spaces, Shops, Retail", keywords: /commercial|office|retail|shop|showroom/ },
  { id: "plots", label: "Plots & Land", subtitle: "Residential & Commercial Plots", keywords: /plot|land|agricultur|farm/ },
  { id: "rental", label: "Rental Properties", subtitle: "Homes, Apartments, PGs, Co-living", keywords: /rent|lease|pg|hostel|co-living|coliving/ },
  { id: "investment", label: "Investment Advisory", subtitle: "High ROI Opportunities", keywords: /invest|roi|advisory/ },
  { id: "nri", label: "NRI Assistance", subtitle: "Remote buying and management", keywords: /nri|remote|relocation/ },
  { id: "management", label: "Property Management", subtitle: "End-to-end property care", keywords: /management|facility|maintenance/ },
  { id: "luxury", label: "Luxury Homes", subtitle: "Premium villas & penthouses", keywords: /luxury|premium|penthouse/ },
];

/** Specializations the agent actually saved, mapped to catalog entries. */
export const agentSpecializations = (agent: AgentProfileLike): SpecializationDef[] => {
  const text = (agent.specializations || []).join(" ").toLowerCase();
  if (!text.trim()) return [];
  return SPECIALIZATION_CATALOG.filter((s) => s.keywords.test(text));
};

/* ---------------- Hero service / type chips ---------------- */

export interface Chip {
  id: string;
  label: string;
}

/** Service chips (Buy/Sell/Rent/Investment) derived from counts + specializations. */
export const agentServiceChips = (agent: AgentProfileLike): Chip[] => {
  const text = (agent.specializations || []).join(" ").toLowerCase();
  const sales = (agent.sales_count || 0) > 0;
  const rent = (agent.rent_count || 0) > 0;
  const chips: Chip[] = [];
  if (sales || /buy|sale|residential/.test(text)) chips.push({ id: "buy", label: "Buy" });
  if (sales || /sell|sale/.test(text)) chips.push({ id: "sell", label: "Sell" });
  if (rent || /rent|lease|pg|co-living|coliving/.test(text)) chips.push({ id: "rent", label: "Rent" });
  if (/invest/.test(text)) chips.push({ id: "investment", label: "Investment" });
  // dedupe by id
  return chips.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
};

const TYPE_CHIPS: Array<{ id: string; label: string; keywords: RegExp }> = [
  { id: "apartment", label: "Apartment", keywords: /apartment|flat|residential/ },
  { id: "villa", label: "Villa", keywords: /villa|house|bungalow|independent/ },
  { id: "plot", label: "Plot / Land", keywords: /plot|land|agricultur/ },
  { id: "commercial", label: "Commercial", keywords: /commercial|office|retail|shop/ },
  { id: "pg", label: "PG / Co-living", keywords: /pg|co-living|coliving|hostel/ },
];

/** Property-type chips derived from saved specializations only. */
export const agentTypeChips = (agent: AgentProfileLike): Chip[] => {
  const text = (agent.specializations || []).join(" ").toLowerCase();
  if (!text.trim()) return [];
  return TYPE_CHIPS.filter((t) => t.keywords.test(text)).map(({ id, label }) => ({ id, label }));
};

/* ---------------- Trust items (Overview badge row) ---------------- */

export interface TrustItem {
  id: string;
  title: string;
  subtitle: string;
}

/**
 * Trust badges shown on the profile. Each requires real backing data —
 * nothing is shown just for decoration.
 */
export const agentTrustItems = (agent: AgentProfileLike, kycVerified: boolean): TrustItem[] => {
  const items: TrustItem[] = [];
  if (agent.verified || kycVerified) {
    items.push({ id: "verified", title: "Verified Agent", subtitle: "Background checked" });
  }
  if (agentAreasList(agent).length > 0) {
    items.push({ id: "local", title: "Local Expert", subtitle: "In-depth market knowledge" });
  }
  if ((agent.experience_years || 0) >= 3) {
    items.push({ id: "experienced", title: "Experienced", subtitle: `${agent.experience_years}+ years in the field` });
  }
  if (Number(agent.avg_rating || 0) >= 4.5 && (agent.total_ratings || 0) >= 5) {
    items.push({ id: "top-rated", title: "Top Rated", subtitle: "Loved by customers" });
  }
  if (kycVerified) {
    items.push({ id: "certified", title: "JaagaX Certified", subtitle: "Trained & verified" });
  }
  return items;
};

/* ---------------- Stats ---------------- */

export interface AgentStats {
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  propertiesHandled: number;
  happyClients: number;
}

export const agentProfileStats = (agent: AgentProfileLike): AgentStats => ({
  rating: Number(agent.avg_rating || 0),
  reviewCount: agent.total_ratings || 0,
  yearsExperience: agent.experience_years || 0,
  propertiesHandled: (agent.sales_count || 0) + (agent.rent_count || 0),
  // Customers who left a review — the only real "happy clients" signal we have.
  happyClients: agent.total_ratings || 0,
});

/* ---------------- Areas ---------------- */

/** Deduped, pretty-cased list of areas the agent serves. */
export const agentAreasList = (agent: AgentProfileLike): string[] => {
  const seen = new Map<string, string>();
  for (const raw of [
    ...toArray(agent.cities_served),
    ...toArray(agent.localities_served),
    agent.city,
    agent.district,
    agent.state,
  ]) {
    const label = String(raw || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (!seen.has(key)) seen.set(key, label);
  }
  return Array.from(seen.values());
};

/* ---------------- Contact links ---------------- */

/** Digits-only phone for wa.me / tel: links; null when unusable. */
export const phoneDigits = (phone?: string | null): string | null => {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Normalise Indian numbers: strip leading 0 or 91 country code duplication
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

export const buildWhatsAppLink = (phone: string | null | undefined, message: string): string | null => {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

export const buildTelLink = (phone: string | null | undefined): string | null => {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
};

export const buildMailLink = (
  email: string | null | undefined,
  subject: string,
  body: string,
): string | null => {
  const clean = (email || "").trim();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return null;
  return `mailto:${clean}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/* ---------------- Meetings ---------------- */

/** Static time-slot choices for the meeting scheduler (UI options, not data). */
export const MEETING_TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM",
] as const;

export const MEETING_STATUSES = ["pending", "confirmed", "declined", "completed"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

/* ---------------- Pricing display ---------------- */

export const formatAgentPropertyPrice = (n?: number | null): string => {
  if (n == null || isNaN(Number(n)) || Number(n) <= 0) return "Price on Request";
  const v = Number(n);
  return v >= 1e7
    ? `₹${(v / 1e7).toFixed(2)} Cr`
    : v >= 1e5
      ? `₹${(v / 1e5).toFixed(2)} L`
      : `₹${v.toLocaleString("en-IN")}`;
};
