// HyperGuest certification-grade connector: static content, search, pre-book,
// booking (300s-aware with Booking List fallback), retrieve and cancel.
// Every external call is logged to channel_api_payloads for certification logs.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { logChannelPayload, type ChannelOperation } from "../_shared/channel/audit.ts";
import { MARKETPLACE_IDS, LEGACY_LIVE_IDS, catalogRows, propertyFields, availabilitySummary, certificationRulesApply } from "../_shared/channel/marketplace.ts";
import { supplierGuests, paxSignature, publicRate, customerPrice, bookingList, bookingContent, bookingStatus, redactSupplier, supplierDisclosures } from "../_shared/channel/travelRules.ts";
import { z } from "npm:zod@3.25.76";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";

import { AsyncLocalStorage } from "node:async_hooks";
const TEST_KEY = Deno.env.get("HYPERGUEST_API_KEY") ?? "";
const LIVE_KEY = Deno.env.get("HYPERGUEST_LIVE_API_KEY") ?? "";
// Per-request token: "live" requests (certification Stage 3) use the live token.
const keyCtx = new AsyncLocalStorage<string>();
const currentKey = () => keyCtx.getStore() ?? TEST_KEY;
const SEARCH = (Deno.env.get("HYPERGUEST_SEARCH_URL") ?? "https://search-api.hyperguest.io/2.0/").replace(/\/?$/, "/");
const BOOK = (Deno.env.get("HYPERGUEST_BOOK_URL") ?? "https://book-api.hyperguest.com/2.0/").replace(/\/?$/, "/");
const STATIC = (Deno.env.get("HYPERGUEST_STATIC_URL") ?? "https://hg-static.hyperguest.com").replace(/\/$/, "");
// Edge runtime wall clock is below HyperGuest's 300s; we wait as long as we safely
// can, then reconcile through the Booking List API.
const BOOK_WAIT_MS = 140_000;
let catalogCache: { rows: any[]; expires: number } | null = null;

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hg(op: ChannelOperation, url: string, body?: unknown, timeoutMs = 60_000, bookingRef?: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let status = 0, payload: any = null, err: string | null = null;
  try {
    const res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${currentKey()}`, "Accept-Encoding": "gzip, deflate",
        Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    status = res.status;
    const text = await res.text();
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
    if (!res.ok) err = payload?.error ?? `HTTP ${status}`;
  } catch (e) {
    err = (e as Error).name === "AbortError" ? "timeout" : String(e);
  } finally { clearTimeout(t); }
  await logChannelPayload(sb, {
    channel: "hyperguest", operation: op, endpoint: url,
    request_payload: redact(body), response_payload: redactSupplier(payload), http_status: status,
    request_id: bookingRef ?? null, error_message: err,
  });
  return { ok: !err, status, data: payload, error: err };
}

type RoomPax = { adults: number; childAges?: number[] };
const guestsParam = supplierGuests;

function friendly(err: any) {
  const code = err?.errorCode ?? "";
  const msg = JSON.stringify(err ?? "").toLowerCase();
  if (code === "BN.506") return "Supplier credit is unavailable. Please contact JaagaX before retrying.";
  if (code === "BN.507") return "The hotel could not process the payment card. Check it or use another card.";
  if (code === "BN.503") return "This hotel is not ready to accept bookings. Please choose another hotel.";
  if (msg.includes("test properties")) return "Live bookings can't be made on HyperGuest test hotels. Choose a real hotel that has a direct contract with you.";
  if (msg.includes("price")) return "The price for this room has changed. Please review the new price.";
  if (msg.includes("availab") || msg.includes("sold")) return "This room is no longer available for your dates. Please choose another.";
  if (code === "BN.400") return "Some booking details are invalid. Please check guests and dates.";
  return "HyperGuest could not complete this request. Please try again.";
}

async function reconcile(ref: string) {
  const r = await hg("booking_retrieve", `${BOOK}booking/list`, { agencyReference: ref }, 60_000, ref);
  return r.ok ? bookingList(r.data).find((b: any) => b.reference?.agency === ref || b.references?.agency === ref) ?? (bookingList(r.data).length === 1 ? bookingList(r.data)[0] : null) : null;
}

async function saveBooking(ref: string, b: any) {
  const total = b?.payment?.chargeAmount;
  await sb.from("hyperguest_bookings").update({
    hg_booking_id: b?.bookingId ?? null,
    status: bookingStatus(b),
    total_amount: total?.price ?? null, total_currency: total?.currency ?? null,
    cancellation: (b?.rooms ?? []).map((r: any) => r?.cancellationPolicy ?? []),
    raw: redactSupplier(b), updated_at: new Date().toISOString(),
    ...(String(b?.status).toLowerCase() === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
  }).eq("agency_reference", ref);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request" }, 400);
  const managed = body.action === "maintenance";
  if (managed) { const denied = authenticateCronRequest(req); if (denied) return json({ error: "Unauthorized" }, denied.status); }
  let live = body?.live === true || managed;
  const propertyId = body.propertyId ?? body.payload?.propertyId ?? body.search?.propertyId;
  if (propertyId) {
    const { data: mapped } = await sb.from("partner_hotels").select("id").eq("hyperguest_property_id", String(propertyId)).maybeSingle();
    if (mapped) live = true;
  }
  if (["sync", "marketplace", "marketplace-search", "publish"].includes(body.action)) live = true;
  if (body?.action === "refresh" || body?.action === "cancel") {
    const { data: row } = await sb.from("hyperguest_bookings").select("environment").eq("id", String(body.id ?? "")).maybeSingle();
    live = row?.environment === "live";
  }
  const key = live ? LIVE_KEY : TEST_KEY;
  if (!key) return json({ error: live ? "The live HyperGuest token is not set up yet" : "HyperGuest is not configured" }, 503);
  try { return await keyCtx.run(key, () => handle(req, body, live, managed)); }
  catch (error) { console.error("HyperGuest request failed", (error as Error).message); return json({ error: "Hotel service is temporarily unavailable. Please try again." }, 503); }
});

const USD_LIMIT = 500;
const USD_RATE: Record<string, number> = { USD: 1, EUR: 1.12, GBP: 1.3, BRL: 0.19, MUR: 0.023, INR: 0.012, AED: 0.273 };
const toUsd = (a: number, c: string) => USD_RATE[String(c).toUpperCase()] != null ? a * USD_RATE[String(c).toUpperCase()] : NaN;

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };

function redact(b: any) {
  if (!b?.paymentDetails) return b ?? null;
  const d = b.paymentDetails.details ?? {};
  return { ...b, paymentDetails: { type: b.paymentDetails.type, details: { number: d.number ? `****${String(d.number).slice(-4)}` : undefined, cvv: "***", expiry: d.expiry, name: d.name } } };
}

async function handle(req: Request, body: any, live: boolean, managed = false) {
  const action = String(body?.action ?? "");

  if (managed && action === "maintenance") {
    if (body.task === "reconcile") {
      const { data: pending } = await sb.from("hyperguest_bookings").select("agency_reference,environment").in("status", ["pending", "partial"]).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).order("updated_at").limit(3);
      let refreshed = 0;
      for (const row of pending ?? []) {
        const key = row.environment === "live" ? LIVE_KEY : TEST_KEY;
        if (!key) continue;
        const found = await keyCtx.run(key, () => reconcile(row.agency_reference));
        if (found) { await saveBooking(row.agency_reference, found); refreshed++; }
      }
      return json({ success: true, refreshed });
    }
    if (body.task === "sync") {
      const ids = [...MARKETPLACE_IDS, ...LEGACY_LIVE_IDS];
      const slot = Math.floor(Date.now() / 3600000) % ids.length;
      return handle(req, { action: "sync", propertyId: ids[slot] }, true, true);
    }
    return json({ error: "Unknown maintenance task" }, 400);
  }

  if (action === "marketplace") {
    const { data, error } = await sb.from("partner_hotels").select("id,name,city,locality,images,star_rating,country,hyperguest_property_id,source_channel").eq("source_channel", "hyperguest").eq("is_active", true);
    return error ? json({ error: "Could not load supplier hotels" }, 503) : json({ hotels: data });
  }

  if (action === "marketplace-search") {
    const parsed = z.object({ checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), nights: z.number().int().min(1).max(30), rooms: z.array(z.object({ adults: z.number().int().min(1).max(10), childAges: z.array(z.number().int().min(0).max(17)).max(6).optional() })).min(1).max(5), nationality: z.string().regex(/^[A-Z]{2}$/), currency: z.string().regex(/^[A-Z]{3}$/) }).safeParse(body);
    if (!parsed.success) return json({ error: "Check dates, guests, nationality and currency" }, 400);
    const { data: hotels, error } = await sb.from("partner_hotels").select("hyperguest_property_id").eq("source_channel", "hyperguest").eq("is_active", true);
    if (error) return json({ error: "Could not load supplier inventory" }, 503);
    if (!hotels?.length) return json({ availability: [] });
    const qs = new URLSearchParams({ checkIn: parsed.data.checkIn, nights: String(parsed.data.nights), guests: guestsParam(parsed.data.rooms), hotelIds: hotels.map(h => h.hyperguest_property_id).join(","), customerNationality: parsed.data.nationality, currency: parsed.data.currency });
    const r = await hg("search", `${SEARCH}?${qs}`);
    return r.ok ? json({ availability: availabilitySummary(r.data?.results ?? [], parsed.data.nights, parsed.data.rooms, parsed.data.currency) }) : json({ error: friendly(r.data) }, 502);
  }

  // ---- public actions -----------------------------------------------------
  if (action === "static") {
    const id = Number(body.propertyId);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "propertyId required" }, 400);
    const { data: cached } = await sb.from("partner_hotels").select("supplier_content").eq("hyperguest_property_id", String(id)).maybeSingle();
    if (cached?.supplier_content) return json(cached.supplier_content);
    const r = await hg("detail", `${STATIC}/${id}/property-static.json`);
    return r.ok ? json(r.data) : json({ error: "Could not load hotel details", notFound: true });
  }

  if (action === "search") {
    const id = Number(body.propertyId);
    const rooms: RoomPax[] = Array.isArray(body.rooms) ? body.rooms.slice(0, 5) : [];
    const checkIn = String(body.checkIn ?? "");
    const nights = Number(body.nights);
    if (!id || !rooms.length || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !(nights >= 1 && nights <= 30))
      return json({ error: "propertyId, checkIn, nights and rooms are required" }, 400);
    const qs = new URLSearchParams({
      checkIn, nights: String(nights), guests: guestsParam(rooms), hotelIds: String(id),
      customerNationality: String(body.nationality ?? "IN").toUpperCase().slice(0, 2),
      currency: String(body.currency ?? "INR").toUpperCase().slice(0, 3),
    });
    const r = await hg("search", `${SEARCH}?${qs}`);
    if (r.ok) { for (const property of r.data?.results ?? []) { for (const room of property.rooms ?? []) room.ratePlans = (room.ratePlans ?? []).filter(publicRate); } }
    return r.ok ? json(r.data) : json({ error: friendly(r.data) }, 502);
  }

  // ---- signed-in actions ----------------------------------------------------
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u } = managed ? { data: { user: null } } : await sb.auth.getUser(token);
  const { data: actor } = managed ? await sb.from("admin_scopes").select("user_id").eq("role", "global_admin").eq("is_active", true).limit(1).maybeSingle() : { data: null };
  const user = u?.user ?? (actor ? { id: actor.user_id } : null);
  if (!user) return json({ error: "Please sign in to continue" }, 401);

  if (action === "sync" || action === "publish") {
    const { data: admin } = await sb.rpc("can_manage_hyperguest", { _user_id: user.id });
    if (admin !== true) return json({ error: "Administrator access required" }, 403);
    const id = Number(body.propertyId);
    if (![...MARKETPLACE_IDS, ...LEGACY_LIVE_IDS].includes(id)) return json({ error: "Hotel is not in the approved import list" }, 400);
    if (action === "publish") {
      if (typeof body.published !== "boolean") return json({ error: "Publishing status required" }, 400);
      const { error } = await sb.from("partner_hotels").update({ is_active: body.published, onboarding_status: body.published ? "published" : "unpublished" }).eq("hyperguest_property_id", String(id)).eq("source_channel", "hyperguest");
      return error ? json({ error: "Could not change hotel visibility" }, 409) : json({ success: true });
    }
    let hotelId: string | null = null;
    try {
      if (!catalogCache || catalogCache.expires < Date.now()) {
        const catalog = await hg("detail", `${STATIC}/hotels.json`);
        if (!catalog.ok) throw new Error("HyperGuest catalog could not be retrieved");
        const rows = catalogRows(catalog.data);
        if (!Array.isArray(rows) || !rows.length) throw new Error("HyperGuest returned an empty catalog");
        catalogCache = { rows, expires: Date.now() + 30 * 60_000 };
      }
      if (!catalogCache.rows.some(p => Number(p.id ?? p.propertyId ?? p.hotelId ?? p.hotel_id) === id)) throw new Error("Property is missing from the live HyperGuest catalog");
      const catalogEntry = catalogCache.rows.find(p => Number(p.id ?? p.propertyId ?? p.hotelId ?? p.hotel_id) === id);
      const { data: prior } = await sb.from("partner_hotels").select("supplier_content,supplier_synced_at").eq("hyperguest_property_id", String(id)).maybeSingle();
      if (!body.force && prior?.supplier_content && catalogEntry?.last_updated && Date.parse(catalogEntry.last_updated) <= Date.parse(prior.supplier_synced_at)) return json({ success: true, unchanged: true });
      let detail = await hg("detail", `${STATIC}/${id}/property-static.json`);
      for (let retry = 0; detail.status === 429 && retry < 2; retry++) {
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** retry));
        detail = await hg("detail", `${STATIC}/${id}/property-static.json`);
      }
      if (!detail.ok) throw new Error("Full property content could not be retrieved");
      const p = detail.data;
      if (Number(p?.id) !== id) throw new Error("Supplier property ID does not match");
      const fields = propertyFields(p);
      const { data: existing, error: lookupError } = await sb.from("partner_hotels").select("id,source_channel,is_active,onboarding_status").eq("hyperguest_property_id", String(id)).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing && existing.source_channel !== "hyperguest") throw new Error("Mapped partner-managed hotel requires administrator review; existing record preserved");
      const { data: saved, error: saveError } = await sb.from("partner_hotels").upsert({ ...fields, ...(existing ? { id: existing.id, is_active: existing.is_active, onboarding_status: existing.onboarding_status } : { is_active: true, onboarding_status: "published", published_at: new Date().toISOString(), price_per_night: 0 }) }, { onConflict: "hyperguest_property_id" }).select("id").single();
      if (saveError) throw saveError;
      hotelId = saved.id;
      const roomIds: string[] = [];
      for (const room of p.rooms ?? []) {
        const s = room.settings ?? {};
        const rid = String(room.id); roomIds.push(rid);
        const { data: old, error: oldError } = await sb.from("hotel_rooms").select("id,source_channel").eq("hotel_id", hotelId).eq("hyperguest_room_id", rid).maybeSingle();
        if (oldError) throw oldError;
        if (old && old.source_channel !== "hyperguest") throw new Error("Mapped partner room preserved; manual review required");
        const { error: roomError } = await sb.from("hotel_rooms").upsert({ ...(old ? { id: old.id } : {}), hotel_id: hotelId, hyperguest_room_id: rid, hyperguest_room_type_code: room.pmsCode ?? null, source_channel: "hyperguest", room_type: room.name, room_name: room.name, description: room.descriptions?.find((d: any) => d.language === "en_US")?.description ?? null, photos: (room.images ?? []).map((i: any) => i.uri).filter(Boolean), amenities: (room.facilities ?? []).map((f: any) => f.name), max_occupancy: s.maxOccupancy ?? 1, max_adults: s.adultsNumber ?? s.maxOccupancy ?? 1, max_children: s.childrenNumber ?? 0, max_infants: s.infantsNumber ?? 0, room_size: s.roomSize ?? s.size?.squareMeters ?? null, room_size_unit: "sqm", number_of_bedrooms: s.numberOfBedrooms ?? null, number_of_beds: s.numberOfBeds ?? null, is_active: room.status === "enabled", base_price: 0, total_units: 0, accommodation_kind: "room", updated_at: new Date().toISOString() }, { onConflict: "hotel_id,hyperguest_room_id" });
        if (roomError) throw roomError;
      }
      const { data: storedRooms } = await sb.from("hotel_rooms").select("id,hyperguest_room_id").eq("hotel_id", hotelId).eq("source_channel", "hyperguest");
      const removed = (storedRooms ?? []).filter(r => !roomIds.includes(r.hyperguest_room_id)).map(r => r.id);
      if (removed.length) await sb.from("hotel_rooms").update({ is_active: false }).in("id", removed);
      await sb.from("hyperguest_sync_logs").insert({ property_id: String(id), hotel_id: hotelId, actor_id: user.id, status: "success", message: `${roomIds.length} supplier room types synchronized` });
      return json({ success: true, hotelId, rooms: roomIds.length });
    } catch (error) {
      const message = (error as Error).message;
      await sb.from("partner_hotels").update({ supplier_sync_error: message }).eq("hyperguest_property_id", String(id));
      await sb.from("hyperguest_sync_logs").insert({ property_id: String(id), hotel_id: hotelId, actor_id: user.id, status: "failed", message });
      return json({ error: message }, 409);
    }
  }

  const candidateId = body.payload?.propertyId ?? body.search?.propertyId;
  const { data: marketplaceHotel } = candidateId ? await sb.from("partner_hotels").select("id,is_active,source_channel").eq("hyperguest_property_id", String(candidateId)).maybeSingle() : { data: null };
  const marketplaceBooking = marketplaceHotel?.source_channel === "hyperguest";
  if (marketplaceBooking && !marketplaceHotel.is_active) return json({ error: "This hotel is not available for booking" }, 409);

  if (action === "prebook") {
    const parsed = z.object({ search: z.object({ propertyId: z.number().int().positive(), dates: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), nationality: z.string().regex(/^[A-Z]{2}$/), pax: z.array(z.object({ adults: z.number().int().min(1).max(10), children: z.array(z.number().int().min(0).max(17)) })).min(1).max(5) }), rooms: z.array(z.object({ roomCode: z.string().min(1), rateCode: z.string().min(1), expectedPrice: z.object({ amount: z.number().positive(), currency: z.string().regex(/^[A-Z]{3}$/) }) })).min(1).max(5) }).safeParse(body);
    if (!parsed.success) return json({ error: "Check room selection, dates and guests" }, 400);
    if (body.search.dates.from >= body.search.dates.to || body.search.pax.length !== body.rooms.length) return json({ error: "Every selected room needs matching guests and valid dates" }, 400);
    const displayCurrency = String(body.currency ?? "INR").toUpperCase();
    if (!/^[A-Z]{3}$/.test(displayCurrency)) return json({ error: "Invalid display currency" }, 400);
    const nights = Math.round((Date.parse(body.search.dates.to) - Date.parse(body.search.dates.from)) / 86400000);
    if (nights < 1 || nights > 30) return json({ error: "Stays must be between 1 and 30 nights" }, 400);
    const qs = new URLSearchParams({ checkIn: body.search.dates.from, nights: String(nights), guests: supplierGuests(body.search.pax), hotelIds: String(body.search.propertyId), customerNationality: body.search.nationality, currency: displayCurrency });
    const latest = await hg("search", `${SEARCH}?${qs}`);
    if (!latest.ok) return json({ error: friendly(latest.data) }, 409);
    const property = latest.data?.results?.find((p: any) => Number(p.propertyId) === body.search.propertyId);
    const used = new Map<string, number>();
    const selected: any[] = [];
    for (let i = 0; i < body.rooms.length; i++) {
      const choice = body.rooms[i];
      const room = property?.rooms?.find((r: any) => r.roomTypeCode === choice.roomCode && paxSignature(r.searchedPax) === paxSignature(body.search.pax[i]));
      const rate = room?.ratePlans?.find((r: any) => r.ratePlanCode === choice.rateCode && publicRate(r));
      const retail = rate && customerPrice(rate, displayCurrency);
      if (!rate || !retail) return json({ error: "The selected public rate is no longer available" }, 409);
      const id = String(room.roomId); used.set(id, (used.get(id) ?? 0) + 1);
      if ((used.get(id) ?? 0) > Number(room.numberOfAvailableRooms)) return json({ error: "Not enough rooms remain for this selection" }, 409);
      selected.push({ roomCode: choice.roomCode, rateCode: choice.rateCode, roomId: room.roomId, ratePlanId: rate.ratePlanId, expectedPrice: { amount: rate.payment.chargeAmount.price, currency: rate.payment.chargeAmount.currency }, retail, disclosures: supplierDisclosures(rate) });
    }
    const r = await hg("quote", `${BOOK}booking/pre-book`, { search: body.search, rooms: selected.map(({ roomCode, rateCode, expectedPrice }) => ({ roomCode, rateCode, expectedPrice })) });
    if (!r.ok) return json({ error: friendly(r.data) }, 409);
    const c = bookingContent(r.data);
    if (c?.rooms?.length !== selected.length) return json({ error: "Supplier could not quote every requested room" }, 409);
    if (c.rooms.some((r: any) => r.priceChange)) return json({ error: "The price changed. Update availability and select the current rate." }, 409);
    const snapshot = { search: body.search, rooms: selected, customerCurrency: displayCurrency, customerTotal: selected.reduce((sum, r) => sum + r.retail.amount, 0) };
    const { data: quote, error } = await sb.from("hyperguest_quotes").insert({ user_id: user.id, property_id: body.search.propertyId, snapshot }).select("id,expires_at").single();
    if (error || !quote) return json({ error: "Could not save verified room quote" }, 503);
    return json({ ...c, quoteId: quote.id, expiresAt: quote.expires_at, customerTotal: snapshot.customerTotal, customerCurrency: displayCurrency, customerRooms: selected });
  }

  if (action === "book") {
    const ref = String(body.agencyReference ?? "").slice(0, 60);
    const p = body.payload;
    if (!/^JX-[A-Za-z0-9-]{6,}$/.test(ref) || !p?.rooms?.length) return json({ error: "Invalid booking request" }, 400);
    const parsed = z.object({ propertyId: z.number().int().positive(), dates: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), leadGuest: z.object({ name: z.object({ first: z.string().trim().min(1).max(100), last: z.string().trim().min(1).max(100) }), contact: z.object({ email: z.string().email() }).passthrough() }).passthrough(), rooms: z.array(z.object({ roomCode: z.string().min(1), rateCode: z.string().min(1), expectedPrice: z.object({ amount: z.number().positive(), currency: z.string().regex(/^[A-Z]{3}$/) }), guests: z.array(z.object({ name: z.object({ first: z.string().min(1), last: z.string().min(1) }) }).passthrough()).min(1).max(16) }).passthrough()).min(1).max(5) }).safeParse(p);
    if (!parsed.success || p.dates.from >= p.dates.to || p.dates.from < new Date().toISOString().slice(0, 10)) return json({ error: "Check booking dates, guest details and selected room prices" }, 400);
    if (certificationRulesApply(live, marketplaceBooking)) {
      // HyperGuest Stage 3 live booking rules, enforced server-side.
      const n = p.leadGuest?.name ?? {};
      if (String(n.first).trim() !== "Test" || String(n.last).trim() !== "Test") return json({ error: "Live test bookings must use the guest name Test Test." }, 400);
      if (String(p.dates?.from) < addMonths(new Date(), 6)) return json({ error: "Live test check-in must be at least 6 months from today." }, 400);
      let sum = 0;
      for (const r of p.rooms) {
        sum += toUsd(Number(r.expectedPrice?.amount ?? NaN), r.expectedPrice?.currency);
        for (const g of r.guests ?? []) { g.name = { first: "Test", last: "Test" }; }
      }
      if (!(sum > 0 && sum <= USD_LIMIT)) return json({ error: `Live test booking total must be USD ${USD_LIMIT} or less (this one is about USD ${sum.toFixed(2)}).` }, 400);
      if (body.refundable !== true) return json({ error: "Live test bookings must use a fully refundable rate." }, 400);
    }

    // Idempotency: same reference never books twice.
    const { data: existing } = await sb.from("hyperguest_bookings").select("*").eq("agency_reference", ref).maybeSingle();
    if (existing) {
      if (existing.user_id !== user.id) return json({ error: "Invalid booking reference" }, 403);
      if (existing.status === "pending") {
        const found = await reconcile(ref);
        if (found) { await saveBooking(ref, found); }
      }
      const { data: fresh } = await sb.from("hyperguest_bookings").select("*").eq("agency_reference", ref).single();
      return json({ booking: fresh, duplicate: true });
    }

    let verified: any = null;
    if (marketplaceBooking) {
      const { data: quote } = await sb.from("hyperguest_quotes").select("*").eq("id", String(body.quoteId ?? "")).eq("user_id", user.id).maybeSingle();
      if (!quote || Date.parse(quote.expires_at) < Date.now() || Number(quote.property_id) !== Number(p.propertyId)) return json({ error: "Your room quote expired. Select the rooms again." }, 409);
      verified = quote.snapshot;
      if (p.dates.from !== verified.search.dates.from || p.dates.to !== verified.search.dates.to || p.rooms.length !== verified.rooms.length || body.nationality !== verified.search.nationality) return json({ error: "Dates or guests changed. Request a fresh quote." }, 409);
      for (let i = 0; i < p.rooms.length; i++) {
        const selected = verified.rooms[i];
        if (p.rooms[i].roomCode !== selected.roomCode || p.rooms[i].rateCode !== selected.rateCode || p.rooms[i].guests.length !== verified.search.pax[i].adults + verified.search.pax[i].children.length) return json({ error: "Room guests do not match the verified quote" }, 400);
        if (selected.disclosures.payment.charge !== "customer") return json({ error: "This rate requires JaagaX supplier settlement, which is not enabled. Select a pay-at-hotel rate.", code: "SUPPLIER_SETTLEMENT_REQUIRED" }, 409);
        p.rooms[i].expectedPrice = selected.expectedPrice;
      }
    }
    let liveCard: any = null;
    if (live) {
      const c = body.card ?? {};
      const num = String(c.number ?? "").replace(/\D/g, "");
      const [mm, yy] = String(c.expiry ?? "").split("/");
      if (num.length < 13 || !/^\d{3,4}$/.test(String(c.cvv ?? "")) || !/^\d{2}$/.test(mm ?? "") || !/^\d{2}$/.test(yy ?? "")) return json({ error: "Live bookings need a valid payment card." }, 400);
      const parts = String(c.name ?? "").trim().split(/\s+/);
      liveCard = { type: "credit_card", details: { number: num, cvv: String(c.cvv), expiry: { month: mm, year: `20${yy}` }, name: { first: parts[0] || "Test", last: parts.slice(1).join(" ") || parts[0] || "Test" }, charge: false } };
    }
    const { error: insertError } = await sb.from("hyperguest_bookings").insert({
      user_id: user.id, agency_reference: ref, property_id: Number(p.propertyId),
      check_in: p.dates?.from, check_out: p.dates?.to, nationality: body.nationality ?? null,
      currency: body.currency ?? null, test_label: marketplaceBooking ? null : body.testLabel ?? null,
      rooms: body.roomsSummary ?? [], special_requests: body.specialRequests ?? null,
      environment: live ? "live" : "test",
      quote_id: marketplaceBooking ? body.quoteId : null, customer_total: verified?.customerTotal ?? null, customer_currency: verified?.customerCurrency ?? null, customer_disclosures: verified ? { rooms: verified.rooms.map((r: any) => r.disclosures) } : null,
    });
    if (insertError) return json({ error: "Booking reference is already in use. Refresh your bookings before trying again." }, 409);
    const payload = live ? { ...p, reference: { agency: ref }, paymentDetails: liveCard } : {
      ...p, reference: { agency: ref },
      // Development token only: HyperGuest's test card. Live will use the contracted payment model.
      paymentDetails: { type: "credit_card", details: { number: "4111111111111111", cvv: "123", expiry: { month: "12", year: "2030" }, name: { first: p.leadGuest?.name?.first ?? "Guest", last: p.leadGuest?.name?.last ?? "Guest" } } },
      isTest: true,
    };
    const r = await hg("booking_create", `${BOOK}booking/create`, payload, BOOK_WAIT_MS, ref);
    let b = r.ok ? bookingContent(r.data) : null;
    if (!b && (r.error === "timeout" || r.status >= 500 || r.status === 0)) b = await reconcile(ref);
    if (!b) {
      if (r.error === "timeout" || r.status === 0 || r.status >= 500) return json({ pending: true, agencyReference: ref, message: "HyperGuest is still confirming. We'll check the status — don't book again." }, 202);
      await sb.from("hyperguest_bookings").update({ status: "failed", raw: r.data }).eq("agency_reference", ref);
      return json({ error: friendly(r.data) }, 409);
    }
    await saveBooking(ref, b);
    const { data: saved } = await sb.from("hyperguest_bookings").select("*").eq("agency_reference", ref).single();
    return json({ booking: saved });
  }

  if (action === "refresh" || action === "cancel") {
    const { data: bk } = await sb.from("hyperguest_bookings").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    const { data: isAdmin } = await sb.rpc("is_admin", { _user_id: user.id }).then((x) => x, () => ({ data: false }));
    if (!bk || (bk.user_id !== user.id && !isAdmin)) return json({ error: "Booking not found" }, 404);

    if (action === "refresh" || !bk.hg_booking_id) {
      const found = await reconcile(bk.agency_reference);
      if (found) await saveBooking(bk.agency_reference, found);
      if (action === "refresh" || !found) {
        const { data } = await sb.from("hyperguest_bookings").select("*").eq("id", bk.id).single();
        return json({ booking: data });
      }
    }

    const { data: cur } = await sb.from("hyperguest_bookings").select("*").eq("id", bk.id).single();
    if (!cur?.hg_booking_id) return json({ error: "Reservation confirmation is still pending. Refresh before cancelling." }, 409);
    const request = { bookingId: cur.hg_booking_id, reason: String(body.reason ?? "Guest request").slice(0, 256) };
    const preview = await hg("booking_cancel", `${BOOK}booking/cancel`, { ...request, simulation: true }, 60000, cur.agency_reference);
    if (!preview.ok) return json({ error: "Could not retrieve the supplier cancellation charge. No cancellation was made." }, 409);
    const simulated = bookingContent(preview.data);
    if (simulated?.cancelSimulation !== true && preview.data?.cancelSimulation !== true) return json({ error: "Supplier did not verify a cancellation preview. Refresh the reservation." }, 409);
    const items = simulated?.items ?? simulated?.rooms ?? [];
    const charges = items.map((item: any) => ({ amount: Number(item.prices?.net?.price ?? item.price?.amount ?? item.prices?.sell?.price ?? 0), currency: item.prices?.net?.currency ?? item.price?.currency ?? item.prices?.sell?.currency ?? cur.total_currency }));
    if (!charges.length) return json({ error: "Supplier cancellation amount is unavailable. No cancellation was made." }, 409);
    if (new Set(charges.map((c: any) => c.currency)).size !== 1) return json({ error: "Cancellation charges use multiple currencies; administrator review is required." }, 409);
    const charge = charges.reduce((sum: number, c: any) => sum + c.amount, 0), currency = charges[0].currency;
    if (!body.confirm) return json({ preview: true, charge, currency });
    if (Number(body.acceptedCharge) !== charge || body.acceptedCurrency !== currency) return json({ error: "The cancellation charge changed. Review it again before cancelling." }, 409);
    const r = await hg("booking_cancel", `${BOOK}booking/cancel`, { ...request, simulation: false }, 120000, cur.agency_reference);
    if (!r.ok) return json({ error: "Cancellation is not yet verified. Refresh this booking before retrying." }, 409);
    const cancelled = bookingContent(r.data);
    await saveBooking(cur.agency_reference, cancelled);
    const { data } = await sb.from("hyperguest_bookings").select("*").eq("id", bk.id).single();
    return json({ booking: data, charge, currency, cancelled: bookingStatus(cancelled) === "cancelled" });
  }

  return json({ error: "Unknown action" }, 400);
}
