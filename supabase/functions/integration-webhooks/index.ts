import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { integrationServiceClient, safeError } from "../_shared/integration/access.ts";
import { decryptCredentials, verifySignature } from "../_shared/integration/crypto.ts";

const sb = integrationServiceClient();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const raw = await req.text();
    const path = new URL(req.url).pathname;
    const clientId = decodeURIComponent(path.split("/").pop() ?? "");
    const { data: connection } = await sb.from("hotel_channel_connections").select("*").eq("client_id", clientId).eq("is_active", true).eq("review_status", "active").neq("direction", "outbound").maybeSingle();
    if (!connection) return json({ error: "Connection not found or inactive" }, 404);
    const { data: stored } = await sb.from("integration_credentials").select("ciphertext,iv").eq("connection_id", connection.id).single();
    const credentials = await decryptCredentials(stored);
    const signature = req.headers.get("X-Jaaga-Signature") ?? "";
    if (!credentials.webhook_secret || !(await verifySignature(String(credentials.webhook_secret), raw, signature))) return json({ error: "Invalid webhook signature" }, 401);
    const input = z.object({ event_id: z.string().trim().min(4).max(200), event_type: z.enum(["reservation.created", "reservation.modified", "reservation.cancelled", "inventory.updated", "rates.updated"]), occurred_at: z.string().datetime().optional(), data: z.record(z.unknown()) }).parse(JSON.parse(raw));
    const { data: event, error } = await sb.from("integration_webhook_events").insert({ connection_id: connection.id, hotel_id: connection.hotel_id, external_event_id: input.event_id, event_type: input.event_type, payload: input.data, signature_verified: true }).select("id,status,received_at").single();
    if (error?.code === "23505") return json({ received: true, duplicate: true });
    if (error) throw error;
    return json({ received: true, duplicate: false, event_id: event.id, status: event.status }, 202);
  } catch (error) {
    console.error("Integration webhook rejected", safeError(error));
    return json({ error: safeError(error, "Webhook could not be accepted") }, 400);
  }
});
