import { createClient } from "npm:@supabase/supabase-js@2";

export function integrationServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Backend configuration unavailable");
  return createClient(url, key);
}

export async function managementActor(req: Request, sb: any) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: admin } = await sb.rpc("is_admin", { _user_id: data.user.id });
  return { id: data.user.id as string, admin: admin === true, token };
}

export async function canManageHotel(sb: any, userId: string, hotelId: string, admin = false) {
  if (admin) return true;
  const { data } = await sb.rpc("is_hotel_member", { _hotel_id: hotelId, _user_id: userId });
  return data === true;
}

export async function manageableConnection(sb: any, actor: { id: string; admin: boolean }, connectionId: string) {
  const { data: connection } = await sb.from("hotel_channel_connections").select("*").eq("id", connectionId).maybeSingle();
  if (!connection || !(await canManageHotel(sb, actor.id, connection.hotel_id, actor.admin))) return null;
  return connection;
}

export async function auditIntegration(sb: any, actorId: string, connection: any, action: string, details: Record<string, unknown> = {}) {
  await sb.from("hospitality_audit_log").insert({ actor_id: actorId, entity: "integration_connection", entity_id: connection.id, action, details: { hotel_id: connection.hotel_id, channel: connection.channel, ...details } });
}

export function safeError(error: unknown, fallback = "Integration request could not be completed") {
  const message = error instanceof Error ? error.message : fallback;
  if (/secret|token|password|ciphertext|credential key/i.test(message)) return fallback;
  return message.slice(0, 500);
}
