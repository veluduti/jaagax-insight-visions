import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { HOSPITALITY_CATEGORIES } from "@/config/hospitalityCategories";
import { propertySetupSchema, loadPartnerOverview, type OverviewData } from "./partnerDashboardService";

const sb = supabase as any;
const optionalPattern = (pattern: RegExp, message: string) => z.string().trim().toUpperCase().refine(value => value === "" || pattern.test(value), message);
export const wizardSchema = z.object({
  property: propertySetupSchema.extend({ business_types: z.array(z.string().refine(v => HOSPITALITY_CATEGORIES.some(c => c.key === v))).min(1), summary: z.string().max(250), brand_name: z.string().max(160), property_code: z.string().max(60), website: z.union([z.string().url().startsWith("https://"), z.literal("")]), policies: z.record(z.string().max(100), z.string().max(3000)) }),
  business: z.object({ owner_name: z.string().max(160), legal_name: z.string().max(160), entity_type: z.string().max(100), cin: z.string().max(30), registered_address: z.string().max(500), gst_number: optionalPattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN."), pan_number: optionalPattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN (5 letters, 4 digits, 1 letter).") }),
  documents: z.record(z.string(), z.string().max(500)),
  bank: z.object({ account_holder_name: z.string().max(160), bank_name: z.string().max(160), account_number: optionalPattern(/^\d{6,24}$/, "Enter a bank account number containing 6–24 digits."), ifsc_code: optionalPattern(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter the 11-character IFSC from your bank: 4 letters, 0, then 6 letters or digits."), upi_id: z.string().max(100), account_type: z.enum(["Current", "Savings"]) }),
  settings: z.object({ step: z.number().int().min(0).max(10), notes: z.string().max(500), require_manual_review: z.boolean(), publish_after_approval: z.boolean() }),
});
export type WizardData = z.infer<typeof wizardSchema>;
export const setupSteps = ["Property Type", "Basic Information", "Business & Verification", "Location & Contact", "Media & Gallery", "Inventory & Pricing", "Amenities & Services", "Policies & Settings", "Bank & Payout", "Access & Team", "Review & Publish"];
export const documentSlots = [{ key: "business_registration_url", label: "Business Registration" }, { key: "gst_certificate_url", label: "GST Certificate" }, { key: "id_proof_url", label: "PAN Card" }, { key: "identity_proof_url", label: "Owner Identity" }, { key: "cancelled_cheque_url", label: "Cancelled Cheque" }, { key: "address_proof_url", label: "Address Proof" }, { key: "trade_license_url", label: "Trade Licence" }];

export function wizardValidationIssues(input: WizardData) {
  const result = wizardSchema.safeParse(input);
  if (result.success) return [];
  const labels: Record<string, string> = { ifsc_code: "IFSC Code", account_number: "Account Number", gst_number: "GST Number", pan_number: "PAN Number", contact_email: "Official Email", website: "Website (HTTPS)", images: "Property Photos" };
  const steps: Record<string, number> = { business_types: 0, name: 1, description: 1, summary: 1, brand_name: 1, property_code: 1, images: 4, amenities: 6, policies: 7, check_in_time: 7, check_out_time: 7 };
  return result.error.issues.map(issue => {
    const section = String(issue.path[0]), key = String(issue.path[1] ?? "");
    const step = section === "bank" ? 8 : section === "business" || section === "documents" ? 2 : section === "settings" ? 10 : steps[key] ?? 3;
    return { path: issue.path.join("."), key, step, label: labels[key] ?? key.replace(/_/g, " "), message: issue.message };
  });
}

export async function loadPropertyWizard(hotelId: string) {
  const [overview, application, payout, staff, audit] = await Promise.all([
    loadPartnerOverview(hotelId), sb.from("hotel_partner_applications").select("*").eq("setup_hotel_id", hotelId).maybeSingle(), sb.from("hotel_payout_settings").select("*").eq("hotel_id", hotelId).maybeSingle(), sb.from("hotel_staff").select("id,invited_email,role,is_active").eq("hotel_id", hotelId), sb.from("hospitality_audit_log").select("id,action,created_at,details").eq("entity", "property_setup").eq("entity_id", hotelId).order("created_at", { ascending: false }).limit(20),
  ]);
  for (const r of [application, payout, staff, audit]) if (r.error) throw r.error;
  const h = overview.hotel, a = application.data, b = payout.data;
  const form: WizardData = {
    property: { name: h.name ?? "", description: h.description ?? "", city: h.city ?? "", locality: h.locality ?? "", address: h.address ?? "", state: h.state ?? "", country: h.country ?? "", star_rating: h.star_rating ?? null, contact_phone: h.contact_phone ?? "", contact_email: h.contact_email ?? "", check_in_time: h.check_in_time ?? "", check_out_time: h.check_out_time ?? "", latitude: h.latitude ?? null, longitude: h.longitude ?? null, amenities: h.amenities ?? [], images: h.images ?? [], business_types: h.business_types ?? [], summary: h.type_details?.summary ?? "", brand_name: h.type_details?.brand_name ?? "", property_code: h.type_details?.property_code ?? "", website: h.type_details?.website ?? "", policies: Object.fromEntries(Object.entries(h.policies ?? {}).filter(([, v]) => typeof v === "string")) as Record<string, string> },
    business: { owner_name: a?.owner_name ?? "", legal_name: a?.company_name ?? "", entity_type: "", cin: "", registered_address: "", gst_number: a?.gst_number ?? "", pan_number: a?.pan_number ?? "", ...a?.setup_details?.business },
    documents: Object.fromEntries(documentSlots.map(s => [s.key, a?.[s.key] ?? ""])),
    bank: { account_holder_name: b?.account_holder_name ?? "", bank_name: b?.bank_name ?? "", account_number: b?.account_number ?? "", ifsc_code: b?.ifsc_code ?? "", upi_id: b?.upi_id ?? "", account_type: a?.setup_details?.bank_extra?.account_type ?? "Current" },
    settings: { step: 0, notes: "", require_manual_review: true, publish_after_approval: true, ...a?.setup_details?.settings },
  };
  return { overview, form, application: a, staff: staff.data ?? [], audit: audit.data ?? [] };
}
export function wizardReadiness(f: WizardData, overview: OverviewData) {
  const readiness = [f.property.business_types.length > 0, f.property.name.trim().length >= 2 && !!f.property.description.trim(), !!f.business.owner_name.trim() && !!f.business.legal_name.trim() && !!f.documents.business_registration_url && !!f.documents.identity_proof_url && (!f.business.gst_number || !!f.documents.gst_certificate_url), !!f.property.city.trim() && !!f.property.address.trim() && !!f.property.contact_email && !!f.property.contact_phone && Number.isFinite(f.property.latitude) && Number.isFinite(f.property.longitude), f.property.images.length >= 3, overview.rooms.some(r => r.is_active && Number(r.total_units) > 0 && (Number(r.base_price) > 0 || Number(r.monthly_price) > 0 || Number(r.weekly_price) > 0)), f.property.amenities.length > 0 || overview.services.length > 0, !!f.property.check_in_time && !!f.property.check_out_time && !!f.property.policies.guest_rules?.trim(), !!f.bank.account_holder_name && !!f.bank.bank_name && !!f.bank.account_number && !!f.bank.ifsc_code && !!f.documents.cancelled_cheque_url, true];
  for (const issue of wizardValidationIssues(f)) readiness[issue.step === 10 ? 1 : issue.step] = false;
  return readiness;
}
export async function savePropertyWizard(hotelId: string, input: WizardData, submit = false) {
  const data = wizardSchema.parse(input);
  const { error } = await sb.rpc("partner_save_property_setup", { _hotel_id: hotelId, _data: data, _submit: submit });
  if (error) throw error;
  window.dispatchEvent(new Event("partner-property-updated"));
}
export function validateSetupDocument(file: { type: string; size: number }) {
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a PDF, JPG, PNG or WebP file");
  if (file.size > 10 * 1024 * 1024) throw new Error("Documents must be 10 MB or smaller");
}
export async function uploadSetupDocument(userId: string, key: string, file: File) {
  validateSetupDocument(file);
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${userId}/${key}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("hotel-documents").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}
export async function openSetupDocument(path: string) {
  const { data, error } = await supabase.storage.from("hotel-documents").createSignedUrl(path, 120);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not open document");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}