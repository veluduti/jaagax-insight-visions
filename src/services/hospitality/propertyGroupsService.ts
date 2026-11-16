import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type { PartnerBusiness } from "./partnerService";
import type { PortfolioData } from "./portfolioService";

const sb = supabase as any;
export const GROUP_ROLES = ["group_admin", "revenue_manager", "operations_manager"] as const;
export type GroupRole = typeof GROUP_ROLES[number];
export const GROUP_ROLE_LABEL: Record<GroupRole | "group_owner", string> = { group_owner: "Group Owner", group_admin: "Group Admin", revenue_manager: "Revenue Manager", operations_manager: "Operations Manager" };
export const GROUP_ROLE_SCOPE: Record<GroupRole, string> = { group_admin: "All", revenue_manager: "Rates, Inventory", operations_manager: "Bookings, Guests" };
export type GroupMember = { user_id: string; email: string; name: string; role: GroupRole; added_at: string };

export const groupSettingsSchema = z.object({
  code: z.string().trim().max(12).regex(/^[A-Za-z0-9-]*$/, "Code may only use letters, numbers and dashes").default(""),
  group_type: z.enum(["hotel_chain", "brand", "region", "property_type", "other"]).default("hotel_chain"),
  description: z.string().trim().max(250).default(""),
  logo_url: z.string().url().or(z.literal("")).default(""),
  status: z.enum(["active", "draft"]).default("active"),
  primary: z.boolean().default(false),
  visibility: z.enum(["private", "team", "public"]).default("private"),
  reporting: z.enum(["consolidated", "property"]).default("consolidated"),
  rate_control: z.enum(["property", "group"]).default("property"),
  master_amenities: z.boolean().default(false),
  common_policies: z.boolean().default(false),
  default_commission: z.number().min(0).max(50).default(15),
  members: z.array(z.object({ user_id: z.string().uuid(), email: z.string().email(), name: z.string(), role: z.enum(GROUP_ROLES), added_at: z.string() })).default([]),
});
export type GroupSettings = z.infer<typeof groupSettingsSchema>;
export type PropertyGroup = PartnerBusiness & { group_settings: GroupSettings; created_at: string };

export const readSettings = (raw: unknown): GroupSettings => { const r = groupSettingsSchema.safeParse(raw ?? {}); return r.success ? r.data : groupSettingsSchema.parse({}); };
export const defaultCode = (name: string) => name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();

async function audit(userId: string, groupId: string, action: string, details: Record<string, unknown> = {}) {
  await sb.from("hospitality_audit_log").insert({ actor_id: userId, entity: "property_group", entity_id: groupId, action, details });
}

export async function loadGroups(partnerId: string): Promise<PropertyGroup[]> {
  const { data, error } = await sb.from("partner_businesses").select("*").eq("partner_id", partnerId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((g: any) => ({ ...g, group_settings: readSettings(g.group_settings) }));
}
export async function loadGroupActivity(groupIds: string[]) {
  if (!groupIds.length) return [];
  const { data, error } = await sb.from("hospitality_audit_log").select("id,entity_id,action,details,created_at,actor_id").eq("entity", "property_group").in("entity_id", groupIds).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as { id: string; entity_id: string; action: string; details: any; created_at: string; actor_id: string }[];
}

const nameSchema = z.object({ legal_name: z.string().trim().min(2, "Group name needs at least 2 characters").max(160), gstin: z.string().trim().max(15).regex(/^$|^[0-9A-Z]{15}$/, "GSTIN must be 15 letters/numbers") });
export async function saveGroup(userId: string, partnerId: string, id: string | null, input: { legal_name: string; gstin: string; settings: Partial<GroupSettings> }, all: PropertyGroup[]) {
  const base = nameSchema.parse({ legal_name: input.legal_name, gstin: input.gstin.toUpperCase() });
  const current = id ? all.find(g => g.id === id)?.group_settings : undefined;
  const settings = groupSettingsSchema.parse({ ...(current ?? {}), ...input.settings });
  if (!settings.code) settings.code = defaultCode(base.legal_name);
  if (all.some(g => g.id !== id && g.group_settings.code.toUpperCase() === settings.code.toUpperCase())) throw new Error("Another group already uses this code");
  if (all.some(g => g.id !== id && g.legal_name.trim().toLowerCase() === base.legal_name.toLowerCase())) throw new Error("A group with this name already exists");
  const patch = { legal_name: base.legal_name, gstin: base.gstin || null, group_settings: settings, updated_at: new Date().toISOString() };
  const res = id ? await sb.from("partner_businesses").update(patch).eq("id", id).eq("partner_id", partnerId).select("id").single()
    : await sb.from("partner_businesses").insert({ ...patch, partner_id: partnerId }).select("id").single();
  if (res.error) throw res.error;
  const gid = res.data.id as string;
  if (settings.primary) for (const g of all.filter(g => g.id !== gid && g.group_settings.primary))
    await sb.from("partner_businesses").update({ group_settings: { ...g.group_settings, primary: false } }).eq("id", g.id).eq("partner_id", partnerId);
  await audit(userId, gid, id ? "Group settings updated" : "Group created", { name: base.legal_name });
  return gid;
}
export async function deleteGroup(userId: string, partnerId: string, id: string) {
  const { count, error } = await sb.from("partner_hotels").select("id", { count: "exact", head: true }).eq("business_id", id);
  if (error) throw error;
  if (count) throw new Error("Move or remove this group's properties first.");
  const res = await sb.from("partner_businesses").delete().eq("id", id).eq("partner_id", partnerId).select("id").single();
  if (res.error) throw res.error;
}
/** Assign (or remove with groupId=null) hotels; the DB trigger rejects groups not owned by the hotel owner. */
export async function assignHotels(userId: string, hotelIds: string[], groupId: string | null, fromGroupId: string | null, names: string[]) {
  if (!hotelIds.length) throw new Error("Select at least one property");
  const { error } = await sb.from("partner_hotels").update({ business_id: groupId, updated_at: new Date().toISOString() }).in("id", hotelIds).eq("manager_id", userId);
  if (error) throw error;
  const label = names.map(n => `"${n}"`).join(", ");
  if (groupId) await audit(userId, groupId, `Property ${label} added to group`, { hotelIds });
  if (fromGroupId && fromGroupId !== groupId) await audit(userId, fromGroupId, `Property ${label} ${groupId ? "moved out of" : "removed from"} group`, { hotelIds });
}
/** Copy amenities and/or policies from one source property to the other properties in the group. */
export async function applyCommon(userId: string, groupId: string, sourceId: string, data: PortfolioData, what: { amenities: boolean; policies: boolean }) {
  const source: any = data.hotels.find(h => h.id === sourceId);
  const targets = data.hotels.filter(h => h.business_id === groupId && h.id !== sourceId);
  if (!source || !targets.length) throw new Error("Add at least two properties to this group first");
  const patch: any = { updated_at: new Date().toISOString() };
  if (what.amenities) patch.amenities = source.amenities ?? [];
  if (what.policies) patch.policies = source.policies ?? {};
  const { error } = await sb.from("partner_hotels").update(patch).in("id", targets.map(t => t.id)).eq("manager_id", userId);
  if (error) throw error;
  await audit(userId, groupId, `Common ${[what.amenities && "amenities", what.policies && "policies"].filter(Boolean).join(" & ")} applied from "${source.name}"`, { targets: targets.length });
}
const memberRole: Record<GroupRole, string> = { group_admin: "manager", revenue_manager: "manager", operations_manager: "front_desk" };
/** Grants real access by adding the member to each group property's existing hotel team. */
export async function addGroupMember(userId: string, partnerId: string, group: PropertyGroup, hotelIds: string[], email: string, role: GroupRole) {
  const clean = z.string().trim().toLowerCase().email("Enter a valid email").parse(email);
  if (group.group_settings.members.some(m => m.email === clean)) throw new Error("This person is already in the group");
  const { data: prof, error } = await supabase.from("profiles").select("user_id, full_name").eq("email", clean).limit(1).maybeSingle();
  if (error) throw error;
  if (!prof?.user_id) throw new Error("No JAAGA X user found with this email. Ask them to sign up first.");
  if (prof.user_id === userId) throw new Error("You are already the Group Owner");
  for (const hotel_id of hotelIds) {
    const r = await sb.from("hotel_staff").upsert({ hotel_id, user_id: prof.user_id, role: memberRole[role], invited_email: clean, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "hotel_id,user_id" });
    if (r.error) throw r.error;
  }
  const members = [...group.group_settings.members, { user_id: prof.user_id, email: clean, name: prof.full_name || clean, role, added_at: new Date().toISOString() }];
  const u = await sb.from("partner_businesses").update({ group_settings: { ...group.group_settings, members } }).eq("id", group.id).eq("partner_id", partnerId);
  if (u.error) throw u.error;
  await audit(userId, group.id, `${prof.full_name || clean} added as ${GROUP_ROLE_LABEL[role]}`);
}
export async function removeGroupMember(userId: string, partnerId: string, group: PropertyGroup, hotelIds: string[], member: GroupMember) {
  if (hotelIds.length) { const r = await sb.from("hotel_staff").update({ is_active: false, updated_at: new Date().toISOString() }).eq("user_id", member.user_id).in("hotel_id", hotelIds); if (r.error) throw r.error; }
  const members = group.group_settings.members.filter(m => m.user_id !== member.user_id);
  const u = await sb.from("partner_businesses").update({ group_settings: { ...group.group_settings, members } }).eq("id", group.id).eq("partner_id", partnerId);
  if (u.error) throw u.error;
  await audit(userId, group.id, `${member.name} removed from group team`);
}
export async function uploadGroupLogo(userId: string, file: File) {
  if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) throw new Error("Logo must be PNG, JPG, WEBP or SVG");
  if (file.size > 2 * 1024 * 1024) throw new Error("Logo must be under 2 MB");
  const path = `${userId}/group-logo-${Date.now()}.${file.name.split(".").pop() || "png"}`;
  const { error } = await sb.storage.from("hotel-photos").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return sb.storage.from("hotel-photos").getPublicUrl(path).data.publicUrl as string;
}
