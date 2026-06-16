import { supabase } from "@/integrations/supabase/client";

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
  // ---- Get notifications for current user ----
  async list(opts?: { onlyUnread?: boolean; includeArchived?: boolean; limit?: number }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let q = supabase.from(TABLE).select("*").eq("user_id", user.id).order("created_at", { ascending: false });

    if (opts?.onlyUnread) q = q.eq("is_read", false);
    if (!opts?.includeArchived) q = q.eq("is_archived", false);
    if (opts?.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  // ---- Get unread count ----
  async unreadCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .eq("is_archived", false);

    if (error) throw error;
    return count ?? 0;
  },

  // ---- Mark single notification as read ----
  async markAsRead(id: string) {
    const { error } = await supabase.from(TABLE).update({ is_read: true }).eq("id", id);

    if (error) throw error;
  },

  // ---- Mark all notifications as read ----
  async markAllAsRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from(TABLE).update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);

    if (error) throw error;
  },

  // ---- Archive notification ----
  async archive(id: string) {
    const { error } = await supabase.from(TABLE).update({ is_archived: true }).eq("id", id);

    if (error) throw error;
  },

  // ---- Delete notification ----
  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) throw error;
  },

  // ---- Create notification (for system use) ----
  async create(input: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    builder_profile_id?: string;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await supabase.from(TABLE).insert(input).select().single();

    if (error) throw error;
    return data as Notification;
  },

  // ---- Real-time subscription ----
  subscribe(userId: string, onChange: (n: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: TABLE,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onChange(payload.new as Notification),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: TABLE,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onChange(payload.new as Notification),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

export default notificationService;

// ---- Legacy named exports (backward compatibility) ----
export const listNotifications = (_userId?: string) => notificationService.list();
export const markNotificationRead = (id: string) => notificationService.markAsRead(id);
export const markAllNotificationsRead = (_userId?: string) => notificationService.markAllAsRead();
