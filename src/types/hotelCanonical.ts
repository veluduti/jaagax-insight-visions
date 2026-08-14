/**
 * JAAGA canonical hotel model (frontend mirror).
 *
 * This is a SUPERSET of the HyperGuest search/booking model: every HyperGuest
 * field has a home here, and every JAAGA-only feature (meals, add-ons, extra
 * beds, extra services, GST, inventory) lives under the `jaaga` extensions.
 *
 * The UI ONLY ever works with this shape — never with raw channel JSON.
 */

export type PriceType = "net" | "sell" | "commission" | "bar";

export interface CanonicalPrice {
  priceType: PriceType;
  price: number;
  currency: string | null;
  searchCurrency?: string | null;
}

export interface CanonicalTaxFee {
  code: string | null;
  name: string | null;
  description: string | null;
  amount: number;
  currency: string | null;
  relation: string | null;
  scope: string | null;
  frequency: string | null;
  calculationType: string | null;
  calculationValue: number | null;
}

export interface CanonicalCancellationPolicy {
  daysBefore: number | null;
  penaltyType: string | null;
  amount: number | null;
  currency: string | null;
  timeFromCheckIn: number | null;
  timeFromCheckInType: string | null;
  cancellationDeadlineHour: string | null;
}

export interface CanonicalNightlyRate {
  date: string | null;
  net: CanonicalPrice | null;
  sell: CanonicalPrice | null;
  commission: CanonicalPrice | null;
  bar: CanonicalPrice | null;
  taxes: CanonicalTaxFee[];
  fees: CanonicalTaxFee[];
}

export interface CanonicalRatePlan {
  jaagaRatePlanId?: string | null;
  ratePlanId: string | null;
  ratePlanCode: string | null;
  ratePlanName: string | null;
  board: string | null;
  isImmediate: boolean | null;
  ratePlanInfo: {
    virtual: boolean | null;
    originalRatePlanCode: string | null;
    isPromotion: boolean | null;
    isPackageRate: boolean | null;
    isPrivate: boolean | null;
    contractId: string | null;
    contracts: { contractId: string | null; type: string | null; terms: unknown[] }[];
    terms: unknown[];
  };
  payment: { charge: string | null; chargeType: string | null; chargeAmount: unknown } | null;
  prices: CanonicalPrice[];
  taxes: CanonicalTaxFee[];
  fees: CanonicalTaxFee[];
  remarks: string[];
  cancellationPolicies: CanonicalCancellationPolicy[];
  nightlyBreakdown: CanonicalNightlyRate[];
  source: string;
  jaaga?: { gstRate?: number | null; basePrice?: number | null; isRefundable?: boolean | null } | null;
}

export interface CanonicalRoom {
  jaagaRoomId?: string | null;
  roomId: string | null;
  roomTypeCode: string | null;
  roomName: string | null;
  numberOfAvailableRooms: number | null;
  searchedPax: { adults: number; children: number; infants: number; childAges: number[] } | null;
  settings: {
    numberOfBedrooms: number | null;
    roomSize: number | null;
    maxAdultsNumber: number | null;
    maxChildrenNumber: number | null;
    maxInfantsNumber: number | null;
    maxOccupancy: number | null;
    numberOfBeds: number | null;
    beddingConfigurations: { type: string | null; size: string | null; quantity: number }[];
  };
  ratePlans: CanonicalRatePlan[];
  source: string;
  jaaga?: {
    basePrice?: number | null;
    photos?: string[];
    amenities?: unknown;
    description?: string | null;
    extraBedAllowed?: boolean | null;
    extraBedPrice?: number | null;
    maxExtraBeds?: number | null;
    minNights?: number | null;
    totalUnits?: number | null;
    inventory?: unknown[];
  } | null;
}

export interface CanonicalProperty {
  jaagaHotelId: string | null;
  propertyId: string | null;
  source: string;
  propertyInfo: {
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
  };
  remarks: string[];
  rooms: CanonicalRoom[];
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
    extraServices?: HotelExtraService[];
    channel?: {
      channel: string;
      status: string | null;
      externalPropertyId: string | null;
      lastSyncAt: string | null;
      lastSyncStatus: string | null;
      lastSyncError: string | null;
    } | null;
  } | null;
}

export interface HotelExtraService {
  id: string;
  hotel_id: string;
  service_type: string;
  name: string;
  description: string | null;
  images: string[];
  capacity: number | null;
  location: string | null;
  price: number | null;
  currency: string;
  pricing_type: string;
  availability_type: string;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  category?: string | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
  amenities?: string[] | null;
  tags?: string[] | null;
  video_url?: string | null;
  duration?: string | null;
}

export interface CanonicalSearchResponse {
  results: CanonicalProperty[];
  count: number;
  searched: {
    check_in: string | null;
    check_out: string | null;
    nights: number;
    adults: number;
    children: number;
    infants: number;
    child_ages: number[];
    rooms: number;
  };
  channels: Record<string, string>;
  channel_error?: unknown;
}

export const BOARD_LABEL: Record<string, string> = {
  RO: "Room Only",
  BB: "Breakfast Included",
  HB: "Half Board",
  FB: "Full Board",
  AI: "All Inclusive",
};

export function boardLabel(board?: string | null) {
  if (!board) return "Room Only";
  return BOARD_LABEL[board] ?? board;
}

/** Best guest-facing price for a rate plan (sell price, falling back to net). */
export function ratePlanSellPrice(plan: CanonicalRatePlan): number {
  const sell = plan.prices.find((p) => p.priceType === "sell");
  const net = plan.prices.find((p) => p.priceType === "net");
  return Number(sell?.price ?? net?.price ?? 0);
}

export function cheapestRatePlan(room: CanonicalRoom): CanonicalRatePlan | null {
  if (!room.ratePlans?.length) return null;
  return [...room.ratePlans].sort((a, b) => ratePlanSellPrice(a) - ratePlanSellPrice(b))[0];
}
