import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { integrationServiceClient, safeError } from "../_shared/integration/access.ts";
import { randomToken, sha256 } from "../_shared/integration/crypto.ts";
import { cancelIntegrationReservation, createIntegrationReservation, modifyIntegrationReservation, readIntegrationReservation } from "../_shared/integration/reservations.ts";

const sb = integrationServiceClient();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const route = (req: Request) => {
  const path = new URL(req.url).pathname;
  const marker = "/integration-api/";
  return path.includes(marker) ? path.slice(path.indexOf(marker) + marker.length).replace(/^\/+|\/+$/g, "") : "";
};

async function issueToken(req: Request) {
  const input = z.object({ client_id: z.string().min(8).max(200), client_secret: z.string().min(16).max(500), grant_type: z.literal("client_credentials").default("client_credentials") }).parse(await req.json());
  const { data: client } = await sb.from("integration_api_clients").select("*").eq("client_id", input.client_id).eq("is_active", true).is("revoked_at", null).maybeSingle();
  if (!client || client.secret_hash !== await sha256(input.client_secret)) return json({ error: "invalid_client" }, 401);
  const { data: connection } = await sb.from("hotel_channel_connections").select("id,is_active,review_status").eq("id", client.connection_id).single();
  if (!connection?.is_active || connection.review_status !== "active") return json({ error: "connection_inactive" }, 403);
  const raw = `jxt_${randomToken(48)}`;
  const expiresAt = new Date(Date.now() + 60 * 60_000);
  const { error } = await sb.from("integration_access_tokens").insert({ connection_id: connection.id, token_hash: await sha256(raw), scopes: client.scopes, expires_at: expiresAt.toISOString() });
  if (error) throw error;
  return json({ access_token: raw, token_type: "Bearer", expires_in: 3600, expires_at: expiresAt.toISOString(), scope: client.scopes.join(" ") });
}

async function apiConnection(req: Request, scope: string) {
  const raw = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!raw) return null;
  const { data: token } = await sb.from("integration_access_tokens").select("*").eq("token_hash", await sha256(raw)).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!token || !(token.scopes ?? []).includes(scope)) return null;
  const { data: connection } = await sb.from("hotel_channel_connections").select("*").eq("id", token.connection_id).eq("is_active", true).eq("review_status", "active").maybeSingle();
  return connection ?? null;
}

const calendarSchema = z.object({ rows: z.array(z.object({
  room_id: z.string().uuid(), rate_plan_id: z.string().uuid().nullable().optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available_units: z.number().int().min(0).max(10000).optional(), price: z.number().min(0).max(100000000).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(), stop_sell: z.boolean().optional(), min_stay: z.number().int().min(1).max(365).optional(),
  max_stay: z.number().int().min(1).max(365).nullable().optional(), closed_to_arrival: z.boolean().optional(), closed_to_departure: z.boolean().optional(),
})).min(1).max(366) });

async function updateCalendar(connection: any, req: Request, mode: "inventory" | "rates") {
  if (connection.direction === "outbound") return json({ error: "This connection does not accept inbound updates" }, 403);
  if (connection.settings?.[`${mode}_master`] !== "external") return json({ error: `External ${mode} master mode is not enabled` }, 409);
  const input = calendarSchema.parse(await req.json());
  const { data: mappings } = await sb.from("hotel_room_channel_mappings").select("room_id").eq("connection_id", connection.id).eq("sync_enabled", true);
  const allowed = new Set((mappings ?? []).map(m => m.room_id));
  if (input.rows.some(r => !allowed.has(r.room_id))) return json({ error: "Every calendar row must use a mapped room" }, 400);
  for (const row of input.rows) {
    const base = { hotel_id: connection.hotel_id, room_id: row.room_id, rate_plan_id: row.rate_plan_id ?? null, date: row.date, updated_at: new Date().toISOString() };
    const values: any = mode === "inventory" ? { available_units: row.available_units, stop_sell: row.stop_sell, min_stay: row.min_stay, max_stay: row.max_stay, closed_to_arrival: row.closed_to_arrival, closed_to_departure: row.closed_to_departure } : { price: row.price, currency: row.currency };
    for (const key of Object.keys(values)) if (values[key] === undefined) delete values[key];
    if (!Object.keys(values).length) return json({ error: `No ${mode} values supplied` }, 400);
    let query = sb.from("hotel_rate_calendar").select("id").eq("room_id", row.room_id).eq("date", row.date);
    query = row.rate_plan_id ? query.eq("rate_plan_id", row.rate_plan_id) : query.is("rate_plan_id", null);
    const { data: existing } = await query.maybeSingle();
    const { error } = existing ? await sb.from("hotel_rate_calendar").update(values).eq("id", existing.id) : await sb.from("hotel_rate_calendar").insert({ ...base, ...values });
    if (error) throw error;
  }
  await sb.from("integration_sync_jobs").insert({ connection_id: connection.id, hotel_id: connection.hotel_id, kind: `${mode}_update`, direction: "inbound", status: "success", payload: { rows: input.rows }, result: { updated: input.rows.length }, completed_at: new Date().toISOString(), idempotency_key: req.headers.get("Idempotency-Key") ?? randomToken(16) });
  return json({ success: true, updated: input.rows.length });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const path = route(req);
  try {
    if (path === "oauth/token" && req.method === "POST") return await issueToken(req);
    const reservationWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const scope = path === "v1/properties" || path.startsWith("v1/reservations") ? (reservationWrite ? "reservations:write" : path === "v1/properties" ? "properties:read" : "reservations:read") : path === "v1/rates" && req.method === "PUT" ? "rates:write" : path === "v1/availability" && req.method === "PUT" ? "inventory:write" : path === "v1/rates" ? "rates:read" : "inventory:read";
    const connection = await apiConnection(req, scope);
    if (!connection) return json({ error: "invalid_token", error_description: "A valid active token with the required scope is required" }, 401);
    if (path === "v1/properties" && req.method === "GET") {
      const { data: hotel } = await sb.from("partner_hotels").select("id,name,city,locality,country,default_currency,business_types,amenities").eq("id", connection.hotel_id).single();
      return json({ properties: [{ ...hotel, external_property_id: connection.channel_property_id }] });
    }
    if (path === "v1/rooms" && req.method === "GET") {
      const { data } = await sb.from("hotel_room_channel_mappings").select("external_room_id,hotel_rooms(id,room_type,room_name,description,max_occupancy,max_adults,max_children,base_price,total_units,is_active)").eq("connection_id", connection.id).eq("sync_enabled", true);
      return json({ rooms: (data ?? []).map(r => ({ ...r.hotel_rooms, external_room_id: r.external_room_id })) });
    }
    if (path === "v1/rate-plans" && req.method === "GET") {
      const { data } = await sb.from("hotel_rate_channel_mappings").select("external_rate_plan_id,hotel_rate_plans(id,room_id,name,rate_plan_name,rate_plan_code,currency,board,is_refundable,is_active)").eq("connection_id", connection.id).eq("sync_enabled", true);
      return json({ rate_plans: (data ?? []).map(r => ({ ...r.hotel_rate_plans, external_rate_plan_id: r.external_rate_plan_id })) });
    }
    if ((path === "v1/availability" || path === "v1/rates") && req.method === "GET") {
      const url = new URL(req.url);
      const from = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(url.searchParams.get("from"));
      const to = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(url.searchParams.get("to"));
      if (from >= to || Date.parse(to) - Date.parse(from) > 92 * 86400000) return json({ error: "Use a date range of 1 to 92 days" }, 400);
      const { data: mappings } = await sb.from("hotel_room_channel_mappings").select("room_id,external_room_id").eq("connection_id", connection.id).eq("sync_enabled", true);
      const rows = [];
      for (const mapping of mappings ?? []) {
        const { data: free } = await sb.rpc("room_free_units", { _room_id: mapping.room_id, _check_in: from, _check_out: to });
        const { data: calendar } = await sb.from("hotel_rate_calendar").select("date,price,currency,available_units,stop_sell,min_stay,max_stay,rate_plan_id").eq("room_id", mapping.room_id).gte("date", from).lt("date", to).order("date");
        rows.push({ room_id: mapping.room_id, external_room_id: mapping.external_room_id, minimum_free_units: free, calendar: calendar ?? [] });
      }
      return json({ from, to, rooms: rows });
    }
    if (path === "v1/availability" && req.method === "PUT") return await updateCalendar(connection, req, "inventory");
    if (path === "v1/rates" && req.method === "PUT") return await updateCalendar(connection, req, "rates");
    if (path === "v1/reservations" && req.method === "POST") {
      const key = req.headers.get("Idempotency-Key") ?? "";
      if (key.length < 8 || key.length > 200) return json({ error: "An Idempotency-Key between 8 and 200 characters is required" }, 400);
      return json(await createIntegrationReservation(sb, connection, await req.json(), key), 201);
    }
    const match = path.match(/^v1\/reservations\/([^/]+)(\/cancel)?$/);
    if (match) {
      const externalId = decodeURIComponent(match[1]);
      if (match[2] && req.method === "POST") {
        const body = await req.json();
        return json(await cancelIntegrationReservation(sb, connection, externalId, z.number().int().min(1).parse(body.external_version), String(body.reason ?? "External cancellation").slice(0, 500)));
      }
      if (req.method === "GET") return json(await readIntegrationReservation(sb, connection, externalId));
      if (req.method === "PATCH") return json(await modifyIntegrationReservation(sb, connection, externalId, await req.json()));
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    console.error("Integration API failed", safeError(error));
    return json({ error: "request_failed", error_description: safeError(error) }, 400);
  }
});
