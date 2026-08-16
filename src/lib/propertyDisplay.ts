/**
 * Display helpers for property listings.
 *
 * Golden rule: render EXACTLY what the owner entered.
 * - Never convert area units (sq ft stays sq ft, acre stays acre).
 * - Never invent images — only owner-uploaded media is shown.
 * - Never invent a price — show "Price on request" when none was given.
 */

export type AnyRow = Record<string, any>;

/** Owner-uploaded images only. No stock/default fallbacks anywhere. */
export function getPropertyImages(images: any): string[] {
  const raw: any[] = Array.isArray(images)
    ? images
    : typeof images === "string"
      ? images.split(/[\n,]/)
      : [];
  return raw
    .map((i) => (typeof i === "string" ? i : i?.url ?? i?.publicUrl ?? ""))
    .map((s: string) => String(s).trim())
    .filter((s: string) => s.length > 0);
}

const UNIT_LABELS: Record<string, string> = {
  "sq ft": "sq ft",
  sqft: "sq ft",
  "sq.ft": "sq ft",
  "sq m": "sq m",
  sqm: "sq m",
  "sq yd": "sq yd",
  "sq yard": "sq yd",
  acre: "acre",
  acres: "acre",
  gunta: "gunta",
  guntha: "gunta",
  cent: "cent",
  cents: "cent",
  hectare: "hectare",
};

export function normalizeAreaUnit(unit?: string | null): string | null {
  if (!unit) return null;
  const k = String(unit).trim().toLowerCase();
  return UNIT_LABELS[k] ?? String(unit).trim();
}

/**
 * Area exactly as entered: value + the owner's own unit.
 * Falls back to the legacy `area_sqft` column only when no raw value exists.
 */
export function formatArea(row: AnyRow): string | null {
  const value =
    row?.area_value != null && Number(row.area_value) > 0
      ? Number(row.area_value)
      : row?.area_sqft != null && Number(row.area_sqft) > 0
        ? Number(row.area_sqft)
        : null;
  if (value == null) return null;
  const unit = normalizeAreaUnit(row?.area_unit) ?? "sq ft";
  return `${value.toLocaleString("en-IN")} ${unit}`;
}

/** Price exactly as entered — Indian short form, or null when not provided. */
export function formatPrice(price: any): string | null {
  const n = Number(price);
  if (!isFinite(n) || n <= 0) return null;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/** "Apartment / Flat", "Villa", "Plot / Land"… as the owner selected it. */
export function getPropertyTypeLabel(row: AnyRow): string | null {
  const doc = row?.document_urls ?? {};
  const raw =
    row?.type ||
    doc.property_type ||
    doc.sub_type ||
    doc.residential_type ||
    row?.property_type ||
    null;
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Buy (sale) vs Rent, derived from listing_type. */
export function getListingIntent(row: AnyRow): "rent" | "sale" {
  const raw = String(row?.listing_type ?? row?.document_urls?.listing_type ?? "").toLowerCase();
  return raw.includes("rent") || raw.includes("lease") ? "rent" : "sale";
}

export function getListingIntentLabel(row: AnyRow): string {
  return getListingIntent(row) === "rent" ? "For Rent" : "For Sale";
}

/** Rent listings read as "₹20,000/mo". */
export function formatListingPrice(row: AnyRow): string | null {
  const p = formatPrice(row?.price);
  if (!p) return null;
  return getListingIntent(row) === "rent" ? `${p}/mo` : p;
}
