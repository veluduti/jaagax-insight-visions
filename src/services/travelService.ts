import { supabase } from "@/integrations/supabase/client";
import { fromTable } from "@/lib/supabaseHelper";

export type GeneratedPlan = {
  destination: string; title: string; durationDays: number; mood: string; pace: string;
  interests: string[]; purpose: string; fitScore: number; explanation: string;
  days: Array<{ day: number; theme: string; items: Array<{ period: string; title: string; description: string; location?: string; fitScore?: number }> }>;
};

export async function askTravelAI(question: string, context?: string, mode: "chat" | "plan" = "chat") {
  const { data, error } = await supabase.functions.invoke("travel-assistant", { body: { question, context, mode } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { answer?: string; plan?: GeneratedPlan };
}

export async function saveTravelItem(item: { type: string; id: string; title: string; metadata?: Record<string, unknown> }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to save this.");
  const { error } = await fromTable("travel_saves").upsert({ user_id: user.id, item_type: item.type, item_id: item.id, title: item.title, metadata: item.metadata ?? {} }, { onConflict: "user_id,item_type,item_id" });
  if (error) throw error;
}

export async function createTravelPlan(plan: GeneratedPlan) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to save your plan.");
  const { data, error } = await fromTable("travel_plans").insert({ user_id: user.id, title: plan.title, destination_name: plan.destination, duration_days: plan.durationDays, mood: plan.mood, interests: plan.interests, pace: plan.pace, purpose: plan.purpose, fit_score: plan.fitScore, explanation: plan.explanation, status: "planned" }).select("id").single();
  if (error || !data) throw error ?? new Error("Plan could not be saved.");
  const rows = plan.days.flatMap((day) => day.items.map((item, position) => ({ plan_id: data.id, day_number: day.day, period: item.period.toLowerCase(), item_type: "experience", title: item.title, description: item.description, location: item.location, position, fit_score: item.fitScore })));
  if (rows.length) { const { error: itemError } = await fromTable("travel_plan_items").insert(rows); if (itemError) throw itemError; }
  return data.id as string;
}

export async function listMyPlans() {
  const { data, error } = await fromTable("travel_plans").select("*").order("updated_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listMySaves() {
  const { data, error } = await fromTable("travel_saves").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function logTravelEvent(eventType: string, entityType?: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await fromTable("travel_events").insert({ user_id: user?.id ?? null, event_type: eventType, entity_type: entityType, entity_id: entityId, source: "travel", metadata });
}
