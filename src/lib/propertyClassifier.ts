// Shared property classification logic
// Uses the SAME rules as the home-page filters so submission and discovery agree.

export type PropertyTier = "draft" | "basic" | "featured";

export interface ClassifyInput {
  title?: string | null;
  type?: string | null; // propertyType
  listing_type?: string | null; // propertyStatus (sale/rent)
  city?: string | null;
  locality?: string | null;
  price?: number | string | null; // totalPrice
  bhk?: number | string | null;
  area_sqft?: number | string | null; // carpet/built-up area
  images?: any[] | null;
}

const has = (v: unknown) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  return true;
};

export function classifyProperty(p: ClassifyInput): PropertyTier {
  // DRAFT — any of the 3 absolute essentials missing
  if (!has(p.title) || !has(p.type) || !has(p.city)) {
    return "draft";
  }

  const imageCount = Array.isArray(p.images) ? p.images.length : 0;

  const isFeatured =
    has(p.title) &&
    has(p.type) &&
    has(p.listing_type) &&
    has(p.city) &&
    has(p.locality) &&
    has(p.price) &&
    has(p.bhk) &&
    has(p.area_sqft) &&
    imageCount >= 2;

  return isFeatured ? "featured" : "basic";
}

export function getMissingForFeatured(p: ClassifyInput): string[] {
  const missing: string[] = [];
  if (!has(p.title)) missing.push("Title");
  if (!has(p.type)) missing.push("Property type");
  if (!has(p.listing_type)) missing.push("Sale/Rent status");
  if (!has(p.city)) missing.push("City");
  if (!has(p.locality)) missing.push("Locality");
  if (!has(p.price)) missing.push("Price");
  if (!has(p.bhk)) missing.push("BHK");
  if (!has(p.area_sqft)) missing.push("Carpet area");
  const imageCount = Array.isArray(p.images) ? p.images.length : 0;
  if (imageCount < 5) missing.push(`${5 - imageCount} more image(s)`);
  return missing;
}
