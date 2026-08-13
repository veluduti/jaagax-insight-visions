// JAAGA canonical hotel model.
//
// This is the single shape the JAAGA frontend consumes. It is a SUPERSET of the
// HyperGuest search/booking model:
//   • every HyperGuest field has a home here (plus `raw` for anything else)
//   • every JAAGA-only feature (meals, addons, extra beds, extra services, GST,
//     inventory) lives under the `jaaga` extension nodes.
// Direct JAAGA hotels and HyperGuest-connected hotels both produce this shape.

/* ----------------------------- primitives ----------------------------- */

export interface CanonicalPrice {
  priceType: "net" | "sell" | "commission" | "bar";
  price: number;
  currency: string | null;
  searchCurrency?: string | null;
  raw?: unknown;
}

export interface CanonicalTaxFee {
  code: string | null;
  name: string | null;
  description: string | null;
  amount: number;
  currency: string | null;
  searchCurrency?: string | null;
  relation: string | null;
  scope: string | null;
  frequency: string | null;
  calculationType: string | null;
  calculationValue: number | null;
  raw?: unknown;
}

export interface CanonicalCancellationPolicy {
  daysBefore: number | null;
  penaltyType: string | null;   // nights | percent | currency
  amount: number | null;
  currency: string | null;
  timeFromCheckIn: number | null;
  timeFromCheckInType: string | null;
  cancellationDeadlineHour: string | null;
  raw?: unknown;
}

export interface CanonicalNightlyRate {
  date: string | null;
  net: CanonicalPrice | null;
  sell: CanonicalPrice | null;
  commission: CanonicalPrice | null;
  bar: CanonicalPrice | null;
  taxes: CanonicalTaxFee[];
  fees: CanonicalTaxFee[];
  raw?: unknown;
}

export interface CanonicalTerm {
  termId: string | null;
  name: string | null;
  isPromotion: boolean | null;
  type: string | null;
  termIds: unknown;
  raw?: unknown;
}

export interface CanonicalContract {
  contractId: string | null;
  type: string | null;
  terms: CanonicalTerm[];
  raw?: unknown;
}

export interface CanonicalRatePlanInfo {
  virtual: boolean | null;
  originalRatePlanCode: string | null;
  isPromotion: boolean | null;
  isPackageRate: boolean | null;
  isPrivate: boolean | null;
  contractId: string | null;
  contracts: CanonicalContract[];
  terms: CanonicalTerm[];
  raw?: unknown;
}

export interface CanonicalRatePlan {
  /** JAAGA internal rate plan uuid (null for purely external plans). */
  jaagaRatePlanId?: string | null;
  ratePlanId: string | null;
  ratePlanCode: string | null;
  ratePlanName: string | null;
  board: string | null;
  isImmediate: boolean | null;
  ratePlanInfo: CanonicalRatePlanInfo;
  payment: { charge: string | null; chargeType: string | null; chargeAmount: unknown; raw?: unknown } | null;
  prices: CanonicalPrice[];
  taxes: CanonicalTaxFee[];
  fees: CanonicalTaxFee[];
  remarks: string[];
  cancellationPolicies: CanonicalCancellationPolicy[];
  nightlyBreakdown: CanonicalNightlyRate[];
  source: string;
  /** JAAGA-only extensions attached to the plan. */
  jaaga?: {
    gstRate?: number | null;
    basePrice?: number | null;
    isRefundable?: boolean | null;
  } | null;
  raw?: unknown;
}

export interface CanonicalBedding {
  type: string | null;
  size: string | null;
  quantity: number;
  raw?: unknown;
}

export interface CanonicalRoomSettings {
  numberOfBedrooms: number | null;
  roomSize: number | null;
  maxAdultsNumber: number | null;
  maxChildrenNumber: number | null;
  maxInfantsNumber: number | null;
  maxOccupancy: number | null;
  numberOfBeds: number | null;
  beddingConfigurations: CanonicalBedding[];
  raw?: unknown;
}

export interface CanonicalSearchedPax {
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
  raw?: unknown;
}

export interface CanonicalRoom {
  jaagaRoomId?: string | null;
  roomId: string | null;
  roomTypeCode: string | null;
  roomName: string | null;
  numberOfAvailableRooms: number | null;
  searchedPax: CanonicalSearchedPax | null;
  settings: CanonicalRoomSettings;
  ratePlans: CanonicalRatePlan[];
  source: string;
  /** JAAGA-only room extensions. */
  jaaga?: {
    basePrice?: number | null;
    photos?: string[];
    amenities?: unknown;
    description?: string | null;
    extraBedAllowed?: boolean | null;
    extraBedPrice?: number | null;
    maxExtraBeds?: number | null;
    childFreeAgeTo?: number | null;
    childAgeTo?: number | null;
    minNights?: number | null;
    totalUnits?: number | null;
    inventory?: unknown[];
  } | null;
  raw?: unknown;
}

export interface CanonicalPropertyInfo {
  name: string | null;
  starRating: number | null;
  cityName: string | null;
  cityId: string | null;
  countryCode: string | null;
  regionName: string | null;
  longitude: number | null;
  latitude: number | null;
  propertyType: string | null;
  propertyTypeName: string | null;
  raw?: unknown;
}

export interface CanonicalProperty {
  /** JAAGA internal hotel uuid. */
  jaagaHotelId: string | null;
  /** External property id (HyperGuest propertyId) when channel-connected. */
  propertyId: string | null;
  source: string;
  propertyInfo: CanonicalPropertyInfo;
  remarks: string[];
  rooms: CanonicalRoom[];
  /** JAAGA-only property extensions. */
  jaaga?: {
    address?: string | null;
    locality?: string | null;
    images?: string[];
    amenities?: string[];
    description?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    gstRate?: number | null;
    meals?: unknown[];
    addons?: unknown[];
    extraServices?: unknown[];
    channel?: {
      channel: string;
      status: string | null;
      externalPropertyId: string | null;
      lastSyncAt: string | null;
      lastSyncStatus: string | null;
      lastSyncError: string | null;
    } | null;
  } | null;
  raw?: unknown;
}

/* --------------------------- booking create --------------------------- */

export interface CanonicalGuestInput {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  age?: number | null;
  guestType?: "adult" | "child" | "infant";
  address?: string | null;
  city?: string | null;
  country?: string | null;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface BookingRoomInput {
  room_id?: string | null;
  rate_plan_id?: string | null;
  room_code?: string | null;
  rate_code?: string | null;
  quantity?: number;
  adults?: number;
  children?: number;
  infants?: number;
  child_ages?: number[];
  extra_beds?: number;
  meals?: string[];
  addons?: { addon_id: string; quantity: number }[];
  expected_price?: number;
  expected_currency?: string;
  guests?: CanonicalGuestInput[];
  special_requests?: string[];
}

export interface BookingCreateRequest {
  hotel_id: string;
  check_in: string;
  check_out: string;
  lead_guest: CanonicalGuestInput;
  rooms: BookingRoomInput[];
  agency_reference?: string | null;
  idempotency_key?: string | null;
  promo_code?: string | null;
  source?: string;
  user_id?: string | null;
  special_requests?: string[];
  payment_details?: { type: string; details?: unknown } | null;
  meta?: { key: string; value: string }[];
}

/* ------------------------ JAAGA direct builders ------------------------ */

const n = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

export function priceNode(type: CanonicalPrice["priceType"], price: number, currency = "INR"): CanonicalPrice {
  return { priceType: type, price: Math.round(price * 100) / 100, currency, searchCurrency: currency };
}

/** Builds canonical cancellation policies for a JAAGA rate plan row. */
export function directCancellationPolicies(rows: any[], fallbackText?: string | null): CanonicalCancellationPolicy[] {
  if (rows?.length) {
    return rows.map((r) => ({
      daysBefore: n(r.days_before),
      penaltyType: r.penalty_type ?? null,
      amount: n(r.amount),
      currency: r.currency ?? "INR",
      timeFromCheckIn: n(r.time_from_check_in),
      timeFromCheckInType: r.time_from_check_in_type ?? null,
      cancellationDeadlineHour: r.cancellation_deadline_hour ?? null,
      raw: r,
    }));
  }
  // JAAGA default ladder (kept identical to hotel-booking-cancel behaviour).
  return [
    { daysBefore: 3, penaltyType: "percent", amount: 0, currency: "INR", timeFromCheckIn: 72, timeFromCheckInType: "hours", cancellationDeadlineHour: null, raw: { source: "jaaga_default", note: fallbackText ?? null } },
    { daysBefore: 1, penaltyType: "percent", amount: 50, currency: "INR", timeFromCheckIn: 24, timeFromCheckInType: "hours", cancellationDeadlineHour: null, raw: { source: "jaaga_default" } },
    { daysBefore: 0, penaltyType: "percent", amount: 100, currency: "INR", timeFromCheckIn: 0, timeFromCheckInType: "hours", cancellationDeadlineHour: null, raw: { source: "jaaga_default" } },
  ];
}

/** Percentage penalty applied for a cancellation at `now` against `checkIn`. */
export function penaltyPercentFromPolicies(
  policies: CanonicalCancellationPolicy[],
  checkIn: string,
  nights: number,
  total: number,
): { percent: number; amount: number; matched: CanonicalCancellationPolicy | null } {
  const hoursToCheckIn = (+new Date(checkIn) - Date.now()) / 36e5;
  // Most restrictive matching window wins (smallest window still ahead of us).
  const sorted = [...policies].sort((a, b) => (b.timeFromCheckIn ?? (b.daysBefore ?? 0) * 24) - (a.timeFromCheckIn ?? (a.daysBefore ?? 0) * 24));
  let matched: CanonicalCancellationPolicy | null = null;
  for (const p of sorted) {
    const window = p.timeFromCheckIn ?? (p.daysBefore != null ? p.daysBefore * 24 : 0);
    if (hoursToCheckIn <= window || window === 0) matched = p;
  }
  if (!matched) return { percent: 0, amount: 0, matched: null };
  const amt = Number(matched.amount ?? 0);
  if (matched.penaltyType === "percent") {
    return { percent: amt, amount: Math.round((total * amt) / 100), matched };
  }
  if (matched.penaltyType === "nights") {
    const perNight = nights > 0 ? total / nights : total;
    const penalty = Math.min(total, Math.round(perNight * amt));
    return { percent: total ? Math.round((penalty / total) * 100) : 0, amount: penalty, matched };
  }
  // currency
  const penalty = Math.min(total, Math.round(amt));
  return { percent: total ? Math.round((penalty / total) * 100) : 0, amount: penalty, matched };
}

export interface DirectSearchParams {
  hotel_id?: string | null;
  city?: string | null;
  locality?: string | null;
  query?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  child_ages?: number[];
  rooms?: number;
  board?: string | null;
  limit?: number;
}

/** Loads canonical rate plans for one JAAGA room (synthesizing a default plan). */
export async function loadDirectRatePlans(
  supabase: any, hotel: any, room: any, nights: number, dates: string[],
): Promise<CanonicalRatePlan[]> {
  const [{ data: plans }, { data: rateRows }] = await Promise.all([
    supabase.from("hotel_rate_plans").select("*").eq("hotel_id", hotel.id).eq("is_active", true),
    dates.length
      ? supabase.from("hotel_rate_calendar").select("*").eq("room_id", room.id)
        .gte("date", dates[0]).lte("date", dates[dates.length - 1])
      : Promise.resolve({ data: [] }),
  ]);

  const roomPlans = (plans || []).filter((p: any) => !p.room_id || p.room_id === room.id);
  const gstRate = hotel.gst_rate ?? null;

  const nightly = (multiplier: number, adjust: (p: number) => number): CanonicalNightlyRate[] =>
    dates.map((d) => {
      const cal = (rateRows || []).find((r: any) => r.date === d);
      const base = adjust(Number(cal?.price ?? room.base_price ?? 0)) * multiplier;
      return {
        date: d,
        net: priceNode("net", base),
        sell: priceNode("sell", base),
        commission: priceNode("commission", 0),
        bar: priceNode("bar", Number(room.base_price ?? 0)),
        taxes: gstRate ? [{
          code: "GST", name: `GST @ ${gstRate}%`, description: null,
          amount: Math.round((base * Number(gstRate)) / 100), currency: "INR", searchCurrency: "INR",
          relation: "exclusive", scope: "stay", frequency: "per_night",
          calculationType: "percent", calculationValue: Number(gstRate), raw: { source: "jaaga_gst" },
        }] : [],
        fees: [],
        raw: { source: "jaaga", calendar: cal ?? null },
      };
    });

  const makePlan = async (p: any | null): Promise<CanonicalRatePlan> => {
    const adjust = (base: number) => {
      if (!p || !p.adjustment_type || p.adjustment_value == null) return base;
      return p.adjustment_type === "percent"
        ? base + (base * Number(p.adjustment_value)) / 100
        : base + Number(p.adjustment_value);
    };
    const nb = nightly(1, adjust);
    const stayTotal = nb.reduce((s, x) => s + (x.sell?.price ?? 0), 0);

    let cancelRows: any[] = [];
    let taxRows: any[] = [];
    let feeRows: any[] = [];
    let remarkRows: any[] = [];
    let contractRows: any[] = [];
    let priceRows: any[] = [];
    let infoRow: any = null;
    if (p?.id) {
      const [c, t, f, r, ct, pr, inf] = await Promise.all([
        supabase.from("rate_plan_cancellation_policies").select("*").eq("rate_plan_id", p.id),
        supabase.from("rate_plan_taxes").select("*").eq("rate_plan_id", p.id),
        supabase.from("rate_plan_fees").select("*").eq("rate_plan_id", p.id),
        supabase.from("rate_plan_remarks").select("*").eq("rate_plan_id", p.id),
        supabase.from("rate_plan_contracts").select("*, rate_plan_terms(*)").eq("rate_plan_id", p.id),
        supabase.from("rate_plan_prices").select("*").eq("rate_plan_id", p.id),
        supabase.from("rate_plan_info").select("*").eq("rate_plan_id", p.id).maybeSingle(),
      ]);
      cancelRows = c.data || []; taxRows = t.data || []; feeRows = f.data || [];
      remarkRows = r.data || []; contractRows = ct.data || []; priceRows = pr.data || [];
      infoRow = inf.data || null;
    }

    const prices: CanonicalPrice[] = priceRows.length
      ? priceRows.map((x) => ({ priceType: x.price_type, price: Number(x.price), currency: x.currency, searchCurrency: x.search_currency, raw: x }))
      : [priceNode("net", stayTotal), priceNode("sell", stayTotal), priceNode("commission", 0),
         priceNode("bar", Number(room.base_price ?? 0) * Math.max(1, nights))];

    const taxes: CanonicalTaxFee[] = taxRows.length
      ? taxRows.map((x) => ({
        code: x.code, name: x.name, description: x.description, amount: Number(x.amount),
        currency: x.currency, searchCurrency: x.search_currency, relation: x.relation, scope: x.scope,
        frequency: x.frequency, calculationType: x.calculation_type, calculationValue: n(x.calculation_value), raw: x,
      }))
      : (gstRate ? [{
        code: "GST", name: `GST @ ${gstRate}%`, description: "Goods & Services Tax",
        amount: Math.round((stayTotal * Number(gstRate)) / 100), currency: "INR", searchCurrency: "INR",
        relation: "exclusive", scope: "stay", frequency: "per_stay",
        calculationType: "percent", calculationValue: Number(gstRate), raw: { source: "jaaga_gst" },
      }] : []);

    return {
      jaagaRatePlanId: p?.id ?? null,
      ratePlanId: p?.hyperguest_rate_plan_id ?? p?.id ?? `${room.id}:default`,
      ratePlanCode: p?.rate_plan_code ?? p?.hyperguest_rate_plan_code ?? (p ? `RP-${String(p.id).slice(0, 8)}` : "STD"),
      ratePlanName: p?.rate_plan_name ?? p?.name ?? "Standard Rate",
      board: p?.board ?? (room.breakfast_included ? "BB" : "RO"),
      isImmediate: p?.is_immediate ?? true,
      ratePlanInfo: {
        virtual: infoRow?.virtual ?? p?.virtual ?? false,
        originalRatePlanCode: infoRow?.original_rate_plan_code ?? p?.original_rate_plan_code ?? null,
        isPromotion: infoRow?.is_promotion ?? p?.is_promotion ?? false,
        isPackageRate: infoRow?.is_package_rate ?? p?.is_package_rate ?? false,
        isPrivate: infoRow?.is_private ?? p?.is_private ?? false,
        contractId: infoRow?.contract_id ?? p?.contract_id ?? null,
        contracts: contractRows.map((c: any) => ({
          contractId: c.contract_id, type: c.type,
          terms: (c.rate_plan_terms || []).map((t: any) => ({
            termId: t.term_id, name: t.name, isPromotion: t.is_promotion, type: t.type, termIds: t.term_ids, raw: t,
          })),
          raw: c,
        })),
        terms: [],
        raw: infoRow,
      },
      payment: p?.payment_snapshot ?? (p?.payment_charge
        ? { charge: p.payment_charge, chargeType: p.payment_charge_type, chargeAmount: null }
        : { charge: "prepaid", chargeType: "full", chargeAmount: { price: stayTotal, currency: "INR", searchCurrency: "INR" } }),
      prices,
      taxes,
      fees: feeRows.map((x) => ({
        code: x.code, name: x.name, description: x.description, amount: Number(x.amount),
        currency: x.currency, searchCurrency: x.search_currency, relation: x.relation, scope: x.scope,
        frequency: x.frequency, calculationType: x.calculation_type, calculationValue: n(x.calculation_value), raw: x,
      })),
      remarks: remarkRows.map((x) => x.remark),
      cancellationPolicies: directCancellationPolicies(cancelRows, room.cancellation_policy),
      nightlyBreakdown: nb,
      source: "jaaga",
      jaaga: { gstRate, basePrice: Number(room.base_price ?? 0), isRefundable: p?.is_refundable ?? true },
      raw: p,
    };
  };

  if (!roomPlans.length) return [await makePlan(null)];
  return await Promise.all(roomPlans.map((p: any) => makePlan(p)));
}

export function toCanonicalRoom(
  room: any, ratePlans: CanonicalRatePlan[], bedding: any[], pax: CanonicalSearchedPax | null,
  availableUnits: number | null, inventory: unknown[] = [],
): CanonicalRoom {
  return {
    jaagaRoomId: room.id,
    roomId: room.hyperguest_room_id ?? room.id,
    roomTypeCode: room.hyperguest_room_type_code ?? room.room_code ?? room.pms_room_code ?? null,
    roomName: room.room_name ?? room.room_type ?? null,
    numberOfAvailableRooms: availableUnits ?? room.number_of_available_rooms ?? room.total_units ?? null,
    searchedPax: pax,
    settings: {
      numberOfBedrooms: n(room.number_of_bedrooms),
      roomSize: n(room.room_size ?? room.size_sqft),
      maxAdultsNumber: n(room.max_adults ?? room.max_occupancy),
      maxChildrenNumber: n(room.max_children),
      maxInfantsNumber: n(room.max_infants),
      maxOccupancy: n(room.max_occupancy),
      numberOfBeds: n(room.number_of_beds),
      beddingConfigurations: (bedding || []).map((b: any) => ({
        type: b.type, size: b.size, quantity: Number(b.quantity ?? 1), raw: b,
      })),
      raw: null,
    },
    ratePlans,
    source: "jaaga",
    jaaga: {
      basePrice: n(room.base_price),
      photos: room.photos ?? [],
      amenities: room.amenities ?? null,
      description: room.description ?? null,
      extraBedAllowed: room.extra_bed_allowed ?? null,
      extraBedPrice: n(room.extra_bed_price),
      maxExtraBeds: n(room.max_extra_beds),
      childFreeAgeTo: n(room.child_free_age_to),
      childAgeTo: n(room.child_age_to),
      minNights: n(room.min_nights),
      totalUnits: n(room.total_units),
      inventory,
    },
    raw: room,
  };
}

export function toCanonicalProperty(hotel: any, rooms: CanonicalRoom[], extras: {
  remarks?: any[]; meals?: any[]; addons?: any[]; extraServices?: any[]; connection?: any;
}): CanonicalProperty {
  return {
    jaagaHotelId: hotel.id,
    propertyId: hotel.hyperguest_property_id ?? hotel.id,
    source: hotel.source_channel ?? "jaaga",
    propertyInfo: {
      name: hotel.name ?? null,
      starRating: n(hotel.star_rating),
      cityName: hotel.city ?? null,
      cityId: hotel.city_id ?? null,
      countryCode: hotel.country_code ?? (hotel.country === "India" ? "IN" : null),
      regionName: hotel.region_name ?? hotel.state ?? null,
      longitude: n(hotel.longitude),
      latitude: n(hotel.latitude),
      propertyType: hotel.property_type ?? "hotel",
      propertyTypeName: hotel.property_type_name ?? "Hotel",
      raw: null,
    },
    remarks: (extras.remarks || []).map((r: any) => r.remark),
    rooms,
    jaaga: {
      address: hotel.address ?? null,
      locality: hotel.locality ?? null,
      images: hotel.images ?? [],
      amenities: hotel.amenities ?? [],
      description: hotel.description ?? null,
      checkInTime: hotel.check_in_time ?? null,
      checkOutTime: hotel.check_out_time ?? null,
      gstRate: n(hotel.gst_rate),
      meals: extras.meals ?? [],
      addons: extras.addons ?? [],
      extraServices: extras.extraServices ?? [],
      channel: extras.connection
        ? {
          channel: extras.connection.channel,
          status: extras.connection.status ?? null,
          externalPropertyId: extras.connection.channel_property_id ?? null,
          lastSyncAt: extras.connection.last_sync_at ?? null,
          lastSyncStatus: extras.connection.last_sync_status ?? null,
          lastSyncError: extras.connection.last_sync_error ?? null,
        }
        : null,
    },
    raw: null,
  };
}
