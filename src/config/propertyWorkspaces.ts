/**
 * Type-specific partner workspaces. Every property type reuses the same
 * data (hotel_rooms, hotel_inventory_units, hotel_bookings, rate plans);
 * only the sections and wording change per type.
 */
export type WorkspaceSectionKey =
  | "room_types" | "apartment_types" | "rooms" | "units" | "beds"
  | "rates" | "daily_rates" | "weekly_rates" | "monthly_rates"
  | "availability" | "housekeeping" | "residents" | "move" | "bookings" | "experiences" | "meals";

export interface WorkspaceSection { key: WorkspaceSectionKey; label: string; to: string; desc: string }

const S: Record<WorkspaceSectionKey, WorkspaceSection> = {
  room_types: { key: "room_types", label: "Room Types", to: "/partners/rooms", desc: "Categories like Standard, Deluxe, Suite" },
  apartment_types: { key: "apartment_types", label: "Apartment Types", to: "/partners/rooms", desc: "Studio, 1 BHK, 2 BHK…" },
  rooms: { key: "rooms", label: "Rooms", to: "/partners/inventory", desc: "Individual numbered rooms" },
  units: { key: "units", label: "Units", to: "/partners/inventory", desc: "Individual apartments / villas" },
  beds: { key: "beds", label: "Beds", to: "/partners/inventory", desc: "Beds inside shared rooms" },
  rates: { key: "rates", label: "Rates", to: "/partners/rate-plans", desc: "Nightly prices and rate plans" },
  daily_rates: { key: "daily_rates", label: "Daily Rates", to: "/partners/pricing", desc: "Price per night" },
  weekly_rates: { key: "weekly_rates", label: "Weekly Rates", to: "/partners/pricing", desc: "Price per week" },
  monthly_rates: { key: "monthly_rates", label: "Monthly Rates", to: "/partners/pricing", desc: "Price per month" },
  availability: { key: "availability", label: "Availability", to: "/partners/inventory", desc: "Calendar, blocks and open dates" },
  housekeeping: { key: "housekeeping", label: "Housekeeping", to: "/partners/dashboard", desc: "Cleaning status of rooms" },
  residents: { key: "residents", label: "Residents", to: "/partners/guests", desc: "People currently living here" },
  move: { key: "move", label: "Move-in / Move-out", to: "/partners/reservations", desc: "Upcoming arrivals and exits" },
  bookings: { key: "bookings", label: "Bookings", to: "/partners/reservations", desc: "Reservations for this property" },
  experiences: { key: "experiences", label: "Experiences", to: "/partners/extra-services", desc: "Activities and tours" },
  meals: { key: "meals", label: "Meals", to: "/partners/extra-services", desc: "Meal plans and food" },
};

const HOTEL = [S.room_types, S.rooms, S.rates, S.availability, S.housekeeping, S.bookings];
const APARTMENT = [S.apartment_types, S.units, S.daily_rates, S.weekly_rates, S.monthly_rates, S.availability, S.bookings];
const SHARED = [S.room_types, S.rooms, S.beds, S.monthly_rates, S.residents, S.move, S.bookings];
const HOSTEL = [S.room_types, S.rooms, S.beds, S.daily_rates, S.availability, S.housekeeping, S.bookings];

export const WORKSPACES: Record<string, WorkspaceSection[]> = {
  hotel: HOTEL,
  boutique: HOTEL,
  guest_house: HOTEL,
  private_room: HOTEL,
  resort: [...HOTEL, S.experiences, S.meals],
  homestay: [S.room_types, S.rooms, S.rates, S.availability, S.meals, S.experiences, S.bookings],
  farm_stay: [S.room_types, S.rooms, S.rates, S.availability, S.experiences, S.bookings],
  serviced_apartment: APARTMENT,
  apartment: APARTMENT,
  villa: [S.units, S.daily_rates, S.weekly_rates, S.availability, S.bookings],
  coliving: SHARED,
  pg: [...SHARED.slice(0, 6), S.meals, S.bookings],
  hostel: HOSTEL,
  shared_room: HOSTEL,
  other: HOTEL,
};

export const workspaceFor = (type: string) => WORKSPACES[type] ?? HOTEL;
