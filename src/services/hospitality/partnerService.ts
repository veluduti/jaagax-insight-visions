import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type PartnerAccount = { id: string; owner_user_id: string; display_name: string; phone: string | null; email: string | null };
export type PartnerBusiness = { id: string; partner_id: string; legal_name: string; gstin: string | null; pan: string | null; verification_status: string };
export type PartnerProperty = {
  id: string; name: string; city: string | null; locality: string | null; business_id: string | null;
  business_types: string[] | null; onboarding_status: string; quality_score: number; is_active: boolean | null;
  type_details: Record<string, unknown> | null;
};
export type QualityReport = { score: number; checks: Record<string, boolean> };

/** Returns (creating if needed) the signed-in user's partner account. */
export async function getOrCreatePartnerAccount(userId: string, fallbackName: string): Promise<PartnerAccount> {
  const { data } = await sb.from("partner_accounts").select("*").eq("owner_user_id", userId).maybeSingle();
  if (data) return data;
  const { data: created, error } = await sb.from("partner_accounts")
    .insert({ owner_user_id: userId, display_name: fallbackName || "My hospitality group" }).select().single();
  if (error) throw error;
  return created;
}

export async function updatePartnerAccount(id: string, patch: Partial<PartnerAccount>) {
  const { error } = await sb.from("partner_accounts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function listBusinesses(partnerId: string): Promise<PartnerBusiness[]> {
  const { data, error } = await sb.from("partner_businesses").select("*").eq("partner_id", partnerId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createBusiness(partnerId: string, legal_name: string, gstin?: string) {
  const name = legal_name.trim();
  if (name.length < 2) throw new Error("Please enter the business name");
  const { error } = await sb.from("partner_businesses").insert({ partner_id: partnerId, legal_name: name, gstin: gstin?.trim() || null });
  if (error) throw error;
}

export async function listProperties(userId: string): Promise<PartnerProperty[]> {
  const { data, error } = await sb.from("partner_hotels")
    .select("id,name,city,locality,business_id,business_types,onboarding_status,quality_score,is_active,type_details")
    .eq("manager_id", userId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function assignPropertyToBusiness(hotelId: string, businessId: string) {
  const { error } = await sb.from("partner_hotels").update({ business_id: businessId }).eq("id", hotelId);
  if (error) throw error;
}

export async function saveTypeDetails(hotelId: string, details: Record<string, unknown>) {
  const { error } = await sb.from("partner_hotels").update({ type_details: details }).eq("id", hotelId);
  if (error) throw error;
}

export async function getQuality(hotelId: string): Promise<QualityReport | null> {
  const { data, error } = await sb.rpc("compute_hotel_quality", { _hotel_id: hotelId });
  if (error) throw error;
  if (data) await sb.from("partner_hotels").update({ quality_score: data.score }).eq("id", hotelId);
  return data;
}

/** Partner asks for publishing; admin approves in the hospitality admin panel. */
export async function requestPublish(hotelId: string) {
  const { error } = await sb.from("partner_hotels").update({ onboarding_status: "pending_review" }).eq("id", hotelId);
  if (error) throw error;
}
