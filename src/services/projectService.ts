// Project management service for the builder module.
// Wraps Supabase access to projects, project_units, construction_updates,
// promotions, promotion_plans, and the project_stats_view.

import { supabase } from "@/integrations/supabase/client";
import { fromTable } from "@/lib/supabaseHelper";

// ---------- Types ----------
export type ProjectStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "launched"
  | "under_construction"
  | "completed";

export type UnitStatus = "available" | "booked" | "sold" | "reserved";

export type ConstructionMediaType = "photo" | "drone_video" | "milestone";

export type PromotionTargetType = "project" | "property";
export type PromotionPaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PromotionStatus = "active" | "expired" | "stopped";
export type PromotionTier = "basic" | "featured" | "premium";

export interface Project {
  id: string;
  builder_profile_id: string | null;
  name: string;
  subtitle: string | null;
  description: string | null;
  status: ProjectStatus;
  launch_date: string | null;
  possession_date: string | null;
  total_units: number | null;
  floors: string | null;
  towers: number | null;
  land_area: string | null;
  size_range: string | null;
  bhk_types: string | null;
  hero_image: string | null;
  master_plan_url: string | null;
  brochure_url: string | null;
  builder_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectUnit {
  id: string;
  project_id: string;
  unit_number: string;
  type: string | null;
  area_sqft: number | null;
  price: number | null;
  facing: string | null;
  floor_number: number | null;
  status: UnitStatus;
  buyer_id: string | null;
  booking_amount: number | null;
  booked_at: string | null;
  sold_at: string | null;
  created_at: string;
}

export interface ConstructionUpdate {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  media_urls: string[] | null;
  media_type: ConstructionMediaType | null;
  completion_percentage: number;
  milestone: string | null;
  is_delay: boolean;
  delay_reason: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  builder_profile_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  tier: string | null;
  target_type: PromotionTargetType | null;
  project_id: string | null;
  property_id: string | null;
  duration_days: number | null;
  amount_paid: number | null;
  payment_status: PromotionPaymentStatus;
  payment_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  status: PromotionStatus;
  search_boost: number;
  map_highlight: boolean;
  homepage_featured: boolean;
  badge_label: string | null;
  views_count: number;
  clicks_count: number;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionPlan {
  id: string;
  name: string;
  tier: PromotionTier | null;
  duration_days: number;
  price: number;
  benefits: string[] | null;
  badge_label: string | null;
  search_boost: number;
  map_highlight: boolean;
  homepage_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProjectStats {
  project_id: string;
  project_name: string;
  builder_name: string | null;
  project_status: ProjectStatus;
  total_units: number;
  available_units: number;
  booked_units: number;
  sold_units: number;
  revenue_generated: number;
}

// ---------- Helpers ----------
const unwrap = <T,>({ data, error }: { data: T | null; error: any }): T => {
  if (error) throw error;
  return (data ?? []) as unknown as T;
};

const unwrapOne = <T,>({ data, error }: { data: T | null; error: any }): T | null => {
  if (error) throw error;
  return data;
};

// =====================================================
// PROJECTS
// =====================================================
export async function listProjectsByBuilder(builderProfileId: string): Promise<Project[]> {
  const res = await fromTable("projects")
    .select("*")
    .eq("builder_profile_id", builderProfileId)
    .order("created_at", { ascending: false });
  return unwrap<Project[]>(res);
}

export async function listPublicProjects(): Promise<Project[]> {
  const res = await fromTable("projects")
    .select("*")
    .in("status", ["launched", "under_construction", "completed"])
    .order("created_at", { ascending: false });
  return unwrap<Project[]>(res);
}

export async function getProject(id: string): Promise<Project | null> {
  const res = await fromTable("projects").select("*").eq("id", id).maybeSingle();
  return unwrapOne<Project>(res);
}

export async function createProject(payload: Partial<Project>): Promise<Project> {
  const res = await fromTable("projects").insert(payload).select("*").single();
  if (res.error) throw res.error;
  return res.data as Project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const res = await fromTable("projects").update(patch).eq("id", id).select("*").single();
  if (res.error) throw res.error;
  return res.data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fromTable("projects").delete().eq("id", id);
  if (res.error) throw res.error;
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  return updateProject(id, { status });
}

// =====================================================
// PROJECT UNITS
// =====================================================
export async function listProjectUnits(projectId: string): Promise<ProjectUnit[]> {
  const res = await fromTable("project_units")
    .select("*")
    .eq("project_id", projectId)
    .order("unit_number", { ascending: true });
  return unwrap<ProjectUnit[]>(res);
}

export async function createProjectUnit(payload: Partial<ProjectUnit>): Promise<ProjectUnit> {
  const res = await fromTable("project_units").insert(payload).select("*").single();
  if (res.error) throw res.error;
  return res.data as ProjectUnit;
}

export async function bulkCreateProjectUnits(units: Partial<ProjectUnit>[]): Promise<ProjectUnit[]> {
  if (!units.length) return [];
  const res = await fromTable("project_units").insert(units).select("*");
  if (res.error) throw res.error;
  return (res.data ?? []) as ProjectUnit[];
}

export async function updateProjectUnit(id: string, patch: Partial<ProjectUnit>): Promise<ProjectUnit> {
  const res = await fromTable("project_units").update(patch).eq("id", id).select("*").single();
  if (res.error) throw res.error;
  return res.data as ProjectUnit;
}

export async function deleteProjectUnit(id: string): Promise<void> {
  const res = await fromTable("project_units").delete().eq("id", id);
  if (res.error) throw res.error;
}

export async function bookUnit(
  id: string,
  buyerId: string,
  bookingAmount: number,
): Promise<ProjectUnit> {
  return updateProjectUnit(id, {
    status: "booked",
    buyer_id: buyerId,
    booking_amount: bookingAmount,
    booked_at: new Date().toISOString(),
  });
}

export async function markUnitSold(id: string): Promise<ProjectUnit> {
  return updateProjectUnit(id, {
    status: "sold",
    sold_at: new Date().toISOString(),
  });
}

// =====================================================
// CONSTRUCTION UPDATES
// =====================================================
export async function listConstructionUpdates(projectId: string): Promise<ConstructionUpdate[]> {
  const res = await fromTable("construction_updates")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return unwrap<ConstructionUpdate[]>(res);
}

export async function createConstructionUpdate(
  payload: Partial<ConstructionUpdate>,
): Promise<ConstructionUpdate> {
  const res = await fromTable("construction_updates").insert(payload).select("*").single();
  if (res.error) throw res.error;
  return res.data as ConstructionUpdate;
}

export async function updateConstructionUpdate(
  id: string,
  patch: Partial<ConstructionUpdate>,
): Promise<ConstructionUpdate> {
  const res = await fromTable("construction_updates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (res.error) throw res.error;
  return res.data as ConstructionUpdate;
}

export async function deleteConstructionUpdate(id: string): Promise<void> {
  const res = await fromTable("construction_updates").delete().eq("id", id);
  if (res.error) throw res.error;
}

// =====================================================
// PROMOTIONS
// =====================================================
export async function listPromotionPlans(): Promise<PromotionPlan[]> {
  const res = await fromTable("promotion_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return unwrap<PromotionPlan[]>(res);
}

export async function listBuilderPromotions(builderProfileId: string): Promise<Promotion[]> {
  const res = await fromTable("promotions")
    .select("*")
    .eq("builder_profile_id", builderProfileId)
    .order("created_at", { ascending: false });
  return unwrap<Promotion[]>(res);
}

export async function listActivePromotions(): Promise<Promotion[]> {
  const res = await fromTable("promotions")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return unwrap<Promotion[]>(res);
}

export async function createPromotion(payload: Partial<Promotion>): Promise<Promotion> {
  const res = await fromTable("promotions").insert(payload).select("*").single();
  if (res.error) throw res.error;
  return res.data as Promotion;
}

export async function updatePromotion(id: string, patch: Partial<Promotion>): Promise<Promotion> {
  const res = await fromTable("promotions").update(patch).eq("id", id).select("*").single();
  if (res.error) throw res.error;
  return res.data as Promotion;
}

export async function stopPromotion(id: string): Promise<Promotion> {
  return updatePromotion(id, { status: "stopped" });
}

export async function deletePromotion(id: string): Promise<void> {
  const res = await fromTable("promotions").delete().eq("id", id);
  if (res.error) throw res.error;
}

/**
 * Purchase a promotion plan for a project or property. Computes
 * start/end dates from the plan's duration and copies plan defaults.
 */
export async function purchasePromotion(args: {
  builderProfileId: string;
  plan: PromotionPlan;
  targetType: PromotionTargetType;
  projectId?: string | null;
  propertyId?: string | null;
  paymentReference?: string | null;
  paymentStatus?: PromotionPaymentStatus;
}): Promise<Promotion> {
  const now = new Date();
  const end = new Date(now.getTime() + args.plan.duration_days * 24 * 60 * 60 * 1000);

  return createPromotion({
    builder_profile_id: args.builderProfileId,
    plan_id: args.plan.id,
    plan_name: args.plan.name,
    tier: args.plan.tier ?? null,
    target_type: args.targetType,
    project_id: args.targetType === "project" ? args.projectId ?? null : null,
    property_id: args.targetType === "property" ? args.propertyId ?? null : null,
    duration_days: args.plan.duration_days,
    amount_paid: args.plan.price,
    payment_status: args.paymentStatus ?? "pending",
    payment_reference: args.paymentReference ?? null,
    start_date: now.toISOString(),
    end_date: end.toISOString(),
    status: "active",
    search_boost: args.plan.search_boost,
    map_highlight: args.plan.map_highlight,
    homepage_featured: args.plan.homepage_featured,
    badge_label: args.plan.badge_label,
  });
}

// =====================================================
// STATS
// =====================================================
export async function getProjectStats(projectId: string): Promise<ProjectStats | null> {
  const res = await fromTable("project_stats_view")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return unwrapOne<ProjectStats>(res);
}

export async function listProjectStatsForBuilder(builderProfileId: string): Promise<ProjectStats[]> {
  // Pull the builder's project ids, then read the stats view.
  const projects = await fromTable("projects")
    .select("id")
    .eq("builder_profile_id", builderProfileId);
  if (projects.error) throw projects.error;

  const ids = (projects.data ?? []).map((row: { id: string }) => row.id);
  if (!ids.length) return [];

  const res = await fromTable("project_stats_view").select("*").in("project_id", ids);
  return unwrap<ProjectStats[]>(res);
}

export const projectService = {
  // projects
  listProjectsByBuilder,
  listPublicProjects,
  getProject,
  createProject,
  updateProject,
  updateProjectStatus,
  deleteProject,
  // units
  listProjectUnits,
  createProjectUnit,
  bulkCreateProjectUnits,
  updateProjectUnit,
  deleteProjectUnit,
  bookUnit,
  markUnitSold,
  // construction
  listConstructionUpdates,
  createConstructionUpdate,
  updateConstructionUpdate,
  deleteConstructionUpdate,
  // promotions
  listPromotionPlans,
  listBuilderPromotions,
  listActivePromotions,
  createPromotion,
  updatePromotion,
  stopPromotion,
  deletePromotion,
  purchasePromotion,
  // stats
  getProjectStats,
  listProjectStatsForBuilder,
};

export default projectService;

// Re-export supabase for convenience in callers
export { supabase };
