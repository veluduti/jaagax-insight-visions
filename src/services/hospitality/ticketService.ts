import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type TicketKind = "support" | "refund" | "dispute" | "safety";
export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved";
export type Ticket = {
  id: string; kind: TicketKind; subject: string; body: string | null; booking_id: string | null; hotel_id: string | null;
  opened_by: string; priority: string; status: TicketStatus; assigned_to: string | null; resolution: string | null;
  refund_amount: number | null; resolved_at: string | null; created_at: string; updated_at: string;
};
export type TicketUpdate = { id: string; ticket_id: string; author_id: string; author_role: string; body: string; internal: boolean; created_at: string };

export const KIND_LABEL: Record<TicketKind, string> = {
  support: "Help with my stay", refund: "Refund request", dispute: "Problem with the property", safety: "Safety concern",
};
/** Safety is always urgent; refunds and disputes are high; general help is normal. */
const priorityFor = (k: TicketKind) => (k === "safety" ? "urgent" : k === "support" ? "normal" : "high");

export async function openTicket(t: { kind: TicketKind; subject: string; body: string; booking_id?: string | null; hotel_id?: string | null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to contact support");
  const { error } = await sb.from("hospitality_tickets").insert({ ...t, opened_by: user.id, priority: priorityFor(t.kind) });
  if (error) throw error;
}

export async function loadMyTickets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from("hospitality_tickets").select("*").eq("opened_by", user.id).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as Ticket[];
}

export async function loadQueue() {
  const { data, error } = await sb.from("hospitality_tickets").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
  return ((data ?? []) as Ticket[]).sort((a, b) =>
    Number(a.status === "resolved") - Number(b.status === "resolved") || (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || b.created_at.localeCompare(a.created_at));
}

export async function loadUpdates(ticketId: string) {
  const { data } = await sb.from("hospitality_ticket_updates").select("*").eq("ticket_id", ticketId).order("created_at");
  return (data ?? []) as TicketUpdate[];
}

export async function addUpdate(ticketId: string, body: string, opts: { internal?: boolean; role?: "customer" | "jaaga" } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await sb.from("hospitality_ticket_updates").insert({
    ticket_id: ticketId, author_id: user?.id, body, internal: !!opts.internal, author_role: opts.role ?? "customer",
  });
  if (error) throw error;
}

export async function updateTicket(id: string, patch: Partial<Ticket>) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await sb.from("hospitality_tickets").update({
    ...patch, ...(patch.status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
  }).eq("id", id);
  if (error) throw error;
  await sb.from("hospitality_audit_log").insert({ actor_id: user?.id, entity: "ticket", entity_id: id, action: patch.status ?? "update", details: patch });
}

export async function assignToMe(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  await updateTicket(id, { assigned_to: user?.id ?? null, status: "in_progress" });
}
