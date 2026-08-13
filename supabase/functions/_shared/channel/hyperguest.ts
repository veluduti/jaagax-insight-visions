// HyperGuest channel adapter.
//
// The adapter is the ONLY place that speaks HyperGuest. Credentials live in
// Supabase secrets and never reach the browser. Every call is audited into
// `channel_api_payloads` with the complete request and response payload.
//
// Endpoint paths are configurable because the exact routes depend on the
// contracted HyperGuest environment — no undocumented endpoint is invented:
//   HYPERGUEST_BASE_URL         e.g. https://api.hyperguest.com
//   HYPERGUEST_API_KEY          bearer / api key issued by HyperGuest
//   HYPERGUEST_SEARCH_PATH      default /search
//   HYPERGUEST_BOOKING_PATH     default /booking
//   HYPERGUEST_CANCEL_PATH      default /booking/{bookingId}/cancel
import { logChannelPayload, normalizeChannelError, type ChannelOperation } from "./audit.ts";
import type {
  CanonicalProperty, CanonicalRoom, CanonicalRatePlan, CanonicalPrice,
  CanonicalTaxFee, CanonicalCancellationPolicy, CanonicalNightlyRate,
  BookingCreateRequest,
} from "../canonical.ts";

export const HG = "hyperguest";

export function hyperguestConfigured(): boolean {
  return Boolean(Deno.env.get("HYPERGUEST_BASE_URL") && Deno.env.get("HYPERGUEST_API_KEY"));
}

interface HgCallOptions {
  operation: ChannelOperation;
  path: string;
  method?: string;
  body?: unknown;
  hotel_id?: string | null;
  booking_id?: string | null;
}

export interface HgResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: ReturnType<typeof normalizeChannelError>;
  requestId?: string | null;
}

export async function hgCall<T = any>(supabase: any, opts: HgCallOptions): Promise<HgResult<T>> {
  const base = Deno.env.get("HYPERGUEST_BASE_URL");
  const key = Deno.env.get("HYPERGUEST_API_KEY");
  if (!base || !key) {
    const err = normalizeChannelError(HG, 503, { message: "HyperGuest is not configured" });
    return { ok: false, status: 503, data: null, error: err };
  }
  const endpoint = `${base.replace(/\/$/, "")}${opts.path}`;
  let status = 0;
  let payload: unknown = null;
  let requestId: string | null = null;
  try {
    const res = await fetch(endpoint, {
      method: opts.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
        "x-api-key": key,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    status = res.status;
    requestId = res.headers.get("x-request-id") || res.headers.get("request-id");
    const text = await res.text();
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }

    await logChannelPayload(supabase, {
      hotel_id: opts.hotel_id, booking_id: opts.booking_id, channel: HG,
      operation: opts.operation, endpoint, request_payload: opts.body ?? null,
      response_payload: payload, http_status: status, request_id: requestId,
      error_message: res.ok ? null : "external error",
    });

    if (!res.ok) {
      return { ok: false, status, data: null, requestId, error: normalizeChannelError(HG, status, payload, requestId) };
    }
    return { ok: true, status, data: payload as T, requestId };
  } catch (e) {
    await logChannelPayload(supabase, {
      hotel_id: opts.hotel_id, booking_id: opts.booking_id, channel: HG,
      operation: opts.operation, endpoint, request_payload: opts.body ?? null,
      response_payload: null, http_status: status || 0, error_message: String(e),
    });
    return { ok: false, status: status || 0, data: null, error: normalizeChannelError(HG, status || 0, { message: String(e) }) };
  }
}

/* =========================================================================
 * SEARCH: HyperGuest -> JAAGA canonical
 * No field is dropped: anything not modelled is preserved under `raw`.
 * ====================================================================== */

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

function mapPrice(node: any, type: CanonicalPrice["priceType"]): CanonicalPrice | null {
  if (!node) return null;
  return {
    priceType: type,
    price: Number(node.price ?? node.amount ?? 0),
    currency: node.currency ?? null,
    searchCurrency: node.searchCurrency ?? null,
    raw: node,
  };
}

function mapPrices(prices: any): CanonicalPrice[] {
  if (!prices) return [];
  const out: CanonicalPrice[] = [];
  for (const t of ["net", "sell", "commission", "bar"] as const) {
    const p = mapPrice(prices[t], t);
    if (p) out.push(p);
  }
  return out;
}

function mapTaxFee(node: any): CanonicalTaxFee {
  return {
    code: node?.code ?? null,
    name: node?.name ?? null,
    description: node?.description ?? null,
    amount: Number(node?.amount?.price ?? node?.amount ?? 0),
    currency: node?.amount?.currency ?? node?.currency ?? null,
    searchCurrency: node?.amount?.searchCurrency ?? node?.searchCurrency ?? null,
    relation: node?.relation ?? null,
    scope: node?.scope ?? null,
    frequency: node?.frequency ?? null,
    calculationType: node?.calculation?.type ?? node?.calculationType ?? null,
    calculationValue: num(node?.calculation?.value ?? node?.calculationValue),
    raw: node,
  };
}

function mapCancellationPolicy(node: any): CanonicalCancellationPolicy {
  return {
    daysBefore: num(node?.daysBefore),
    penaltyType: node?.penaltyType ?? node?.type ?? null,
    amount: num(node?.amount?.price ?? node?.amount),
    currency: node?.amount?.currency ?? node?.currency ?? null,
    timeFromCheckIn: num(node?.timeFromCheckIn),
    timeFromCheckInType: node?.timeFromCheckInType ?? null,
    cancellationDeadlineHour: node?.cancellationDeadlineHour ?? null,
    raw: node,
  };
}

function mapNightly(node: any): CanonicalNightlyRate {
  const p = node?.prices ?? node;
  return {
    date: node?.date ?? node?.day ?? null,
    net: mapPrice(p?.net, "net"),
    sell: mapPrice(p?.sell, "sell"),
    commission: mapPrice(p?.commission, "commission"),
    bar: mapPrice(p?.bar, "bar"),
    taxes: (node?.taxes ?? []).map(mapTaxFee),
    fees: (node?.fees ?? []).map(mapTaxFee),
    raw: node,
  };
}

export function mapHgRatePlan(rp: any): CanonicalRatePlan {
  const info = rp?.ratePlanInfo ?? {};
  return {
    ratePlanId: rp?.ratePlanId ?? null,
    ratePlanCode: rp?.ratePlanCode ?? null,
    ratePlanName: rp?.ratePlanName ?? null,
    board: rp?.board ?? null,
    isImmediate: rp?.isImmediate ?? null,
    ratePlanInfo: {
      virtual: info?.virtual ?? null,
      originalRatePlanCode: info?.originalRatePlanCode ?? null,
      isPromotion: info?.isPromotion ?? null,
      isPackageRate: info?.isPackageRate ?? null,
      isPrivate: info?.isPrivate ?? null,
      contractId: info?.contractId ?? null,
      contracts: (info?.contracts ?? []).map((c: any) => ({
        contractId: c?.contractId ?? c?.id ?? null,
        type: c?.type ?? null,
        terms: (c?.terms ?? []).map((t: any) => ({
          termId: t?.termId ?? t?.id ?? null,
          name: t?.name ?? null,
          isPromotion: t?.isPromotion ?? null,
          type: t?.type ?? null,
          termIds: t?.termIds ?? null,
          raw: t,
        })),
        raw: c,
      })),
      terms: (info?.terms ?? []).map((t: any) => ({
        termId: t?.termId ?? t?.id ?? null,
        name: t?.name ?? null,
        isPromotion: t?.isPromotion ?? null,
        type: t?.type ?? null,
        termIds: t?.termIds ?? null,
        raw: t,
      })),
      raw: info,
    },
    payment: rp?.payment
      ? {
        charge: rp.payment.charge ?? null,
        chargeType: rp.payment.chargeType ?? null,
        chargeAmount: rp.payment.chargeAmount ?? null,
        raw: rp.payment,
      }
      : null,
    prices: mapPrices(rp?.prices),
    taxes: (rp?.taxes ?? []).map(mapTaxFee),
    fees: (rp?.fees ?? []).map(mapTaxFee),
    remarks: (rp?.remarks ?? []).map((r: any) => (typeof r === "string" ? r : r?.remark ?? String(r))),
    cancellationPolicies: (rp?.cancellationPolicies ?? []).map(mapCancellationPolicy),
    nightlyBreakdown: (rp?.nightlyBreakdown ?? []).map(mapNightly),
    source: HG,
    raw: rp,
  };
}

export function mapHgRoom(room: any): CanonicalRoom {
  const s = room?.settings ?? {};
  return {
    roomId: room?.roomId ?? null,
    roomTypeCode: room?.roomTypeCode ?? null,
    roomName: room?.roomName ?? null,
    numberOfAvailableRooms: num(room?.numberOfAvailableRooms),
    searchedPax: room?.searchedPax
      ? {
        adults: num(room.searchedPax.adults) ?? 0,
        children: num(room.searchedPax.children) ?? 0,
        infants: num(room.searchedPax.infants) ?? 0,
        childAges: room.searchedPax.childAges ?? room.searchedPax.childrenAges ?? [],
        raw: room.searchedPax,
      }
      : null,
    settings: {
      numberOfBedrooms: num(s.numberOfBedrooms),
      roomSize: num(s.roomSize),
      maxAdultsNumber: num(s.maxAdultsNumber),
      maxChildrenNumber: num(s.maxChildrenNumber),
      maxInfantsNumber: num(s.maxInfantsNumber),
      maxOccupancy: num(s.maxOccupancy),
      numberOfBeds: num(s.numberOfBeds),
      beddingConfigurations: (s.beddingConfigurations ?? []).map((b: any) => ({
        type: b?.type ?? null, size: b?.size ?? null, quantity: num(b?.quantity) ?? 1, raw: b,
      })),
      raw: s,
    },
    ratePlans: (room?.ratePlans ?? []).map(mapHgRatePlan),
    source: HG,
    raw: room,
  };
}

export function mapHgProperty(p: any): CanonicalProperty {
  const i = p?.propertyInfo ?? {};
  return {
    jaagaHotelId: null,
    propertyId: p?.propertyId ?? null,
    source: HG,
    propertyInfo: {
      name: i.name ?? null,
      starRating: num(i.starRating),
      cityName: i.cityName ?? null,
      cityId: i.cityId ?? null,
      countryCode: i.countryCode ?? null,
      regionName: i.regionName ?? null,
      longitude: num(i.longitude),
      latitude: num(i.latitude),
      propertyType: i.propertyType ?? null,
      propertyTypeName: i.propertyTypeName ?? null,
      raw: i,
    },
    remarks: (p?.remarks ?? []).map((r: any) => (typeof r === "string" ? r : r?.remark ?? String(r))),
    rooms: (p?.rooms ?? []).map(mapHgRoom),
    jaaga: null,
    raw: p,
  };
}

export function mapHgSearchResponse(payload: any): CanonicalProperty[] {
  const list = payload?.results ?? payload?.properties ?? payload?.data ?? [];
  return (Array.isArray(list) ? list : []).map(mapHgProperty);
}

/* =========================================================================
 * BOOKING CREATE: JAAGA canonical -> HyperGuest request
 * ====================================================================== */

export function buildHgBookingCreatePayload(req: BookingCreateRequest, propertyId: string) {
  const guestNode = (g: any) => ({
    birthDate: g?.birthDate ?? null,
    title: g?.title ?? null,
    name: { first: g?.firstName ?? null, last: g?.lastName ?? null },
    contact: {
      address: g?.address ?? null,
      city: g?.city ?? null,
      country: g?.country ?? null,
      email: g?.email ?? null,
      phone: g?.phone ?? null,
      state: g?.state ?? null,
      zip: g?.zip ?? null,
    },
  });

  return {
    dates: { from: req.check_in, to: req.check_out },
    propertyId,
    leadGuest: guestNode(req.lead_guest),
    reference: { agency: req.agency_reference ?? req.idempotency_key ?? null },
    paymentDetails: req.payment_details ?? { type: "prepaid", details: null },
    rooms: (req.rooms ?? []).map((r) => ({
      roomCode: r.room_code ?? null,
      rateCode: r.rate_code ?? null,
      expectedPrice: { amount: r.expected_price ?? 0, currency: r.expected_currency ?? "INR" },
      guests: (r.guests ?? []).map(guestNode),
      specialRequests: r.special_requests ?? [],
    })),
    meta: (req.meta ?? []).map((m) => ({ key: m.key, value: m.value })),
  };
}

/** HyperGuest booking response -> the fields JAAGA persists canonically. */
export function mapHgBookingResponse(payload: any) {
  const b = payload?.booking ?? payload ?? {};
  return {
    externalBookingId: b.bookingId ?? b.id ?? b.reservationId ?? null,
    externalReference: b.reference?.agency ?? b.reference ?? null,
    status: b.status ?? null,
    rooms: (b.rooms ?? []).map((r: any) => ({
      externalItemId: r?.itemId ?? r?.id ?? null,
      externalRoomId: r?.roomId ?? r?.roomCode ?? null,
      externalRatePlanId: r?.rateCode ?? r?.ratePlanId ?? null,
      status: r?.status ?? null,
      price: num(r?.price?.amount ?? r?.price),
      currency: r?.price?.currency ?? null,
      raw: r,
    })),
    financialModel: b.financialModel ?? b.financials ?? null,
    transactions: b.transactions ?? [],
    raw: payload,
  };
}
