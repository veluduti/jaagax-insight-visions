/**
 * Timeline / Audit Activity Service
 * ---------------------------------
 * Standardized activity trail every module writes to. UI surfaces
 * (user timelines, admin audits, dashboards) read from a single
 * source (`platform_timeline`).
 */
import { supabase } from "@/integrations/supabase/client";

export interface TimelineEntry {
  actorUserId?: string | null;
  subjectType?: string;
  subjectId?: string;
  action: string;
  moduleKey?: string;
  meta?: Record<string, unknown>;
}

export async function record(entry: TimelineEntry): Promise<void> {
  try {
    await supabase.from("platform_timeline" as never).insert({
      actor_user_id: entry.actorUserId ?? null,
      subject_type: entry.subjectType ?? null,
      subject_id: entry.subjectId ?? null,
      action: entry.action,
      module_key: entry.moduleKey ?? null,
      meta: entry.meta ?? {},
    } as never);
  } catch (err) {
    console.warn("[Timeline] record failed", err);
  }
}

export async function listForUser(userId: string, limit = 50) {
  const { data } = await supabase
    .from("platform_timeline" as never)
    .select("*")
    .eq("actor_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listForSubject(subjectType: string, subjectId: string, limit = 100) {
  const { data } = await supabase
    .from("platform_timeline" as never)
    .select("*")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
