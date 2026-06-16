import { supabase } from "@/integrations/supabase/client";
import { fromTable as sb } from "@/lib/supabaseHelper";

export type NotificationType =
  | "platform_announcement"
  | "lead_update"
  | "visit_reminder"
  | "subscription_expiry"
  | "wallet_low_balance"
  | "project_update"
  | "team_assignment";

export interface Notification {
  id: string;
  user_id: string;
  builder_profile_id?: string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  is_archived: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
}

const TABLE = "notifications";

export const notificationService = {
  async list(opts?: { onlyUnread?: boolean; includeArchived?: boolean; limit?: number }) {
    let q = sb(TABLE).select("*").order("created_at", { ascending: false });
    if (opts?.onlyUnread) q = q.eq("is_read", false);
    if (!opts?.includeArchived) q = q.eq("is_archived", false);
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  async unreadCount() {
    const { count, error } = await sb(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("is_archived", false);
    if (error) throw error;
    return count ?? 0;
  },

  async markAsRead(id: string) {
    const { error } = await sb(TABLE).update({ is_read: true }).eq("id", id);
    if (error) throw error;
  },

  async markAllAsRead() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await sb(TABLE)
      .update({ is_read: true })
      .eq("user_id", user.user.id)
      .eq("is_read", false);
    if (error) throw error;
  },

  async archive(id: string) {
    const { error } = await sb(TABLE).update({ is_archived: true }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await sb(TABLE).delete().eq("id", id);
    if (error) throw error;
  },

  async create(input: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    builder_profile_id?: string;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await sb(TABLE).insert(input).select().single();
    if (error) throw error;
    return data as Notification;
  },

  subscribe(userId: string, onChange: (n: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
        (payload) => onChange(payload.new as Notification),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};

export default notificationService;
