// HyperGuest certification-grade connector: static content, search, pre-book,
// booking (300s-aware with Booking List fallback), retrieve and cancel.
// Every external call is logged to channel_api_payloads for certification logs.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { logChannelPayload, type ChannelOperation } from "../_shared/channel/audit.ts";

const KEY = Deno.env.get("HYPERGUEST_API_KEY") ?? "";
const SEARCH = (Deno.env.get("HYPERGUEST_SEARCH_URL") ?? "https://search-api.hyperguest.io/2.0/").replace(/\/?$/, "/");
const BOOK = (Deno.env.get("HYPERGUEST_BOOK_URL") ?? "https://book-api.hyperguest.com/2.0/").replace(/\/?$/, "/");
const STATIC = (Deno.env.get("HYPERGUEST_STATIC_URL") ?? "https://hg-static.hyperguest.com").replace(/\/$/, "");
// Edge runtime wall clock is below HyperGuest's 300s; we wait as long as we safely
// can, then reconcile through the Booking List API.
const BOOK_WAIT_MS = 140_000;

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
        Authorization: `Bearer ${KEY}`, "Accept-Encoding": "gzip, deflate",
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
    request_payload: body ?? null, response_payload: payload, http_status: status,
    request_id: bookingRef ?? null, error_message: err,
  });
  return { ok: !err, status, data: payload, error: err };
}

type RoomPax = { adults: number; childAges?: number[] };
const guestsParam = (rooms: RoomPax[]) =>
  rooms.map((r) => [Math.max(1, r.adults | 0), ...(r.childAges ?? []).map((a) => Math.max(0, a | 0))].join("-")).join(".");

function friendly(err: any) {
  const code = err?.errorCode ?? "";
  const msg = JSON.stringify(err ?? "").toLowerCase();
  if (msg.includes("price")) return "The price for this room has changed. Please review the new price.";
  if (msg.includes("availab") || msg.includes("sold")) return "This room is no longer available for your dates. Please choose another.";
  if (code === "BN.400") return "Some booking details are invalid. Please check guests and dates.";
  return "HyperGuest could not complete this request. Please try again.";
}

async function reconcile(ref: string) {
  const r = await hg("booking_retrieve", `${BOOK}booking/list`, { agencyReference: ref }, 60_000, ref);
  return r.ok ? (r.data?.content?.bookings ?? [])[0] ?? null : null;
}

async function saveBooking(ref: string, b: any) {
  const total = b?.payment?.chargeAmount;
  await sb.from("hyperguest_bookings").update({
    hg_booking_id: b?.bookingId ?? null,
    status: String(b?.status ?? "unknown").toLowerCase(),
    total_amount: total?.price ?? null, total_currency: total?.currency ?? null,
    cancellation: (b?.rooms ?? []).map((r: any) => r?.cancellationPolicy ?? []),
    raw: b, updated_at: new Date().toISOString(),
    ...(String(b?.status).toLowerCase() === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
  }).eq("agency_reference", ref);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!KEY) return json({ error: "HyperGuest is not configured" }, 503);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body?.action ?? "");

  // ---- public actions -----------------------------------------------------
  if (action === "static") {
    const id = Number(body.propertyId);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "propertyId required" }, 400);
    const r = await hg("detail", `${STATIC}/${id}/property-static.json`);
    return r.ok ? json(r.data) : json({ error: "Could not load hotel details" }, 502);
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
    return r.ok ? json(r.data) : json({ error: friendly(r.data) }, 502);
  }

  // ---- signed-in actions ----------------------------------------------------
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u } = await sb.auth.getUser(token);
  const user = u?.user;
  if (!user) return json({ error: "Please sign in to continue" }, 401);

  if (action === "prebook") {
    const r = await hg("quote", `${BOOK}booking/pre-book`, { search: body.search, rooms: body.rooms });
    if (!r.ok) return json({ error: friendly(r.data), details: r.data }, 409);
    const c = r.data?.content ?? {};
    if (!c.rooms?.length) return json({ error: "This room is no longer available for your dates. Please choose another." }, 409);
    return json(c);
  }

  if (action === "book") {
    const ref = String(body.agencyReference ?? "").slice(0, 60);
    const p = body.payload;
    if (!/^JX-[A-Za-z0-9-]{6,}$/.test(ref) || !p?.rooms?.length) return json({ error: "Invalid booking request" }, 400);

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

    await sb.from("hyperguest_bookings").insert({
      user_id: user.id, agency_reference: ref, property_id: Number(p.propertyId),
      check_in: p.dates?.from, check_out: p.dates?.to, nationality: body.nationality ?? null,
      currency: body.currency ?? null, test_label: body.testLabel ?? null,
      rooms: body.roomsSummary ?? [], special_requests: body.specialRequests ?? null,
    });

    const payload = {
      ...p, reference: { agency: ref },
      // Development token only: HyperGuest's test card. Live will use the contracted payment model.
      paymentDetails: { type: "credit_card", details: { number: "4111111111111111", cvv: "123", expiry: { month: "12", year: "2030" }, name: { first: p.leadGuest?.name?.first ?? "Guest", last: p.leadGuest?.name?.last ?? "Guest" } } },
      isTest: true,
    };
    const r = await hg("booking_create", `${BOOK}booking/create`, payload, BOOK_WAIT_MS, ref);
    let b = r.ok ? r.data?.content : null;
    if (!b && (r.error === "timeout" || r.status >= 500 || r.status === 0)) b = await reconcile(ref);
    if (!b) {
      if (r.error === "timeout") return json({ pending: true, agencyReference: ref, message: "HyperGuest is still confirming. We'll check the status — don't book again." }, 202);
      await sb.from("hyperguest_bookings").update({ status: "failed", raw: r.data }).eq("agency_reference", ref);
      return json({ error: friendly(r.data), details: r.data }, 409);
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

    // Work out the current cancellation charge from HyperGuest's own policy windows.
    const { data: cur } = await sb.from("hyperguest_bookings").select("*").eq("id", bk.id).single();
    // Policy windows are in the hotel's local time; convert with its UTC offset.
    const st = await hg("detail", `${STATIC}/${cur.property_id}/property-static.json`);
    const offMin = Number(st.data?.settings?.utcOffset ?? 0);
    const now = Date.now() + offMin * 60_000;
    let charge = 0, roomTotal = 0, currency = cur.total_currency;
    for (const room of cur.raw?.rooms ?? []) {
      roomTotal += Number(room?.prices?.net?.price ?? room?.payment?.chargeAmount?.price ?? 0);
      for (const w of room?.cancellationPolicy ?? []) {
        const s = Date.parse(String(w.startDate).replace(" ", "T") + "Z");
        const e = Date.parse(String(w.endDate).replace(" ", "T") + "Z");
        if (now >= s && now < e) { charge += Number(w.price?.amount ?? 0); currency = w.price?.currency ?? currency; }
      }
    }
    const total = Number(cur.total_amount ?? roomTotal);
    if (total > 0 && charge >= total - 0.01) {
      await logChannelPayload(sb, { channel: "hyperguest", operation: "booking_cancel", request_id: cur.agency_reference,
        request_payload: { bookingId: cur.hg_booking_id }, response_payload: { blocked: "non_refundable", charge, total }, error_message: "non-refundable" });
      return json({ error: "This booking is non-refundable. Cancelling now would charge the full amount, so it can't be cancelled online.", nonRefundable: true, charge, currency }, 409);
    }
    if (!body.confirm) return json({ preview: true, charge, currency });
    const r = await hg("booking_cancel", `${BOOK}booking/cancel`, { bookingId: cur.hg_booking_id, reason: String(body.reason ?? "Guest request").slice(0, 200) }, 120_000, cur.agency_reference);
    if (!r.ok) return json({ error: "HyperGuest could not cancel this booking. Please try again.", details: r.data }, 409);
    await saveBooking(cur.agency_reference, r.data?.content);
    const { data } = await sb.from("hyperguest_bookings").select("*").eq("id", bk.id).single();
    return json({ booking: data, charge, currency });
  }

  return json({ error: "Unknown action" }, 400);
});
