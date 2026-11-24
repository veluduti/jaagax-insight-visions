/** Presentation photos for property types; any new type in the shared config falls back to the default. */
export const TYPE_PHOTO: Record<string, string> = {
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70",
  resort: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=70",
  pg: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=70",
  hostel: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=70",
  coliving: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=70",
  serviced_apartment: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=70",
  apartment: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=70",
  villa: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=70",
  homestay: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&q=70",
  farm_stay: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=70",
  luxury: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=70",
  corporate: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=70",
  guest_house: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=70",
  boutique: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=70",
};
export const DEFAULT_PHOTO = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=70";

/** Owner-facing onboarding copy per property type; every type reuses one dashboard. */
export type OnboardingCopy = { owner: string; inventoryTitle: string; inventoryDesc: string; listingGoal: string; proofs: string[] };
const LONG: OnboardingCopy = { owner: "Owner", inventoryTitle: "Configure Rooms & Beds", inventoryDesc: "Add room types, bed count, rent, sharing/occupancy and facilities.", listingGoal: "get residents and collect rent", proofs: ["Police / local authority registration (if applicable)"] };
const NIGHT: OnboardingCopy = { owner: "Partner", inventoryTitle: "Configure Rooms & Rates", inventoryDesc: "Add room categories, inventory, nightly prices and booking policies.", listingGoal: "get bookings", proofs: ["Trade licence / hotel registration"] };
const UNIT: OnboardingCopy = { owner: "Host", inventoryTitle: "Configure Units", inventoryDesc: "Add units, amenities, stay durations, prices and rental policies.", listingGoal: "get bookings for your units", proofs: [] };
export const ONBOARDING_COPY: Record<string, OnboardingCopy> = {
  pg: LONG, hostel: LONG, shared_room: LONG,
  coliving: { ...LONG, inventoryTitle: "Configure Rooms, Beds & Memberships", inventoryDesc: "Add private/shared rooms, beds, membership plans, deposits and community rules." },
  resort: { ...NIGHT, inventoryDesc: "Add room/villa categories, nightly prices, packages and experiences." },
  farm_stay: { ...NIGHT, inventoryDesc: "Add rooms/cottages, nightly prices and farm experiences." },
  serviced_apartment: UNIT, apartment: UNIT, villa: UNIT,
  homestay: { ...UNIT, inventoryTitle: "Configure Rooms", inventoryDesc: "Add rooms, house rules, meals and nightly prices." },
};
export const onboardingCopy = (type?: string | null): OnboardingCopy => ONBOARDING_COPY[type ?? ""] ?? NIGHT;
