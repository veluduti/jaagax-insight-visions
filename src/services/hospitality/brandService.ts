import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { roomCapacity } from "./inventoryRules";
import type { PortfolioData, PortfolioHotel } from "./portfolioService";

const sb = supabase as any;
const text = z.string().trim().max(3000).default("");
const url = z.string().url().refine(v => v.startsWith("https://"), "Use an HTTPS address").or(z.literal("")).default("");
export const STANDARD_LABELS = { service: "Service Standards", rooms: "Room Standards", dining: "F&B Standards", cleanliness: "Cleanliness & Hygiene", guest: "Guest Experience", sustainability: "Sustainability" };
export const POLICY_LABELS = { check_in_out: "Check-in / Check-out Policy", cancellation: "Cancellation & Refund Policy", children: "Children & Extra Bed Policy", pets: "Pet Policy", guest_rules: "House Rules" };
export const brandSchema = z.object({
  name: z.string().trim().min(2).max(160), code: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/),
  type: z.enum(["Hotel Chain", "Hotel Brand", "Independent Collection"]).default("Hotel Chain"),
  parent_company: z.string().trim().max(160).default(""), tagline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(250).default(""), website: url, category: z.string().trim().max(100).default(""), positioning: z.string().trim().max(100).default(""),
  logo: url, light_logo: url, favicon: url, primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal("")).default(""), secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal("")).default(""), assets: z.array(url).max(30).default([]),
  standards: z.record(z.string().max(100), text).default({}), policies: z.record(z.string().max(100), text).default({}),
  shared: z.object({ currency: z.string().regex(/^$|^[A-Z]{3}$/).default(""), tax_profile: text, meal_plan: text, cancellation_window: text, check_in: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/).default(""), check_out: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/).default(""), languages: text, payment_options: text }).default({}),
  governance: z.object({ use_branding: z.boolean().default(true), enforce_standards: z.boolean().default(false), apply_policies: z.boolean().default(true), allow_overrides: z.boolean().default(true), require_approval: z.boolean().default(false) }).default({}),
  communication: z.object({ toll_free: text, email: z.string().email().or(z.literal("")).default(""), support: text, website: url }).default({}),
  status: z.enum(["active", "draft"]).default("draft"), approval: z.enum(["approved", "pending"]).default("approved"),
});
export type BrandSettings = z.infer<typeof brandSchema>;
export type BrandRecord = { id: string; partner_id: string; legal_name: string; updated_at: string; brand_settings: BrandSettings; pending: BrandSettings | null };
export function emptyBrand() { return brandSchema.parse({ name: "", code: "" } as never); }
export function newBrand(): BrandSettings { return { ...brandSchema.parse({ name: "New Brand", code: "NEW" }), name: "", code: "" }; }
export async function loadBrands(partnerId?: string): Promise<BrandRecord[]> {
  let q = sb.from("partner_businesses").select("id,partner_id,legal_name,brand_settings,updated_at").not("brand_settings", "is", null).order("updated_at", { ascending: false });
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q; if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, brand_settings: brandSchema.parse(r.brand_settings), pending: r.brand_settings.pending ? brandSchema.parse(r.brand_settings.pending) : null }));
}
export async function brandAction(partnerId: string, action: "save" | "map" | "unmap" | "override" | "inherit" | "approve" | "reject" | "delete", id: string | null, settings?: BrandSettings, hotelIds: string[] = []) {
  z.string().uuid().parse(partnerId); if (id) z.string().uuid().parse(id); z.array(z.string().uuid()).parse(hotelIds);
  const { data, error } = await sb.rpc("partner_brand_action", { _partner_id: partnerId, _action: action, _brand_id: id, _settings: settings ? brandSchema.parse(settings) : null, _hotel_ids: hotelIds });
  if (error) throw new Error(error.message); return data as string;
}
export async function loadBrandActivity(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await sb.from("hospitality_audit_log").select("id,action,entity_id,created_at").eq("entity", "property_brand").in("entity_id", ids).order("created_at", { ascending: false }).limit(100);
  if (error) throw error; return (data ?? []) as { id: string; action: string; entity_id: string; created_at: string }[];
}
export function validateBrandAsset(file: Pick<File, "type" | "size">) {
  if (!["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"].includes(file.type)) throw new Error("Choose a PNG, JPG, WEBP or ICO image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller");
}
export async function uploadBrandAsset(userId: string, file: File) {
  validateBrandAsset(file); const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico" }[file.type];
  const path = `${userId}/brand-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("hotel-photos").upload(path, file, { contentType: file.type }); if (error) throw error;
  return supabase.storage.from("hotel-photos").getPublicUrl(path).data.publicUrl;
}
export function brandHotels(data: PortfolioData, id: string) { return data.hotels.filter(h => (h as PortfolioHotel & { brand_id?: string }).brand_id === id); }
export function brandCompliance(hotel: PortfolioHotel, s: BrandSettings): { met: number; total: number } {
  const defaults = hotel.type_details?.brand_defaults;
  const tests: boolean[] = [];
  for (const [k, v] of Object.entries(s.standards)) if (v) tests.push(hotel.type_details?.brand_standard_checks?.[k] === true);
  if (s.governance.apply_policies) for (const [k, v] of Object.entries(s.policies)) if (v) tests.push(hotel.policies?.[k] === v);
  if (s.shared.check_in) tests.push(hotel.check_in_time === s.shared.check_in);
  if (s.shared.check_out) tests.push(hotel.check_out_time === s.shared.check_out);
  if (s.governance.use_branding) tests.push(defaults?.name === s.name);
  return { met: tests.filter(Boolean).length, total: tests.length };
}
export function brandRooms(data: PortfolioData, ids: string[]) { return data.rooms.filter(r => ids.includes(r.hotel_id) && r.is_active !== false).reduce((sum, r) => sum + roomCapacity(r), 0); }