// Server-authoritative hotel quote builder.
// Fetches room, meal, rate-calendar, promo and tax configuration, validates the
// selection and returns the computed price using the shared pricing engine.
import {
  computeBookingPrice, validateBookingSelection, nightsBetween, stayDates,
  type MealType, type PricingResult, type LineItem,
} from "./hotelPricing.ts";

export interface QuoteRequest {
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  child_ages?: number[];
  guests?: number;
  num_rooms?: number;
  extra_beds?: number;
  meals?: MealType[];
  addons?: { addon_id: string; quantity: number }[];
  promo_code?: string | null;
}

export interface ServerQuote {
  error?: string;
  status?: number;
  result?: PricingResult;
  room?: any;
  hotel?: any;
  promo?: { code: string; discount: number } | null;
  lineItems?: LineItem[];
  available?: number;
}

export async function buildServerQuote(supabase: any, body: QuoteRequest): Promise<ServerQuote> {
  const {
    hotel_id, room_id, check_in, check_out,
    num_rooms = 1, extra_beds = 0, meals = [], addons = [], promo_code,
  } = body;

  if (!hotel_id || !room_id || !check_in || !check_out) {
    return { error: "Missing required booking fields", status: 400 };
  }

  const adults = Math.max(1, Number(body.adults ?? body.guests ?? 1));
  const children = Math.max(0, Number(body.children ?? 0));
  const numRooms = Math.max(1, Number(num_rooms));

  const [{ data: room }, { data: hotel }] = await Promise.all([
    supabase.from("hotel_rooms").select("*").eq("id", room_id).maybeSingle(),
    supabase.from("partner_hotels").select("*").eq("id", hotel_id).maybeSingle(),
  ]);
  if (!hotel) return { error: "Hotel not found", status: 404 };
  if (hotel.is_active === false) return { error: "This hotel is not accepting bookings right now", status: 400 };
  if (!room || room.hotel_id !== hotel_id) return { error: "Room not found", status: 404 };
  if (room.is_active === false) return { error: "This room is not currently bookable", status: 400 };

  const nights = nightsBetween(check_in, check_out);
  if (nights < 1) return { error: "Check-out must be after check-in", status: 400 };
  const dates = stayDates(check_in, nights);

  // Meal configuration: room-level overrides hotel-level.
  const { data: mealRows } = await supabase
    .from("hotel_meals").select("*").eq("hotel_id", hotel_id).eq("is_active", true);
  const mealMap = new Map<string, any>();
  for (const m of mealRows || []) {
    if (m.room_id && m.room_id !== room_id) continue;
    const existing = mealMap.get(m.meal_type);
    if (!existing || (m.room_id && !existing.room_id)) mealMap.set(m.meal_type, m);
  }
  const mealConfigs = Array.from(mealMap.values());

  // Rate calendar for the stay nights.
  const { data: rateRows } = await supabase
    .from("hotel_rate_calendar").select("*")
    .eq("room_id", room_id).gte("date", dates[0]).lte("date", dates[dates.length - 1]);

  for (const r of rateRows || []) {
    if (r.stop_sell) return { error: `Stay dates include a blocked date (${r.date}).`, status: 409 };
    if (r.available_units != null && Number(r.available_units) < numRooms) {
      return { error: `Only ${r.available_units} room(s) left on ${r.date}.`, status: 409 };
    }
  }

  // Live availability across existing bookings.
  let available: number | undefined;
  try {
    const { data: avail } = await supabase.rpc("check_room_availability", {
      _room_id: room_id, _check_in: check_in, _check_out: check_out,
    });
    if (avail != null) {
      available = Number(avail);
      if (available < numRooms) {
        return { error: "Not enough rooms available for the selected dates", status: 409, available };
      }
    }
  } catch { /* RPC optional */ }

  // Add-ons
  let addonSelections: any[] = [];
  if (Array.isArray(addons) && addons.length) {
    const ids = addons.map((a) => a.addon_id).filter(Boolean);
    const { data: addonRows } = await supabase
      .from("hotel_addons").select("*").in("id", ids).eq("is_active", true);
    addonSelections = addons.flatMap((sel) => {
      const row = (addonRows || []).find((x: any) => x.id === sel.addon_id);
      if (!row) return [];
      const units = row.unit === "per_night" ? nights : row.unit === "per_guest" ? adults + children : 1;
      return [{
        addon_id: row.id, title: row.title,
        unit_price: Number(row.price), quantity: Math.max(0, Number(sel.quantity) || 0), units,
      }];
    });
  }

  const baseInput = {
    room: room as any,
    meals: mealConfigs as any,
    rateCalendar: (rateRows || []).map((r: any) => ({
      date: r.date, price: Number(r.price), stop_sell: r.stop_sell, available_units: r.available_units,
    })),
    checkIn: check_in,
    checkOut: check_out,
    adults, children,
    childAges: body.child_ages,
    numRooms,
    extraBeds: Math.max(0, Number(extra_beds) || 0),
    selectedMeals: (meals || []) as MealType[],
    addons: addonSelections,
    discount: 0,
    gstRate: hotel.gst_rate ?? null,
  };

  const validationError = validateBookingSelection(baseInput as any);
  if (validationError) return { error: validationError, status: 400 };

  // Promo discount is applied against the pre-tax room+extras subtotal.
  let promo: { code: string; discount: number } | null = null;
  let discount = 0;
  if (promo_code) {
    const { data: p } = await supabase
      .from("hotel_promo_codes").select("*")
      .eq("hotel_id", hotel_id).eq("code", String(promo_code).toUpperCase())
      .eq("is_active", true).maybeSingle();
    if (p && nights >= (p.min_nights || 1) && (!p.max_uses || p.uses_count < p.max_uses)
      && (!p.valid_from || check_in >= p.valid_from) && (!p.valid_until || check_in <= p.valid_until)) {
      const preview = computeBookingPrice(baseInput as any);
      discount = p.discount_type === "percent"
        ? Math.round((preview.roomCharges * Number(p.discount_value)) / 100)
        : Number(p.discount_value);
      promo = { code: p.code, discount };
    }
  }

  const result = computeBookingPrice({ ...baseInput, discount } as any);
  return { result, room, hotel, promo, lineItems: result.lineItems, available };
}

/* -------------------------------------------------------------------------
 * MULTI-ROOM (combination) quotes
 * A group = one room type, N units, with its own guest allocation, meals and
 * extra beds. Each group is priced with its OWN room configuration.
 * ---------------------------------------------------------------------- */

export interface GroupRequest {
  room_id: string;
  quantity: number;
  adults: number;
  children: number;
  extra_beds?: number;
  meals?: MealType[];
}

export interface MultiQuote {
  error?: string;
  status?: number;
  hotel?: any;
  groups?: { group: GroupRequest; room: any; result: PricingResult }[];
  totals?: {
    nights: number;
    roomCharges: number;
    mealTotal: number;
    extraBedTotal: number;
    addonTotal: number;
    discount: number;
    taxableSubtotal: number;
    taxAmount: number;
    grandTotal: number;
    gstRate: number;
    totalRooms: number;
    adults: number;
    children: number;
  };
}

export async function buildMultiQuote(
  supabase: any,
  body: { hotel_id: string; check_in: string; check_out: string; groups: GroupRequest[] },
): Promise<MultiQuote> {
  const { hotel_id, check_in, check_out } = body;
  const groups = (body.groups || []).filter((g) => g && g.room_id && Number(g.quantity) > 0);
  if (!hotel_id || !check_in || !check_out || !groups.length) {
    return { error: "Missing booking selection", status: 400 };
  }
  // A room type must not appear twice — merge would break inventory checks.
  const ids = new Set(groups.map((g) => g.room_id));
  if (ids.size !== groups.length) return { error: "Duplicate room selection", status: 400 };

  const out: { group: GroupRequest; room: any; result: PricingResult }[] = [];
  let hotel: any = null;

  for (const g of groups) {
    const q = await buildServerQuote(supabase, {
      hotel_id,
      room_id: g.room_id,
      check_in,
      check_out,
      adults: Math.max(1, Number(g.adults) || 0),
      children: Math.max(0, Number(g.children) || 0),
      num_rooms: Math.max(1, Number(g.quantity) || 1),
      extra_beds: Math.max(0, Number(g.extra_beds) || 0),
      meals: g.meals || [],
    });
    if (q.error || !q.result) return { error: q.error, status: q.status || 400 };
    hotel = q.hotel;
    out.push({ group: g, room: q.room, result: q.result });
  }

  const sum = (fn: (r: PricingResult) => number) => out.reduce((s, x) => s + fn(x.result), 0);
  const totals = {
    nights: out[0].result.nights,
    roomCharges: sum((r) => r.roomCharges),
    mealTotal: sum((r) => r.mealTotal),
    extraBedTotal: sum((r) => r.extraBedTotal),
    addonTotal: sum((r) => r.addonTotal),
    discount: sum((r) => r.discount),
    taxableSubtotal: sum((r) => r.taxableSubtotal),
    taxAmount: sum((r) => r.taxAmount),
    grandTotal: sum((r) => r.grandTotal),
    gstRate: out[0].result.gstRate,
    totalRooms: groups.reduce((s, g) => s + Number(g.quantity), 0),
    adults: groups.reduce((s, g) => s + Number(g.adults), 0),
    children: groups.reduce((s, g) => s + Number(g.children || 0), 0),
  };

  return { hotel, groups: out, totals };
}

/** Persists line items for every group, prefixed with its room type. */
export async function saveMultiBookingItems(
  supabase: any,
  bookingId: string,
  hotelId: string,
  groups: { group: GroupRequest; room: any; result: PricingResult }[],
) {
  const rows: any[] = [];
  for (const g of groups) {
    for (const li of g.result.lineItems) {
      rows.push({
        booking_id: bookingId,
        hotel_id: hotelId,
        item_type: li.item_type,
        item_name: `${g.room?.room_type ?? "Room"} · ${li.item_name}`,
        quantity: li.quantity,
        unit_price: li.unit_price,
        units: li.units,
        adult_count: li.adult_count,
        child_count: li.child_count,
        subtotal: li.subtotal,
        tax_amount: 0,
        total_amount: li.subtotal,
        price_snapshot: { ...li.price_snapshot, room_id: g.group.room_id, room_type: g.room?.room_type },
      });
    }
    rows.push({
      booking_id: bookingId, hotel_id: hotelId, item_type: "tax",
      item_name: `${g.room?.room_type ?? "Room"} · GST @ ${g.result.gstRate}%`,
      quantity: 1, unit_price: g.result.taxAmount, units: 1,
      adult_count: 0, child_count: 0, subtotal: g.result.taxAmount,
      tax_amount: g.result.taxAmount, total_amount: g.result.taxAmount,
      price_snapshot: { gst_rate: g.result.gstRate, room_id: g.group.room_id },
    });
  }
  if (rows.length) await supabase.from("hotel_booking_items").insert(rows);
}

export function multiBookingPriceColumns(
  totals: NonNullable<MultiQuote["totals"]>,
  groups: { group: GroupRequest; room: any; result: PricingResult }[],
) {
  return {
    room_charges: totals.roomCharges,
    meal_total: totals.mealTotal,
    extra_bed_total: totals.extraBedTotal,
    addon_total: totals.addonTotal,
    discount_total: totals.discount,
    taxable_subtotal: totals.taxableSubtotal,
    gst_rate: totals.gstRate,
    tax_amount: totals.taxAmount,
    total_amount: totals.grandTotal,
    meals: Array.from(new Set(groups.flatMap((g) => g.group.meals || []))),
    price_snapshot: {
      computed_at: new Date().toISOString(),
      multi_room: true,
      totals,
      allocation: groups.map((g) => ({
        room_id: g.group.room_id,
        room_type: g.room?.room_type ?? null,
        quantity: g.group.quantity,
        adults: g.group.adults,
        children: g.group.children,
        extra_beds: g.group.extra_beds ?? 0,
        meals: g.group.meals || [],
        per_night: g.result.perNight,
        room_charges: g.result.roomCharges,
        total: g.result.grandTotal,
        line_items: g.result.lineItems,
      })),
    },
  };
}



export async function saveBookingItems(
  supabase: any, bookingId: string, hotelId: string, result: PricingResult,
) {
  const rows = result.lineItems.map((li) => ({
    booking_id: bookingId,
    hotel_id: hotelId,
    item_type: li.item_type,
    item_name: li.item_name,
    quantity: li.quantity,
    unit_price: li.unit_price,
    units: li.units,
    adult_count: li.adult_count,
    child_count: li.child_count,
    subtotal: li.subtotal,
    tax_amount: 0,
    total_amount: li.subtotal,
    price_snapshot: li.price_snapshot,
  }));
  rows.push({
    booking_id: bookingId, hotel_id: hotelId, item_type: "tax",
    item_name: `GST @ ${result.gstRate}%`, quantity: 1, unit_price: result.taxAmount,
    units: 1, adult_count: 0, child_count: 0, subtotal: result.taxAmount,
    tax_amount: result.taxAmount, total_amount: result.taxAmount,
    price_snapshot: { gst_rate: result.gstRate, taxable_subtotal: result.taxableSubtotal },
  } as any);
  await supabase.from("hotel_booking_items").insert(rows);
}

export function bookingPriceColumns(result: PricingResult, selectedMeals: MealType[]) {
  return {
    room_charges: result.roomCharges,
    meal_total: result.mealTotal,
    extra_bed_total: result.extraBedTotal,
    addon_total: result.addonTotal,
    discount_total: result.discount,
    taxable_subtotal: result.taxableSubtotal,
    gst_rate: result.gstRate,
    tax_amount: result.taxAmount,
    total_amount: result.grandTotal,
    meals: selectedMeals,
    price_snapshot: {
      computed_at: new Date().toISOString(),
      nightly: result.nightly,
      per_night: result.perNight,
      meals: result.mealBreakdown,
      line_items: result.lineItems,
      gst_rate: result.gstRate,
    },
  };
}
