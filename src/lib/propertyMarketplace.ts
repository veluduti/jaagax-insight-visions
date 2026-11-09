import { getPublicPropertyView } from "@/lib/publicPropertyView";
import { getMainTypeSubtypes } from "@/config/propertyMainTypes";

export type MarketplaceProperty = Record<string, any> & { id: string; title: string };
export type MarketplaceFilters = { city: string; query: string; intent: string; types: string[]; beds: string[]; min: number; max: number; statuses: string[]; amenities: string[]; listedBy: string[]; verified: boolean };
export const emptyMarketplaceFilters: MarketplaceFilters = { city: "", query: "", intent: "buy", types: [], beds: [], min: 0, max: 0, statuses: [], amenities: [], listedBy: [], verified: false };
export function isPublishedProperty(p: MarketplaceProperty) {
  return p.is_draft !== true && p.is_live === true && ["live", "live_verified"].includes(p.lifecycle_status) && (!p.expiry_date || new Date(p.expiry_date).getTime() > Date.now());
}
export function publicMarketplaceProperty(row: MarketplaceProperty): MarketplaceProperty {
  const view = getPublicPropertyView(row);
  if (!view) return row;
  const { _raw, ...values } = view;
  const rawAmenities = values.amenities as unknown;
  const list = rawAmenities && typeof rawAmenities === 'object' && !Array.isArray(rawAmenities)
    ? (rawAmenities as Record<string, unknown>).list
    : rawAmenities;
  const amenities = Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string')
    : typeof list === 'string' ? list.split(',').map(v => v.trim()).filter(Boolean) : [];
  return { ...row, ...values, amenities };
}
export function hasPropertyPin(p: MarketplaceProperty) {
  return p.latitude != null && p.longitude != null && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) && Math.abs(Number(p.latitude)) <= 90 && Math.abs(Number(p.longitude)) <= 180 && !(Number(p.latitude) === 0 && Number(p.longitude) === 0);
}
const norm = (s: unknown) => String(s ?? "").toLowerCase().trim();
export function matchesMarketplaceProperty(p: MarketplaceProperty, f: MarketplaceFilters) {
  if (!isPublishedProperty(p)) return false;
  if (f.city && ![p.city, p.locality].some(v => norm(v).includes(norm(f.city)))) return false;
  if (f.query && ![p.title, p.city, p.locality, p.description, p.project_name].some(v => norm(v).includes(norm(f.query)))) return false;
  const intent = norm(p.listing_type);
  if (f.intent === "rent" ? !/rent|lease/.test(intent) : f.intent === "buy" || f.intent === "invest" ? /rent|lease/.test(intent) : false) return false;
  if (f.types.length && !f.types.some(t => (getMainTypeSubtypes(t) ?? [t]).some(s => norm(p.type) === norm(s)))) return false;
  const beds = Number(p.bedrooms ?? p.bhk);
  if (f.beds.length && !f.beds.some(b => b === "5+" ? beds >= 5 : beds === Number(b))) return false;
  if (f.min > 0 && !(Number(p.price) >= f.min)) return false;
  if (f.max > 0 && !(Number(p.price) > 0 && Number(p.price) <= f.max)) return false;
  if (f.statuses.length && !f.statuses.includes(p.completion_stage)) return false;
  if (f.verified && !p.verified) return false;
  if (f.listedBy.length && !f.listedBy.includes(p.listed_by)) return false;
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  return f.amenities.every(a => amenities.includes(a));
}
export function sortMarketplaceProperties(rows: MarketplaceProperty[], sort: string) {
  return [...rows].sort((a,b) => {
    if (sort === "price-asc" || sort === "price-desc") {
      const ap = Number(a.price) > 0 ? Number(a.price) : Infinity;
      const bp = Number(b.price) > 0 ? Number(b.price) : Infinity;
      if (!Number.isFinite(ap) || !Number.isFinite(bp)) return ap === bp ? 0 : ap === Infinity ? 1 : -1;
      return sort === "price-asc" ? ap - bp : bp - ap;
    }
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return Number(b.is_featured || 0) - Number(a.is_featured || 0) || Number(b.trust_score || 0) - Number(a.trust_score || 0);
  });
}
