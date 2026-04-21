import { supabase } from "@/integrations/supabase/client";

export const WEEKEND_STATUSES = {
  pending_confirmation: { label: "Pending Confirmation", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  agent_review: { label: "Agent Reviewing", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  awaiting_payment: { label: "Awaiting Payment", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  in_progress: { label: "In Progress", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
  completed: { label: "Completed", color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30" },
  cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
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

export function formatINR(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
