import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { auditIntegration, canManageHotel, integrationServiceClient, manageableConnection, managementActor, safeError } from "../_shared/integration/access.ts";
import { decryptCredentials, encryptCredentials, randomToken, sha256, signPayload } from "../_shared/integration/crypto.ts";
import { integrationSnapshot } from "../_shared/integration/snapshot.ts";

const sb = integrationServiceClient();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const scopes = ["properties:read", "inventory:read", "inventory:write", "rates:read", "rates:write", "reservations:read", "reservations:write"];
const cleanScopes = (input: unknown) => Array.isArray(input) ? [...new Set(input.filter(s => typeof s === "string" && scopes.includes(s)))] : [];

const createSchema = z.object({
  hotel_id: z.string().uuid(), provider_key: z.string().trim().min(2).max(80),
  connection_kind: z.enum(["ota", "pms", "channel_manager"]),
  direction: z.enum(["inbound", "outbound", "bidirectional"]),
  environment: z.enum(["sandbox", "production"]),
  external_property_id: z.string().trim().max(160).optional(),
});
const credentialSchema = z.object({
  api_endpoint: z.string().trim().max(1000).optional(), webhook_url: z.string().trim().max(1000).optional(),
  api_key: z.string().max(4000).optional(), api_secret: z.string().max(4000).optional(),
  access_token: z.string().max(6000).optional(), client_id: z.string().max(500).optional(),
  client_secret: z.string().max(4000).optional(),
});
const mappingSchema = z.object({
  rooms: z.array(z.object({ room_id: z.string().uuid(), external_room_id: z.string().trim().min(1).max(160) })).max(500),
  rates: z.array(z.object({ room_id: z.string().uuid(), rate_plan_id: z.string().uuid(), external_rate_plan_id: z.string().trim().min(1).max(160) })).max(1000),
});
const settingsSchema = z.object({
  sync_inventory: z.boolean(), sync_rates: z.boolean(), sync_reservations: z.boolean(),
  sync_interval_minutes: z.number().int().min(5).max(1440),
  inventory_master: z.enum(["jaagax", "external"]), rates_master: z.enum(["jaagax", "external"]),
  webhook_url: z.string().trim().max(1000).nullable().optional(),
});

function httpsUrl(value: string | null | undefined) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Integration URLs must be secure HTTPS addresses without embedded credentials");
  return url.toString();
}

async function loadCredentials(connectionId: string) {
  const { data } = await sb.from("integration_credentials").select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
  return decryptCredentials(data);
}

async function saveCredentials(connectionId: string, credentials: Record<string, unknown>) {
  const encrypted = await encryptCredentials(credentials);
  const { error } = await sb.from("integration_credentials").upsert({ connection_id: connectionId, ...encrypted, updated_at: new Date().toISOString() });
  if (error) throw new Error("Credentials could not be saved securely");
}

async function overview(actor: any, hotelId?: string) {
  let query = sb.from("hotel_channel_connections").select("*").order("updated_at", { ascending: false });
  if (hotelId) query = query.eq("hotel_id", hotelId);
  const [{ data: providers }, { data: connections }, { data: hotels }] = await Promise.all([
    sb.from("integration_provider_catalog").select("key,name,kind,live_adapter,configuration_enabled,description").order("name"),
    query.limit(200),
    actor.admin ? sb.from("partner_hotels").select("id,name,city,manager_id").order("name").limit(500) : sb.from("partner_hotels").select("id,name,city,manager_id").order("name").limit(100),
  ]);
  const ids = (connections ?? []).map(c => c.id);
  const hotelIds = hotelId ? [hotelId] : [...new Set((connections ?? []).map(c => c.hotel_id))];
  if (!ids.length) return { providers: providers ?? [], connections: [], hotels: hotels ?? [], rooms: [], rate_plans: [], room_mappings: [], rate_mappings: [], jobs: [], webhook_events: [], deliveries: [], issues: [] };
  const [rooms, ratePlans, roomMappings, rateMappings, jobs, events, deliveries, issues] = await Promise.all([
    hotelIds.length ? sb.from("hotel_rooms").select("id,hotel_id,room_type,room_name,max_occupancy,base_price,is_active").in("hotel_id", hotelIds).order("room_name") : Promise.resolve({ data: [] }),
    hotelIds.length ? sb.from("hotel_rate_plans").select("id,hotel_id,room_id,name,rate_plan_name,rate_plan_code,is_active").in("hotel_id", hotelIds).order("name") : Promise.resolve({ data: [] }),
    sb.from("hotel_room_channel_mappings").select("*").in("connection_id", ids),
    sb.from("hotel_rate_channel_mappings").select("*").in("connection_id", ids),
    sb.from("integration_sync_jobs").select("*").in("connection_id", ids).order("created_at", { ascending: false }).limit(200),
    sb.from("integration_webhook_events").select("id,connection_id,hotel_id,external_event_id,event_type,status,signature_verified,attempts,last_error,received_at,processed_at").in("connection_id", ids).order("received_at", { ascending: false }).limit(100),
    sb.from("integration_webhook_deliveries").select("id,connection_id,hotel_id,event_type,status,attempts,max_attempts,response_status,last_error,created_at,delivered_at").in("connection_id", ids).order("created_at", { ascending: false }).limit(100),
    sb.from("integration_reconciliation_issues").select("*").in("connection_id", ids).order("detected_at", { ascending: false }).limit(200),
  ]);
  return { providers: providers ?? [], connections: connections ?? [], hotels: hotels ?? [], rooms: rooms.data ?? [], rate_plans: ratePlans.data ?? [], room_mappings: roomMappings.data ?? [], rate_mappings: rateMappings.data ?? [], jobs: jobs.data ?? [], webhook_events: events.data ?? [], deliveries: deliveries.data ?? [], issues: issues.data ?? [] };
}

async function runConnectionTest(actor: any, connection: any) {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const credentials = await loadCredentials(connection.id);
  checks.push({ name: "Credential decryption", ok: Object.keys(credentials).length > 0, detail: Object.keys(credentials).length ? "Server-only credentials are readable" : "No credentials configured" });
  const { count } = await sb.from("hotel_room_channel_mappings").select("id", { count: "exact", head: true }).eq("connection_id", connection.id).eq("sync_enabled", true);
  checks.push({ name: "Property and room mapping", ok: Boolean(connection.channel_property_id && count), detail: `${count ?? 0} mapped room types` });
  let externalOk = true;
  if (connection.direction !== "inbound") {
    if (connection.channel === "hyperguest") {
      const base = (Deno.env.get("HYPERGUEST_SEARCH_URL") ?? "https://search-api.hyperguest.io/2.0/").replace(/\/?$/, "/");
      const key = Deno.env.get("HYPERGUEST_LIVE_API_KEY");
      const checkIn = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
      const qs = new URLSearchParams({ checkIn, nights: "1", guests: "2", hotelIds: String(connection.channel_property_id ?? ""), customerNationality: "IN", currency: "INR" });
      const response = await fetch(`${base}?${qs}`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
      await response.text();
      externalOk = response.ok;
      checks.push({ name: "HyperGuest live availability", ok: response.ok, detail: `Supplier returned HTTP ${response.status}` });
    } else {
      const endpoint = httpsUrl(connection.settings?.api_endpoint);
      if (!endpoint) {
        externalOk = false;
        checks.push({ name: "Provider HTTPS connection", ok: false, detail: "An API endpoint is required" });
      } else {
        const token = credentials.access_token || credentials.api_key;
        const response = await fetch(endpoint, { headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(20_000) });
        await response.text();
        externalOk = response.ok;
        checks.push({ name: "Provider HTTPS connection", ok: response.ok, detail: `Provider returned HTTP ${response.status}` });
      }
    }
  } else {
    const { data: room } = await sb.from("hotel_rooms").select("id").eq("hotel_id", connection.hotel_id).eq("is_active", true).limit(1).maybeSingle();
    externalOk = Boolean(room && credentials.webhook_secret);
    checks.push({ name: "JAAGA X inbound API readiness", ok: externalOk, detail: externalOk ? "Central hotel records and webhook signing are ready" : "An active room and signing secret are required" });
  }
  const success = checks.every(c => c.ok);
  await sb.from("hotel_channel_connections").update({ last_tested_at: new Date().toISOString(), last_test_status: success ? "success" : "failed", last_test_details: { checks }, last_sync_error: success ? null : "Connection test failed" }).eq("id", connection.id);
  await sb.from("channel_api_payloads").insert({ hotel_id: connection.hotel_id, channel: connection.channel, operation: "detail", request_id: connection.id, request_payload: { action: "connection_test", direction: connection.direction }, response_payload: { checks }, http_status: success ? 200 : 409, error_message: success ? null : "Connection test failed" });
  await auditIntegration(sb, actor.id, connection, success ? "test_succeeded" : "test_failed", { checks });
  return { success, checks };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const actor = await managementActor(req, sb);
  if (!actor) return json({ error: "Please sign in to continue" }, 401);
  const action = String(body?.action ?? "");
  try {
    if (action === "overview") {
      if (body.hotel_id && !(await canManageHotel(sb, actor.id, body.hotel_id, actor.admin))) return json({ error: "Property access denied" }, 403);
      return json(await overview(actor, body.hotel_id));
    }
    if (action === "create") {
      const input = createSchema.parse(body);
      if (!(await canManageHotel(sb, actor.id, input.hotel_id, actor.admin))) return json({ error: "Property access denied" }, 403);
      const { data: provider } = await sb.from("integration_provider_catalog").select("*").eq("key", input.provider_key).eq("kind", input.connection_kind).eq("configuration_enabled", true).single();
      if (!provider) return json({ error: "This provider is not available for configuration" }, 400);
      const { data: connection, error } = await sb.from("hotel_channel_connections").insert({
        hotel_id: input.hotel_id, channel: input.provider_key, channel_property_id: input.external_property_id || null,
        connection_kind: input.connection_kind, direction: input.direction, environment: input.environment,
        status: "draft", review_status: "draft", is_active: false, settings: { sync_inventory: true, sync_rates: true, sync_reservations: true, sync_interval_minutes: 15, inventory_master: "jaagax", rates_master: "jaagax" },
      }).select("*").single();
      if (error) return json({ error: error.code === "23505" ? "This provider is already connected to the property" : "Connection could not be created" }, 409);
      await auditIntegration(sb, actor.id, connection, "created", { direction: input.direction, environment: input.environment });
      return json({ connection });
    }
    if (action === "complete_manual_onboarding") {
      const { data: app } = await sb.from("hotel_partner_applications").select("id").eq("user_id", actor.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!app) return json({ error: "Partner application not found" }, 404);
      await sb.from("hotel_partner_applications").update({ pms_setup_completed: true, pms_provider: "none" }).eq("id", app.id);
      return json({ success: true });
    }

    const connection = await manageableConnection(sb, actor, String(body.connection_id ?? ""));
    if (!connection) return json({ error: "Connection not found or access denied" }, 404);

    if (action === "credentials") {
      if (["active", "pending_review"].includes(connection.review_status)) return json({ error: "Suspend or return the connection to draft before replacing credentials" }, 409);
      const input = credentialSchema.parse(body);
      const previous = await loadCredentials(connection.id);
      const credentials: Record<string, unknown> = { ...previous };
      for (const key of ["api_key", "api_secret", "access_token", "client_id", "client_secret"] as const) if (input[key]) credentials[key] = input[key];
      if (connection.direction !== "outbound" && !credentials.webhook_secret) credentials.webhook_secret = randomToken(48);
      if (connection.channel === "hyperguest") credentials.managed = true;
      if (connection.direction !== "inbound" && connection.channel !== "hyperguest" && !credentials.access_token && !credentials.api_key) return json({ error: "An API key or access token is required" }, 400);
      const settings = { ...connection.settings, api_endpoint: httpsUrl(input.api_endpoint) ?? connection.settings?.api_endpoint ?? null, webhook_url: httpsUrl(input.webhook_url) ?? connection.settings?.webhook_url ?? null };
      await saveCredentials(connection.id, credentials);
      await sb.from("hotel_channel_connections").update({ credentials_status: "configured", settings, last_test_status: null, last_test_details: {}, updated_at: new Date().toISOString() }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, "credentials_saved");
      return json({ success: true });
    }
    if (action === "mappings") {
      const input = mappingSchema.parse(body);
      const roomIds = input.rooms.map(r => r.room_id);
      const rateIds = input.rates.map(r => r.rate_plan_id);
      const [{ data: validRooms }, { data: validRates }] = await Promise.all([
        sb.from("hotel_rooms").select("id").eq("hotel_id", connection.hotel_id).in("id", roomIds.length ? roomIds : [crypto.randomUUID()]),
        sb.from("hotel_rate_plans").select("id,room_id").eq("hotel_id", connection.hotel_id).in("id", rateIds.length ? rateIds : [crypto.randomUUID()]),
      ]);
      if ((validRooms ?? []).length !== new Set(roomIds).size || (validRates ?? []).length !== new Set(rateIds).size) return json({ error: "Every mapping must belong to the selected property" }, 400);
      if (input.rates.some(r => !roomIds.includes(r.room_id) || !(validRates ?? []).some(v => v.id === r.rate_plan_id && (!v.room_id || v.room_id === r.room_id)))) return json({ error: "Each rate plan must match a mapped room" }, 400);
      await sb.from("hotel_room_channel_mappings").delete().eq("connection_id", connection.id);
      await sb.from("hotel_rate_channel_mappings").delete().eq("connection_id", connection.id);
      if (input.rooms.length) {
        const { error } = await sb.from("hotel_room_channel_mappings").insert(input.rooms.map(r => ({ ...r, connection_id: connection.id, hotel_id: connection.hotel_id, channel: connection.channel, sync_enabled: true })));
        if (error) throw error;
      }
      if (input.rates.length) {
        const { error } = await sb.from("hotel_rate_channel_mappings").insert(input.rates.map(r => ({ ...r, connection_id: connection.id, hotel_id: connection.hotel_id, sync_enabled: true })));
        if (error) throw error;
      }
      const reset = ["active", "approved"].includes(connection.review_status);
      await sb.from("hotel_channel_connections").update({ ...(reset ? { review_status: "draft", status: "draft", is_active: false, approved_at: null, approved_by: null, activated_at: null } : {}), last_test_status: null, updated_at: new Date().toISOString() }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, "mappings_saved", { rooms: input.rooms.length, rates: input.rates.length, review_reset: reset });
      return json({ success: true, review_reset: reset });
    }
    if (action === "settings") {
      const input = settingsSchema.parse(body);
      const settings = { ...connection.settings, ...input, webhook_url: httpsUrl(input.webhook_url) ?? null };
      await sb.from("hotel_channel_connections").update({ settings, last_test_status: null, updated_at: new Date().toISOString() }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, "sync_settings_saved");
      return json({ success: true });
    }
    if (action === "test") return json(await runConnectionTest(actor, connection));
    if (action === "submit") {
      const { count } = await sb.from("hotel_room_channel_mappings").select("id", { count: "exact", head: true }).eq("connection_id", connection.id);
      if (connection.credentials_status !== "configured" || !count || connection.last_test_status !== "success" || !connection.channel_property_id) return json({ error: "Configure credentials, an external property ID, room mappings and a successful test first" }, 409);
      if (!["draft", "rejected"].includes(connection.review_status)) return json({ error: "This connection has already been submitted" }, 409);
      await sb.from("hotel_channel_connections").update({ review_status: "pending_review", status: "pending_review", submitted_at: new Date().toISOString(), review_notes: null }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, "submitted_for_review");
      return json({ success: true });
    }
    if (action === "review") {
      if (!actor.admin) return json({ error: "Global Admin access required" }, 403);
      const decision = z.enum(["approved", "rejected"]).parse(body.decision);
      if (connection.review_status !== "pending_review") return json({ error: "Only submitted connections can be reviewed" }, 409);
      if (decision === "approved" && connection.last_test_status !== "success") return json({ error: "Run a successful connection test before approval" }, 409);
      await sb.from("hotel_channel_connections").update({ review_status: decision, status: decision, review_notes: String(body.notes ?? "").slice(0, 2000) || null, reviewed_at: new Date().toISOString(), reviewed_by: actor.id, ...(decision === "approved" ? { approved_at: new Date().toISOString(), approved_by: actor.id } : {}) }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, decision, { notes: String(body.notes ?? "").slice(0, 2000) });
      return json({ success: true });
    }
    if (action === "activate" || action === "suspend") {
      if (!actor.admin) return json({ error: "Global Admin access required" }, 403);
      if (action === "suspend") {
        await sb.from("hotel_channel_connections").update({ is_active: false, review_status: "suspended", status: "suspended", updated_at: new Date().toISOString() }).eq("id", connection.id);
        await sb.from("integration_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("connection_id", connection.id).is("revoked_at", null);
        await auditIntegration(sb, actor.id, connection, "suspended");
        return json({ success: true });
      }
      const { data: provider } = await sb.from("integration_provider_catalog").select("live_adapter").eq("key", connection.channel).single();
      const { count } = await sb.from("hotel_room_channel_mappings").select("id", { count: "exact", head: true }).eq("connection_id", connection.id);
      const inboundOnly = connection.direction === "inbound";
      if (connection.review_status !== "approved" && connection.review_status !== "suspended") return json({ error: "Global Admin approval is required first" }, 409);
      if (connection.credentials_status !== "configured" || connection.last_test_status !== "success" || !count || (!provider?.live_adapter && !inboundOnly)) return json({ error: inboundOnly ? "Credentials, mappings and a successful test are required" : "This provider has no approved live adapter yet" }, 409);
      await sb.from("hotel_channel_connections").update({ is_active: true, review_status: "active", status: "active", connected_at: new Date().toISOString(), activated_at: new Date().toISOString(), approved_by: actor.id, approved_at: connection.approved_at ?? new Date().toISOString() }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, "activated");
      return json({ success: true });
    }
    if (action === "issue_client") {
      if (!connection.is_active || connection.review_status !== "active" || connection.direction === "outbound") return json({ error: "An active inbound or bidirectional connection is required" }, 409);
      await sb.from("integration_api_clients").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("connection_id", connection.id).is("revoked_at", null);
      const clientId = `jx_${randomToken(18)}`;
      const clientSecret = `jxs_${randomToken(42)}`;
      const requested = cleanScopes(body.scopes);
      const granted = requested.length ? requested : ["properties:read", "inventory:read", "rates:read", "reservations:read", "reservations:write"];
      const { error } = await sb.from("integration_api_clients").insert({ connection_id: connection.id, client_id: clientId, secret_hash: await sha256(clientSecret), scopes: granted });
      if (error) throw error;
      const credentials = await loadCredentials(connection.id);
      const webhookSecret = String(credentials.webhook_secret ?? randomToken(48));
      await saveCredentials(connection.id, { ...credentials, webhook_secret: webhookSecret });
      await sb.from("hotel_channel_connections").update({ client_id: clientId }).eq("id", connection.id);
      await auditIntegration(sb, actor.id, connection, "api_client_issued", { scopes: granted });
      const base = Deno.env.get("SUPABASE_URL") ?? "";
      return json({ client_id: clientId, client_secret: clientSecret, webhook_secret: webhookSecret, scopes: granted, token_url: `${base}/functions/v1/integration-api/oauth/token`, api_base_url: `${base}/functions/v1/integration-api/v1`, webhook_url: `${base}/functions/v1/integration-webhooks/${clientId}` });
    }
    if (action === "sync" || action === "reconcile") {
      if (!connection.is_active || connection.review_status !== "active") return json({ error: "Activate the connection before synchronization" }, 409);
      const kind = action === "reconcile" ? "reconcile" : "full_sync";
      const snapshot = await integrationSnapshot(sb, connection);
      const { data: job, error } = await sb.from("integration_sync_jobs").insert({ connection_id: connection.id, hotel_id: connection.hotel_id, kind, direction: "outbound", payload: snapshot, idempotency_key: randomToken(16), status: "pending" }).select("*").single();
      if (error) throw error;
      await auditIntegration(sb, actor.id, connection, `${action}_queued`, { job_id: job.id });
      return json({ success: true, job });
    }
    if (action === "resolve_issue") {
      const { error } = await sb.from("integration_reconciliation_issues").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: actor.id }).eq("id", body.issue_id).eq("connection_id", connection.id);
      if (error) throw error;
      await auditIntegration(sb, actor.id, connection, "reconciliation_resolved", { issue_id: body.issue_id });
      return json({ success: true });
    }
    return json({ error: "Unknown integration action" }, 400);
  } catch (error) {
    console.error("Integration management failed", safeError(error));
    return json({ error: safeError(error) }, 400);
  }
});
