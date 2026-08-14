/**
 * Canonical hotel API client.
 *
 * The UI talks ONLY to these helpers. Whether a hotel is a direct JAAGA
 * property or a HyperGuest-connected property is resolved server-side inside
 * the edge functions — channel credentials never reach the browser.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CanonicalSearchResponse, CanonicalProperty, HotelExtraService } from "@/types/hotelCanonical";

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export interface CanonicalSearchParams {
  hotel_id?: string;
  city?: string;
  locality?: string;
  query?: string;
  check_in?: string;
  check_out?: string;
  adults?: number;
  children?: number;
  infants?: number;
  child_ages?: number[];
  rooms?: number;
  board?: string;
  limit?: number;
}

export function searchHotels(params: CanonicalSearchParams) {
  return invoke<CanonicalSearchResponse>("hotel-search", params);
}

export async function getHotelCanonical(hotelId: string, params: Omit<CanonicalSearchParams, "hotel_id"> = {}) {
  const res = await searchHotels({ ...params, hotel_id: hotelId, limit: 1 });
  return (res.results?.[0] ?? null) as CanonicalProperty | null;
}

export interface QuoteParams {
  hotel_id: string;
  room_id?: string;
  rate_plan_id?: string | null;
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  child_ages?: number[];
  infants?: number;
  num_rooms?: number;
  extra_beds?: number;
  meals?: string[];
  addons?: { addon_id: string; quantity: number }[];
  promo_code?: string | null;
  groups?: unknown[];
}

export function quoteBooking(params: QuoteParams) {
  return invoke<any>("booking-engine-quote", params);
}

export function confirmBooking(params: Record<string, unknown>) {
  return invoke<any>("booking-engine-confirm", params);
}

export function retrieveBooking(params: { booking_id?: string; guest_portal_token?: string }) {
  return invoke<any>("booking-engine-booking", params);
}

export function cancelBooking(params: { booking_id: string; reason?: string; cancelled_by?: string }) {
  return invoke<any>("hotel-booking-cancel", params);
}

/* ------------------------- JAAGA extra services ------------------------- */

export async function listExtraServices(hotelId: string) {
  const { data, error } = await (supabase as any)
    .from("hotel_extra_services")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("is_active", true)
    .order("service_type");
  if (error) throw error;
  return (data ?? []) as HotelExtraService[];
}

export async function submitExtraServiceEnquiry(payload: {
  hotel_id: string;
  service_id?: string | null;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  event_date?: string | null;
  guests_count?: number | null;
  message?: string | null;
  event_type?: string | null;
  preferred_time_from?: string | null;
  preferred_time_to?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any).from("hotel_extra_service_enquiries").insert({
    ...payload,
    user_id: user?.id ?? null,
  }).select("id").maybeSingle();
  if (error) throw error;
  return { id: (data?.id as string) ?? null };
}
