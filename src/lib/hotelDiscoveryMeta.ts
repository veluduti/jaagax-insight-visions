import { canonicalizeCity } from "./cityNormalizer";
import { CITY_CENTRES } from "./hyderabadPropertyRadius";
import {
  Armchair,
  Bell,
  Building2,
  Car,
  Coffee,
  ConciergeBell,
  Dumbbell,
  Flame,
  Flower2,
  Laptop,
  ShowerHead,
  Snowflake,
  Sparkles,
  Tv,
  Utensils,
  UtensilsCrossed,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Presentation helpers for hotel discovery results. Everything here is derived
 * from data a partner (or a guest) actually entered — no invented ratings,
 * distances or policy claims. When the underlying data is missing the helper
 * returns null/false and the UI simply hides that line.
 */

const haversineKm = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const radians = (n: number) => (n * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
};

/**
 * Straight-line distance from the hotel's saved map pin to its city centre.
 * Returns null when either the pin or a known centre is unavailable, so the
 * UI never shows a made-up "x km from city centre".
 */
export function distanceFromCityCentre(hotel: {
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): number | null {
  const lat = Number(hotel.latitude);
  const lng = Number(hotel.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !lat || !lng) return null;
  const centre = CITY_CENTRES[canonicalizeCity(hotel.city)];
  if (!centre) return null;
  const km = haversineKm(lat, lng, centre[0], centre[1]);
  return Math.round(km * 10) / 10;
}

/** "1.2K" style review counts, but never a rounded-up fake number. */
export function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(Math.round((count / 1000) * 10) / 10).toString().replace(/\.0$/, "")}K`;
  return String(count);
}

const AMENITY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /wi[\s-]?fi|internet|wireless/i, icon: Wifi },
  { match: /pool|swim/i, icon: Waves },
  { match: /gym|fitness|workout/i, icon: Dumbbell },
  { match: /spa|massage|wellness/i, icon: Flower2 },
  { match: /restaurant|dining|eatery|cafe|coffee shop/i, icon: UtensilsCrossed },
  { match: /breakfast|meal|food/i, icon: Coffee },
  { match: /parking|valet/i, icon: Car },
  { match: /air[\s-]?cond|ac\b|cooling/i, icon: Snowflake },
  { match: /power|backup|generator|electric/i, icon: Zap },
  { match: /lift|elevator/i, icon: Building2 },
  { match: /front desk|reception|concierge|24[\s-]?hour/i, icon: ConciergeBell },
  { match: /tv|television|smart tv/i, icon: Tv },
  { match: /work desk|business centre|meeting|conference/i, icon: Laptop },
  { match: /bathroom|shower|bathtub/i, icon: ShowerHead },
  { match: /tea|coffee maker|kettle/i, icon: Coffee },
  { match: /laundry|dry clean/i, icon: Sparkles },
  { match: /bar|lounge/i, icon: Utensils },
  { match: /heat|fire|fireplace/i, icon: Flame },
  { match: /balcony|terrace|garden|seat/i, icon: Armchair },
];

/** Icon for a partner-entered amenity label; falls back to a neutral marker. */
export function amenityIcon(amenity: string): LucideIcon {
  const found = AMENITY_ICONS.find((entry) => entry.match.test(amenity));
  return found?.icon ?? Building2;
}

/** Short, readable label for an amenity chip ("Free Wi-Fi" -> "WiFi"). */
export function amenityLabel(amenity: string): string {
  return amenity
    .replace(/^free\s+/i, "")
    .replace(/wi[\s-]?fi/i, "WiFi")
    .replace(/24[\s-]?hour[\s-]?front[\s-]?desk/i, "24h Desk")
    .replace(/\s+/g, " ")
    .trim();
}

/** True only when a partner-entered cancellation policy really is free. */
export function hasFreeCancellation(
  rooms: { cancellation_policy?: string | null }[] | null | undefined,
): boolean {
  return (rooms || []).some((r) => {
    const policy = (r.cancellation_policy || "").toLowerCase();
    return policy.includes("free") || policy.includes("no charge") || policy.includes("flexible");
  });
}

/** True only when breakfast appears in partner-entered room/hotel data. */
export function hasBreakfast(
  rooms: { amenities?: string[] | null; attributes?: Record<string, unknown> | null }[] | null | undefined,
  hotelAmenities: string[] | null | undefined,
): boolean {
  const hotelHit = (hotelAmenities || []).some((a) => /breakfast|meal/i.test(a));
  const roomHit = (rooms || []).some((r) =>
    JSON.stringify([r.amenities, r.attributes]).toLowerCase().includes("breakfast"),
  );
  return hotelHit || roomHit;
}
