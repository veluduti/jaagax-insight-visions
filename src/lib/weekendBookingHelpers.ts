import { supabase } from "@/integrations/supabase/client";

// Full concierge lifecycle:
// submitted → admin_review → agent_assigned → agent_accepted → in_planning → confirmed →
// in_progress → completed → buyer_decided → deal_closed | cancelled
export const WEEKEND_STATUSES = {
  submitted: { label: "Submitted", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  admin_review: { label: "Admin Reviewing", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  agent_assigned: { label: "Awaiting Agent", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  agent_accepted: { label: "Agent Accepted", color: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  in_planning: { label: "Planning Visits", color: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  awaiting_payment: { label: "Awaiting Payment", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  in_progress: { label: "Visits In Progress", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
  completed: { label: "Visits Done", color: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30" },
  buyer_decided: { label: "Decision Recorded", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30" },
  deal_closed: { label: "Deal Closed 🎉", color: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40" },
  rated: { label: "Rated", color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30" },
  cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  // Legacy
  pending_confirmation: { label: "Submitted", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  agent_review: { label: "Agent Reviewing", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
} as const;

export type WeekendStatus = keyof typeof WEEKEND_STATUSES;

export async function logWeekendActivity(opts: {
  bookingId: string;
  actorId?: string | null;
  actorRole?: "buyer" | "agent" | "admin" | "system";
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  return supabase.from("weekend_booking_activity_log").insert({
    booking_id: opts.bookingId,
    actor_id: opts.actorId ?? null,
    actor_role: opts.actorRole ?? "system",
    action: opts.action,
    description: opts.description ?? null,
    metadata: opts.metadata ?? {},
  });
}

export async function notifyUser(userId: string, title: string, message: string, link?: string, metadata: Record<string, unknown> = {}) {
  if (!userId) return;
  return supabase.from("notifications").insert({
    user_id: userId,
    type: "weekend_booking",
    title,
    message,
    link: link ?? null,
    metadata,
  });
}

export async function notifyAdmins(title: string, message: string, link?: string, metadata: Record<string, unknown> = {}) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins?.length) return;
  return supabase.from("notifications").insert(
    admins.map((a) => ({ user_id: a.user_id, type: "weekend_booking", title, message, link: link ?? null, metadata })),
  );
}

export function formatINR(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
