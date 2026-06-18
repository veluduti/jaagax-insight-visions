import { supabase } from "@/integrations/supabase/client";

export type HotelBookingStatus = "confirmed" | "modified" | "cancelled" | "completed";
export type HotelPaymentStatus = "pending" | "paid" | "refunded";

export interface HotelBooking {
  id: string;
  builder_profile_id: string;
  hotel_id: string | null;
  hotel_name: string | null;
  hotel_address: string | null;
  room_type: string | null;
  check_in: string;
  check_out: string;
  num_guests: number | null;
  num_rooms: number | null;
  total_amount: number;
  currency: string;
  status: HotelBookingStatus;
  payment_status: HotelPaymentStatus;
  payment_method: string | null;
  booking_reference: string | null;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  invoice_url: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

const sb = supabase as any;

function genRef() {
  return "HB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export const hotelService = {
  async getBookings(builderProfileId: string): Promise<HotelBooking[]> {
    const { data, error } = await sb
      .from("hotel_bookings")
      .select("*")
      .eq("builder_profile_id", builderProfileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as HotelBooking[];
  },

  async getBooking(id: string): Promise<HotelBooking | null> {
    const { data, error } = await sb.from("hotel_bookings").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as HotelBooking | null;
  },

  async createBooking(input: Partial<HotelBooking> & { builder_profile_id: string; check_in: string; check_out: string; guest_name: string; total_amount: number }): Promise<HotelBooking> {
    const payload = {
      builder_profile_id: input.builder_profile_id,
      hotel_id: input.hotel_id ?? null,
      hotel_name: input.hotel_name ?? "Hotel",
      hotel_address: input.hotel_address ?? null,
      room_type: input.room_type ?? "Standard",
      check_in: input.check_in,
      check_out: input.check_out,
      num_guests: input.num_guests ?? 1,
      num_rooms: input.num_rooms ?? 1,
      total_amount: input.total_amount,
      currency: input.currency ?? "INR",
      status: (input.status as HotelBookingStatus) ?? "confirmed",
      payment_status: (input.payment_status as HotelPaymentStatus) ?? "pending",
      payment_method: input.payment_method ?? null,
      booking_reference: input.booking_reference ?? genRef(),
      guest_name: input.guest_name,
      guest_email: input.guest_email ?? null,
      guest_phone: input.guest_phone ?? null,
      special_requests: input.special_requests ?? null,
    };
    const { data, error } = await sb.from("hotel_bookings").insert(payload).select("*").single();
    if (error) throw error;
    return data as HotelBooking;
  },

  async modifyBooking(id: string, patch: Partial<HotelBooking>): Promise<HotelBooking> {
    const { data, error } = await sb
      .from("hotel_bookings")
      .update({ ...patch, status: "modified", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as HotelBooking;
  },

  async cancelBooking(id: string, reason: string): Promise<HotelBooking> {
    const { data, error } = await sb
      .from("hotel_bookings")
      .update({ status: "cancelled", cancellation_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as HotelBooking;
  },

  async generateInvoice(bookingId: string): Promise<string> {
    // Placeholder: a real implementation would render & upload PDF. We mark URL deterministically.
    const url = `/invoices/hotel-${bookingId}.pdf`;
    await sb.from("hotel_bookings").update({ invoice_url: url, updated_at: new Date().toISOString() }).eq("id", bookingId);
    return url;
  },

  async rebookBooking(id: string): Promise<HotelBooking> {
    const existing = await this.getBooking(id);
    if (!existing) throw new Error("Booking not found");
    return this.createBooking({
      builder_profile_id: existing.builder_profile_id,
      hotel_id: existing.hotel_id ?? undefined,
      hotel_name: existing.hotel_name ?? "Hotel",
      hotel_address: existing.hotel_address ?? undefined,
      room_type: existing.room_type ?? undefined,
      check_in: existing.check_in,
      check_out: existing.check_out,
      num_guests: existing.num_guests ?? 1,
      num_rooms: existing.num_rooms ?? 1,
      total_amount: existing.total_amount,
      currency: existing.currency,
      guest_name: existing.guest_name,
      guest_email: existing.guest_email ?? undefined,
      guest_phone: existing.guest_phone ?? undefined,
      special_requests: existing.special_requests ?? undefined,
    });
  },

  async getBookingStats(builderProfileId: string) {
    const bookings = await this.getBookings(builderProfileId);
    return {
      total: bookings.length,
      active: bookings.filter((b) => b.status === "confirmed" || b.status === "modified").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  },

  async getBuilderProfileId(userId: string): Promise<string | null> {
    const { data } = await sb.from("builder_profiles").select("id").eq("user_id", userId).maybeSingle();
    return data?.id ?? null;
  },
};
