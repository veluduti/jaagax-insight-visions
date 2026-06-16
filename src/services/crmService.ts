// CRM service for the builder module.
// Wraps Supabase access to crm_notes (notes, tasks, follow-ups, reminders).

import { supabase } from "@/integrations/supabase/client";

export type CRMNoteType = "note" | "task" | "follow_up" | "reminder" | "call" | "meeting";
export type CRMNotePriority = "low" | "medium" | "high" | "urgent";
export type CRMNoteStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface CRMNote {
  id: string;
  builder_profile_id: string | null;
  user_id: string;
  title: string;
  content: string | null;
  type: CRMNoteType;
  priority: CRMNotePriority;
  status: CRMNoteStatus;
  reminder_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  related_to_type: string | null;
  related_to_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CRMNoteInput {
  builder_profile_id?: string | null;
  title: string;
  content?: string | null;
  type?: CRMNoteType;
  priority?: CRMNotePriority;
  status?: CRMNoteStatus;
  reminder_at?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  related_to_type?: string | null;
  related_to_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CRMStats {
  total: number;
  open: number;
  completed: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  byPriority: Record<CRMNotePriority, number>;
  byType: Record<string, number>;
}

export interface CRMFilters {
  builderProfileId?: string;
  type?: CRMNoteType;
  status?: CRMNoteStatus;
  priority?: CRMNotePriority;
  search?: string;
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

export const crmService = {
  async listNotes(filters: CRMFilters = {}): Promise<CRMNote[]> {
    const userId = await requireUserId();
    let q = supabase.from("crm_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });

    // FIXED: Use builder_profile_id filter when provided
    if (filters.builderProfileId) {
      q = q.eq("builder_profile_id", filters.builderProfileId);
    }
    if (filters.type) q = q.eq("type", filters.type);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.priority) q = q.eq("priority", filters.priority);
    if (filters.search) q = q.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as CRMNote[];
  },

  async getNote(id: string): Promise<CRMNote | null> {
    const { data, error } = await supabase.from("crm_notes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as CRMNote) || null;
  },

  async createNote(input: CRMNoteInput): Promise<CRMNote> {
    const userId = await requireUserId();
    const payload = {
      user_id: userId,
      title: input.title,
      content: input.content ?? null,
      type: input.type ?? "note",
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      reminder_at: input.reminder_at ?? null,
      due_date: input.due_date ?? null,
      assigned_to: input.assigned_to ?? null,
      builder_profile_id: input.builder_profile_id ?? null,
      related_to_type: input.related_to_type ?? null,
      related_to_id: input.related_to_id ?? null,
      metadata: input.metadata ?? null,
    };
    const { data, error } = await supabase.from("crm_notes").insert(payload).select("*").single();
    if (error) throw error;
    return data as CRMNote;
  },

  async updateNote(id: string, patch: Partial<CRMNoteInput>): Promise<CRMNote> {
    const { data, error } = await supabase.from("crm_notes").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CRMNote;
  },

  async markCompleted(id: string): Promise<CRMNote> {
    const { data, error } = await supabase
      .from("crm_notes")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as CRMNote;
  },

  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase.from("crm_notes").delete().eq("id", id);
    if (error) throw error;
  },

  async getStats(builderProfileId?: string): Promise<CRMStats> {
    const notes = await this.listNotes(builderProfileId ? { builderProfileId } : {});
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const stats: CRMStats = {
      total: notes.length,
      open: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
      byType: {},
    };

    for (const n of notes) {
      if (n.status === "completed") stats.completed++;
      else stats.open++;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      if (n.due_date && n.status !== "completed") {
        const due = new Date(n.due_date);
        if (due < startOfDay) stats.overdue++;
        else if (due <= endOfDay) stats.dueToday++;
        else stats.upcoming++;
      }
    }
    return stats;
  },
};

export default crmService;
