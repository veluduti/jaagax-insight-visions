import { COLIVING_CATEGORIES, normalizeCategory } from "@/config/hospitalityCategories";
import { longStayQuote, type RentPlan } from "./longStayPricing";

type Room = { accommodation_kind?: string | null; attributes?: Record<string, unknown> | null; weekly_price?: number | null; monthly_price?: number | null; photos?: string[] | null };
type Property = { business_types?: string[] | null; type_details?: unknown; amenities?: string[] | null; tags?: string[] | null; images?: string[] | null };

export function isColivingProperty(h: Property, rooms: Room[] = []): boolean {
  return (h.business_types ?? []).some(t => normalizeCategory(t) === "coliving") || rooms.some(r => r.accommodation_kind?.startsWith("coliving_") || r.attributes?.business_type === "coliving");
}

export function colivingTypesOf(h: Property, rooms: Room[] = []): string[] {
  const d = (h.type_details && typeof h.type_details === "object" ? h.type_details : {}) as Record<string, unknown>;
  const attrs = rooms.map(r => r.attributes ?? {});
  const eligibility = attrs.flatMap(a => Array.isArray(a.eligibility) ? a.eligibility : []).map(v => String(v).toLowerCase());
  const facilities = [...(h.amenities ?? []), ...attrs.flatMap(a => Array.isArray(a.facilities) ? a.facilities : [])].map(v => String(v).toLowerCase());
  const genders = [d.gender, ...attrs.map(a => a.gender)].map(v => String(v ?? "").toLowerCase());
  const out = new Set<string>();
  if (eligibility.includes("working professionals")) out.add("professionals");
  if (eligibility.includes("students")) out.add("students");
  if (eligibility.includes("couples")) out.add("couples");
  if (genders.includes("female only")) out.add("women");
  if (genders.includes("male only")) out.add("men");
  if ((h.tags ?? []).some(t => /^(premium|luxury)$/i.test(t))) out.add("premium");
  if (d.workspace === true || facilities.some(f => /workspace|co.?working/.test(f))) out.add("workspace");
  if (d.pets === true || attrs.some(a => a.pets_allowed === true || a.pets_allowed === "Yes") || facilities.some(f => /pet.?friendly/.test(f))) out.add("pet");
  return COLIVING_CATEGORIES.filter(c => out.has(c.key)).map(c => c.key);
}

export function rentalDiscoveryPrice(rooms: Room[], plan: RentPlan): number | null {
  const prices = rooms.map(r => longStayQuote({ ...r, plan }).periodRent).filter(p => p > 0);
  return prices.length ? Math.min(...prices) : null;
}