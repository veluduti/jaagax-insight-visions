/**
 * Centralized hotel pricing engine.
 *
 * The SAME algorithm runs in the browser (live preview) and on the server
 * (`supabase/functions/_shared/hotelPricing.ts` is a byte-compatible copy).
 * The server result is always the authoritative one.
 *
 * Rules implemented:
 *  - Room price is per room per night; date-specific rate calendar overrides base price.
 *  - Extra bed price is per bed per night.
 *  - Meal price is per person per day (adult / child prices differ).
 *  - Children are bucketed by the room's child age rules (free / child price / adult price).
 *  - "Included" meals are shown but never charged.
 *  - GST is calculated on the taxable subtotal only, never baked into item prices.
 */

export type MealType = "breakfast" | "lunch" | "dinner";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export interface MealConfig {
  meal_type: MealType;
  pricing_mode: "optional_paid" | "included";
  adult_price: number;
  child_price: number;
  is_available: boolean;
  is_active: boolean;
}

export interface RoomConfig {
  id: string;
  room_type: string;
  base_price: number;
  max_occupancy: number;
  max_adults?: number | null;
  max_children?: number | null;
  max_extra_beds?: number | null;
  extra_bed_allowed?: boolean | null;
  extra_bed_price?: number | null;
  min_nights?: number | null;
  total_units?: number | null;
  is_active?: boolean | null;
  bed_type?: string | null;
  child_free_age_to?: number | null;
  child_age_to?: number | null;
}

export interface NightRate {
  /** yyyy-MM-dd */
  date: string;
  price: number;
  stop_sell?: boolean;
  available_units?: number | null;
}

export interface AddonSelection {
  addon_id?: string;
  title: string;
  unit_price: number;
  quantity: number;
  /** nights / guests multiplier already resolved by the caller */
  units?: number;
}

export interface PricingInput {
  room: RoomConfig;
  meals: MealConfig[];
  /** Rate calendar rows for the stay nights (optional; base price used as fallback). */
  rateCalendar?: NightRate[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /** Optional ages of each child — enables the free / child / adult age rules. */
  childAges?: number[];
  numRooms: number;
  extraBeds: number;
  selectedMeals: MealType[];
  addons?: AddonSelection[];
  discount?: number;
  /** Hotel configured GST rate (percent). Falls back to the Indian slab rule. */
  gstRate?: number | null;
}

export interface LineItem {
  item_type: "room" | MealType | "extra_bed" | "addon" | "discount";
  item_name: string;
  quantity: number;
  unit_price: number;
  units: number;
  adult_count: number;
  child_count: number;
  subtotal: number;
  price_snapshot: Record<string, unknown>;
}

export interface PricingResult {
  nights: number;
  nightly: { date: string; price: number }[];
  perNight: number;
  roomCharges: number;
  mealTotal: number;
  mealBreakdown: { meal_type: MealType; label: string; included: boolean; total: number }[];
  extraBedTotal: number;
  addonTotal: number;
  discount: number;
  taxableSubtotal: number;
  gstRate: number;
  taxAmount: number;
  grandTotal: number;
  billableAdults: number;
  billableChildren: number;
  freeChildren: number;
  lineItems: LineItem[];
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const n = Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86400000);
  return n > 0 ? n : 0;
}

export function stayDates(checkIn: string, nights: number): string[] {
  const out: string[] = [];
  const start = new Date(checkIn + "T00:00:00");
  for (let i = 0; i < nights; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Default Indian hotel GST slab, used when the hotel has no configured rate. */
export function defaultGstRate(perNight: number): number {
  return perNight < 7500 ? 12 : 18;
}

const money = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Split children into free / child-priced / adult-priced buckets using room age rules. */
export function splitChildren(
  children: number,
  childAges: number[] | undefined,
  freeAgeTo: number,
  childAgeTo: number,
) {
  if (!childAges || childAges.length === 0) {
    return { free: 0, child: Math.max(0, children), adult: 0 };
  }
  let free = 0, child = 0, adult = 0;
  for (let i = 0; i < children; i++) {
    const age = Number(childAges[i]);
    if (!Number.isFinite(age)) { child++; continue; }
    if (age <= freeAgeTo) free++;
    else if (age <= childAgeTo) child++;
    else adult++;
  }
  return { free, child, adult };
}

export function computeBookingPrice(input: PricingInput): PricingResult {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const numRooms = Math.max(1, Number(input.numRooms) || 1);
  const adults = Math.max(1, Number(input.adults) || 1);
  const children = Math.max(0, Number(input.children) || 0);
  const extraBeds = Math.max(0, Number(input.extraBeds) || 0);
  const room = input.room;

  // --- Room charges: date-specific rate overrides the master base price. ---
  const rateMap = new Map<string, NightRate>();
  (input.rateCalendar || []).forEach((r) => rateMap.set(r.date, r));
  const dates = stayDates(input.checkIn, nights);
  const nightly = dates.map((date) => {
    const row = rateMap.get(date);
    const price =
      row && row.price != null && Number(row.price) > 0
        ? Number(row.price)
        : Number(room.base_price) || 0;
    return { date, price: money(price) };
  });
  const perRoomTotal = nightly.reduce((s, n) => s + n.price, 0);
  const roomCharges = money(perRoomTotal * numRooms);
  const perNight = nights > 0 ? money(perRoomTotal / nights) : money(room.base_price);

  // --- Child age buckets ---
  const buckets = splitChildren(
    children,
    input.childAges,
    Number(room.child_free_age_to ?? 5),
    Number(room.child_age_to ?? 11),
  );
  const billableAdults = adults + buckets.adult;
  const billableChildren = buckets.child;

  // --- Meals: per person per day (days = nights) ---
  const mealDays = nights;
  const mealBreakdown: PricingResult["mealBreakdown"] = [];
  const lineItems: LineItem[] = [];
  let mealTotal = 0;

  for (const type of MEAL_TYPES) {
    const cfg = (input.meals || []).find(
      (m) => m.meal_type === type && m.is_active !== false && m.is_available !== false,
    );
    if (!cfg) continue;
    const included = cfg.pricing_mode === "included";
    const chosen = included || input.selectedMeals.includes(type);
    if (!chosen) continue;

    const adultCharge = included ? 0 : money(Number(cfg.adult_price) * billableAdults * mealDays);
    const childCharge = included ? 0 : money(Number(cfg.child_price) * billableChildren * mealDays);
    const total = money(adultCharge + childCharge);
    mealTotal = money(mealTotal + total);
    mealBreakdown.push({ meal_type: type, label: MEAL_LABEL[type], included, total });

    if (total > 0) {
      lineItems.push({
        item_type: type,
        item_name: `${MEAL_LABEL[type]} (${billableAdults} adult${billableAdults !== 1 ? "s" : ""}${billableChildren ? `, ${billableChildren} child` : ""} × ${mealDays} day${mealDays !== 1 ? "s" : ""})`,
        quantity: billableAdults + billableChildren,
        unit_price: money(Number(cfg.adult_price)),
        units: mealDays,
        adult_count: billableAdults,
        child_count: billableChildren,
        subtotal: total,
        price_snapshot: {
          adult_price: Number(cfg.adult_price),
          child_price: Number(cfg.child_price),
          pricing_mode: cfg.pricing_mode,
          days: mealDays,
        },
      });
    }
  }

  // --- Extra beds ---
  const extraBedPrice = Number(room.extra_bed_price) || 0;
  const allowedBeds = room.extra_bed_allowed ? Number(room.max_extra_beds ?? 0) : 0;
  const chargeableBeds = Math.min(extraBeds, allowedBeds * numRooms || allowedBeds);
  const extraBedTotal = money(extraBedPrice * chargeableBeds * nights);

  // --- Add-ons ---
  let addonTotal = 0;
  for (const a of input.addons || []) {
    const units = Math.max(1, Number(a.units) || 1);
    const total = money(Number(a.unit_price) * Number(a.quantity) * units);
    if (total <= 0) continue;
    addonTotal = money(addonTotal + total);
    lineItems.push({
      item_type: "addon",
      item_name: a.title,
      quantity: Number(a.quantity),
      unit_price: money(Number(a.unit_price)),
      units,
      adult_count: 0,
      child_count: 0,
      subtotal: total,
      price_snapshot: { addon_id: a.addon_id ?? null, unit_price: Number(a.unit_price) },
    });
  }

  // Room line item first
  lineItems.unshift({
    item_type: "room",
    item_name: `${room.room_type} (${nights} night${nights !== 1 ? "s" : ""} × ${numRooms} room${numRooms !== 1 ? "s" : ""})`,
    quantity: numRooms,
    unit_price: perNight,
    units: nights,
    adult_count: adults,
    child_count: children,
    subtotal: roomCharges,
    price_snapshot: { nightly, base_price: Number(room.base_price), num_rooms: numRooms },
  });

  if (extraBedTotal > 0) {
    lineItems.push({
      item_type: "extra_bed",
      item_name: `Extra bed (${chargeableBeds} × ${nights} night${nights !== 1 ? "s" : ""})`,
      quantity: chargeableBeds,
      unit_price: money(extraBedPrice),
      units: nights,
      adult_count: 0,
      child_count: 0,
      subtotal: extraBedTotal,
      price_snapshot: { price_per_night: extraBedPrice, max_extra_beds: allowedBeds },
    });
  }

  const discount = money(Math.max(0, Number(input.discount) || 0));
  if (discount > 0) {
    lineItems.push({
      item_type: "discount",
      item_name: "Discount",
      quantity: 1,
      unit_price: -discount,
      units: 1,
      adult_count: 0,
      child_count: 0,
      subtotal: -discount,
      price_snapshot: {},
    });
  }

  const taxableSubtotal = money(
    Math.max(0, roomCharges + mealTotal + extraBedTotal + addonTotal - discount),
  );
  const gstRate =
    input.gstRate != null && Number(input.gstRate) >= 0
      ? Number(input.gstRate)
      : defaultGstRate(perNight);
  const taxAmount = money((taxableSubtotal * gstRate) / 100);
  const grandTotal = money(taxableSubtotal + taxAmount);

  return {
    nights,
    nightly,
    perNight,
    roomCharges,
    mealTotal,
    mealBreakdown,
    extraBedTotal,
    addonTotal,
    discount,
    taxableSubtotal,
    gstRate,
    taxAmount,
    grandTotal,
    billableAdults,
    billableChildren,
    freeChildren: buckets.free,
    lineItems,
  };
}

/** Validation shared by the preview and the server. Returns an error message or null. */
export function validateBookingSelection(input: PricingInput): string | null {
  const room = input.room;
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const numRooms = Math.max(1, Number(input.numRooms) || 1);
  if (nights < 1) return "Check-out must be after check-in.";
  if (room.is_active === false) return "This room is not available for booking.";
  if (room.min_nights && nights < Number(room.min_nights)) {
    return `This room requires a minimum stay of ${room.min_nights} night(s).`;
  }
  const maxAdults = Number(room.max_adults ?? room.max_occupancy ?? 0);
  const maxChildren = Number(room.max_children ?? 0);
  if (maxAdults > 0 && input.adults > maxAdults * numRooms) {
    return `Maximum ${maxAdults} adult(s) per room. Please add more rooms.`;
  }
  if (input.children > maxChildren * numRooms) {
    return `Maximum ${maxChildren} child(ren) per room. Please add more rooms.`;
  }
  const maxGuests = Number(room.max_occupancy || 0);
  if (maxGuests > 0 && input.adults + input.children > maxGuests * numRooms) {
    return `This room accommodates up to ${maxGuests} guest(s) per room. Please select more rooms.`;
  }
  if (input.extraBeds > 0) {
    if (!room.extra_bed_allowed) return "Extra beds are not available for this room.";
    const max = Number(room.max_extra_beds ?? 0) * numRooms;
    if (input.extraBeds > max) return `Maximum ${max} extra bed(s) allowed for this selection.`;
  }
  for (const t of input.selectedMeals) {
    const cfg = (input.meals || []).find(
      (m) => m.meal_type === t && m.is_active !== false && m.is_available !== false,
    );
    if (!cfg) return `${MEAL_LABEL[t]} is not available at this hotel.`;
  }
  return null;
}
