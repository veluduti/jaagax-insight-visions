import { supabase } from "@/integrations/supabase/client";

export const PROJECT_TYPES = [
  "Apartment",
  "Villa",
  "Open Plot",
  "Agriculture Land",
  "Farm Land",
  "Commercial",
  "Industrial",
  "Rental",
  "Luxury",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface AgentProjectExperience {
  id: string;
  agent_id: string;
  project_name: string;
  project_type: string;
  experience_years: number;
  project_location: string | null;
  sort_order: number;
}

/** Draft row used inside the editor (id may be a temporary client id). */
export interface ProjectDraft {
  id: string;
  /** true when the row does not exist in the DB yet */
  isNew?: boolean;
  project_name: string;
  project_type: string;
  experience_years: string;
  project_location: string;
}

export const emptyDraft = (): ProjectDraft => ({
  id: `new-${Math.random().toString(36).slice(2)}`,
  isNew: true,
  project_name: "",
  project_type: "",
  experience_years: "",
  project_location: "",
});

export async function fetchProjectExperience(agentId: string): Promise<AgentProjectExperience[]> {
  const { data, error } = await (supabase as any)
    .from("agent_project_experience")
    .select("*")
    .eq("agent_id", agentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AgentProjectExperience[]) || [];
}

export const toDrafts = (rows: AgentProjectExperience[]): ProjectDraft[] =>
  rows.map((r) => ({
    id: r.id,
    project_name: r.project_name ?? "",
    project_type: r.project_type ?? "",
    experience_years: r.experience_years == null ? "" : String(r.experience_years),
    project_location: r.project_location ?? "",
  }));

/**
 * Persists the full editor state: inserts new rows, updates changed ones,
 * deletes removed ones and keeps `sort_order` aligned with on-screen order.
 */
export async function saveProjectExperience(
  agentId: string,
  drafts: ProjectDraft[],
  originalIds: string[],
): Promise<AgentProjectExperience[]> {
  const sb: any = supabase;
  const valid = drafts.filter((d) => d.project_name.trim() && d.project_type.trim());

  const keptIds = valid.filter((d) => !d.isNew).map((d) => d.id);
  const removed = originalIds.filter((id) => !keptIds.includes(id));
  if (removed.length) {
    const { error } = await sb.from("agent_project_experience").delete().in("id", removed);
    if (error) throw error;
  }

  const inserts = valid
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.isNew)
    .map(({ d, i }) => ({
      agent_id: agentId,
      project_name: d.project_name.trim(),
      project_type: d.project_type,
      experience_years: Number(d.experience_years) || 0,
      project_location: d.project_location.trim() || null,
      sort_order: i,
    }));
  if (inserts.length) {
    const { error } = await sb.from("agent_project_experience").insert(inserts);
    if (error) throw error;
  }

  const updates = valid
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !d.isNew);
  for (const { d, i } of updates) {
    const { error } = await sb
      .from("agent_project_experience")
      .update({
        project_name: d.project_name.trim(),
        project_type: d.project_type,
        experience_years: Number(d.experience_years) || 0,
        project_location: d.project_location.trim() || null,
        sort_order: i,
      })
      .eq("id", d.id);
    if (error) throw error;
  }

  return fetchProjectExperience(agentId);
}
