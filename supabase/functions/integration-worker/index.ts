import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { integrationServiceClient, safeError } from "../_shared/integration/access.ts";
import { decryptCredentials, signPayload } from "../_shared/integration/crypto.ts";
import { cancelIntegrationReservation, createIntegrationReservation, modifyIntegrationReservation } from "../_shared/integration/reservations.ts";
import { integrationSnapshot } from "../_shared/integration/snapshot.ts";

const sb = integrationServiceClient();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const retryDelay = (attempt: number) => Math.min(15 * 60_000, 15_000 * 2 ** Math.max(0, Math.min(7, attempt - 1)));

async function credentials(connectionId: string) {
  const { data } = await sb.from("integration_credentials").select("ciphertext,iv").eq("connection_id", connectionId).single();
  return decryptCredentials(data);
}

async function deliver(connection: any, eventType: string, payload: unknown) {
  const endpoint = connection.settings?.webhook_url;
  if (!endpoint) throw new Error("No outbound webhook URL is configured");
  const secrets = await credentials(connection.id);
  const raw = JSON.stringify({ event_id: crypto.randomUUID(), event_type: eventType, occurred_at: new Date().toISOString(), data: payload });
  const signature = secrets.webhook_secret ? await signPayload(String(secrets.webhook_secret), raw) : "";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...(signature ? { "X-Jaaga-Signature": signature } : {}), ...(secrets.access_token ? { Authorization: `Bearer ${secrets.access_token}` } : {}) }, body: raw, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  await sb.from("channel_api_payloads").insert({ hotel_id: connection.hotel_id, channel: connection.channel, operation: eventType.includes("reservation") ? "booking_modify" : "detail", endpoint, request_id: connection.id, request_payload: { event_type: eventType }, response_payload: { body: text.slice(0, 5000) }, http_status: response.status, error_message: response.ok ? null : `HTTP ${response.status}` });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return { status: response.status, body: text.slice(0, 5000) };
}

async function applyCalendarEvent(connection: any, event: any, mode: "inventory" | "rates") {
  if (connection.settings?.[`${mode}_master`] !== "external") throw new Error(`External ${mode} master mode is disabled`);
  const rows = Array.isArray(event.payload?.rows) ? event.payload.rows : [];
  if (!rows.length || rows.length > 366) throw new Error("Calendar event must contain 1 to 366 rows");
  const { data: mappings } = await sb.from("hotel_room_channel_mappings").select("room_id").eq("connection_id", connection.id);
  const allowed = new Set((mappings ?? []).map(m => m.room_id));
  for (const row of rows) {
    if (!allowed.has(row.room_id) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("Calendar event contains an unmapped room or invalid date");
    const values: any = mode === "inventory" ? { available_units: row.available_units, stop_sell: row.stop_sell, min_stay: row.min_stay, max_stay: row.max_stay, closed_to_arrival: row.closed_to_arrival, closed_to_departure: row.closed_to_departure } : { price: row.price, currency: row.currency };
    for (const key of Object.keys(values)) if (values[key] === undefined) delete values[key];
    let query = sb.from("hotel_rate_calendar").select("id").eq("room_id", row.room_id).eq("date", row.date);
    query = row.rate_plan_id ? query.eq("rate_plan_id", row.rate_plan_id) : query.is("rate_plan_id", null);
    const { data: existing } = await query.maybeSingle();
    const { error } = existing ? await sb.from("hotel_rate_calendar").update(values).eq("id", existing.id) : await sb.from("hotel_rate_calendar").insert({ hotel_id: connection.hotel_id, room_id: row.room_id, rate_plan_id: row.rate_plan_id ?? null, date: row.date, ...values });
    if (error) throw error;
  }
  return rows.length;
}

async function processEvent(event: any) {
  const { data: connection } = await sb.from("hotel_channel_connections").select("*").eq("id", event.connection_id).eq("is_active", true).eq("review_status", "active").single();
  if (event.event_type === "reservation.created") await createIntegrationReservation(sb, connection, event.payload, `webhook:${event.id}`);
  else if (event.event_type === "reservation.modified") await modifyIntegrationReservation(sb, connection, String(event.payload.external_booking_id), event.payload);
  else if (event.event_type === "reservation.cancelled") await cancelIntegrationReservation(sb, connection, String(event.payload.external_booking_id), Number(event.payload.external_version), String(event.payload.reason ?? "External webhook cancellation"));
  else if (event.event_type === "inventory.updated") await applyCalendarEvent(connection, event, "inventory");
  else if (event.event_type === "rates.updated") await applyCalendarEvent(connection, event, "rates");
  else throw new Error("Unsupported webhook event");
  await sb.from("integration_webhook_events").update({ status: "processed", processed_at: new Date().toISOString(), attempts: event.attempts + 1, last_error: null }).eq("id", event.id);
}

async function processJob(job: any) {
  const { data: connection } = await sb.from("hotel_channel_connections").select("*").eq("id", job.connection_id).eq("is_active", true).eq("review_status", "active").single();
  const result = await deliver(connection, job.kind === "reconcile" ? "reconciliation.request" : "sync.snapshot", job.payload);
  if (job.kind === "reconcile") {
    try {
      const parsed = JSON.parse(result.body);
      const mismatches = Array.isArray(parsed?.mismatches) ? parsed.mismatches.slice(0, 100) : [];
      for (const issue of mismatches) {
        if (!issue.entity_type || !issue.entity_id || !issue.issue_type) continue;
        await sb.from("integration_reconciliation_issues").insert({ connection_id: connection.id, hotel_id: connection.hotel_id, entity_type: String(issue.entity_type).slice(0, 80), entity_id: String(issue.entity_id).slice(0, 160), issue_type: String(issue.issue_type).slice(0, 120), local_snapshot: issue.local ?? null, remote_snapshot: issue.remote ?? null, details: String(issue.details ?? "").slice(0, 1000) });
      }
    } catch { /* A successful sync response need not contain reconciliation JSON. */ }
  }
  await sb.from("integration_sync_jobs").update({ status: "success", attempts: job.attempts + 1, result: { http_status: result.status }, completed_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
  await sb.from("hotel_channel_connections").update({ last_sync_at: new Date().toISOString(), last_sync_status: "success", last_sync_error: null }).eq("id", connection.id);
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = authenticateCronRequest(req);
  if (denied) return denied;
  const summary = { jobs: 0, events: 0, deliveries: 0, scheduled: 0, errors: 0 };
  try {
    const { data: active } = await sb.from("hotel_channel_connections").select("*").eq("is_active", true).eq("review_status", "active").neq("direction", "inbound").neq("channel", "hyperguest").limit(50);
    for (const connection of active ?? []) {
      const interval = Math.max(5, Number(connection.settings?.sync_interval_minutes ?? 15));
      if (connection.last_sync_at && Date.parse(connection.last_sync_at) > Date.now() - interval * 60_000) continue;
      if (!connection.settings?.webhook_url) continue;
      const snapshot = await integrationSnapshot(sb, connection);
      const { error } = await sb.from("integration_sync_jobs").insert({ connection_id: connection.id, hotel_id: connection.hotel_id, kind: "scheduled_sync", direction: "outbound", payload: snapshot, idempotency_key: crypto.randomUUID() });
      if (!error) summary.scheduled++;
    }
    const { data: jobs } = await sb.from("integration_sync_jobs").select("*").in("status", ["pending", "retry"]).lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(5);
    for (const job of jobs ?? []) {
      try { await processJob(job); summary.jobs++; }
      catch (error) {
        summary.errors++;
        const attempts = job.attempts + 1, failed = attempts >= job.max_attempts;
        await sb.from("integration_sync_jobs").update({ status: failed ? "failed" : "retry", attempts, last_error: safeError(error), next_attempt_at: new Date(Date.now() + retryDelay(attempts)).toISOString() }).eq("id", job.id);
        await sb.from("hotel_channel_connections").update({ last_sync_status: failed ? "failed" : "retry", last_sync_error: safeError(error) }).eq("id", job.connection_id);
      }
    }
    const { data: events } = await sb.from("integration_webhook_events").select("*").in("status", ["received", "retry"]).lte("next_attempt_at", new Date().toISOString()).order("received_at").limit(10);
    for (const event of events ?? []) {
      try { await processEvent(event); summary.events++; }
      catch (error) {
        summary.errors++;
        const attempts = event.attempts + 1, failed = attempts >= 5;
        await sb.from("integration_webhook_events").update({ status: failed ? "failed" : "retry", attempts, last_error: safeError(error), next_attempt_at: new Date(Date.now() + retryDelay(attempts)).toISOString(), processed_at: failed ? new Date().toISOString() : null }).eq("id", event.id);
      }
    }
    const { data: deliveries } = await sb.from("integration_webhook_deliveries").select("*").in("status", ["pending", "retry"]).lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(10);
    for (const delivery of deliveries ?? []) {
      const { data: connection } = await sb.from("hotel_channel_connections").select("*").eq("id", delivery.connection_id).eq("is_active", true).eq("review_status", "active").maybeSingle();
      try {
        if (!connection) throw new Error("Connection is inactive");
        const result = await deliver(connection, delivery.event_type, delivery.payload);
        await sb.from("integration_webhook_deliveries").update({ status: "delivered", attempts: delivery.attempts + 1, response_status: result.status, delivered_at: new Date().toISOString(), last_error: null }).eq("id", delivery.id);
        summary.deliveries++;
      } catch (error) {
        summary.errors++;
        const attempts = delivery.attempts + 1, failed = attempts >= delivery.max_attempts;
        await sb.from("integration_webhook_deliveries").update({ status: failed ? "failed" : "retry", attempts, last_error: safeError(error), next_attempt_at: new Date(Date.now() + retryDelay(attempts)).toISOString() }).eq("id", delivery.id);
      }
    }
    return json({ success: true, ...summary });
  } catch (error) { return json({ error: safeError(error), ...summary }, 500); }
});
