// Shared Razorpay payment helper for hotel bookings.
// Creates the server-authoritative order, opens Razorpay Checkout and verifies
// the signature server-side. Resolves with the confirmed booking id.
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window { Razorpay?: any }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export const razorpayCheckoutConfig = {
  method: { upi: true, card: true, netbanking: true, wallet: true, emi: true, paylater: true },
  config: {
    display: {
      blocks: {
        allMethods: {
          name: "All payment options",
          instruments: [
            { method: "card" },
            { method: "netbanking" },
            { method: "wallet" },
            { method: "emi" },
            { method: "paylater" },
            { method: "upi" },
          ],
        },
      },
      sequence: ["block.allMethods"],
      preferences: { show_default_blocks: true },
    },
  },
};

export interface HotelPayGuest {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  guestType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
}

export interface HotelPayGroup {
  room_id: string;
  /** Rate plan chosen for this room type (drives the HyperGuest rate code). */
  rate_plan_id?: string | null;
  quantity: number;
  adults: number;
  children: number;
  infants?: number;
  child_ages?: number[];
  extra_beds?: number;
  meals?: string[];
  board?: string | null;
  guests?: HotelPayGuest[];
  special_requests?: string[];
}

export interface HotelPayInput {
  hotel_id: string;
  hotel_name?: string | null;
  /** Single-room booking. Omit when `groups` is provided. */
  room_id?: string;
  rate_plan_id?: string | null;
  /** Multi-room (combination) booking with per-room guest allocation. */
  groups?: HotelPayGroup[];
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  infants?: number;
  child_ages?: number[];
  num_rooms: number;
  extra_beds?: number;
  meals?: string[];
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  /** Full canonical lead guest; derived from guest_name/email/phone when absent. */
  lead_guest?: HotelPayGuest | null;
  special_requests?: string | null;
  addons?: unknown[];
  promo_code?: string | null;
  booking_type?: "hotel_only" | "visit_stay";
  source?: string;
  agency_reference?: string | null;
  meta?: unknown[];
  user_id?: string | null;
  booked_by_agent_id?: string | null;
}

const splitName = (full: string) => {
  const parts = String(full || "").trim().split(/\s+/);
  return { first: parts[0] ?? null, last: parts.slice(1).join(" ") || null };
};

/**
 * Runs the full pay flow through the CANONICAL booking pipeline:
 *
 *   booking-engine-confirm  → creates the booking (JAAGA graph + HyperGuest
 *                             booking/create when the hotel is channel-connected)
 *   razorpay-pay-existing   → server-authoritative order for that booking
 *   razorpay-verify-payment → signature check, marks the booking paid
 *
 * Resolves with the booking id; rejects on failure/cancellation (an unpaid
 * booking is cancelled through the canonical cancellation contract).
 */
export async function payForHotelBooking(input: HotelPayInput): Promise<string> {
  const ok = await loadRazorpayScript();
  if (!ok) throw new Error("Failed to load payment gateway");

  const name = splitName(input.guest_name);
  const leadGuest: HotelPayGuest = input.lead_guest ?? {
    title: null,
    firstName: name.first,
    lastName: name.last,
    email: input.guest_email,
    phone: input.guest_phone,
    guestType: "adult",
  };

  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `jaaga-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const groups = (input.groups ?? []).map((g) => ({
    room_id: g.room_id,
    rate_plan_id: g.rate_plan_id ?? null,
    quantity: g.quantity,
    adults: g.adults,
    children: g.children,
    infants: g.infants ?? 0,
    child_ages: g.child_ages ?? null,
    extra_beds: g.extra_beds ?? 0,
    meals: g.meals ?? [],
    board: g.board ?? null,
    guests: g.guests ?? [leadGuest],
    special_requests: g.special_requests ?? (input.special_requests ? [input.special_requests] : []),
  }));

  const { data: confirmed, error: cErr } = await supabase.functions.invoke("booking-engine-confirm", {
    body: {
      hotel_id: input.hotel_id,
      room_id: input.room_id ?? null,
      rate_plan_id: input.rate_plan_id ?? null,
      groups: groups.length ? groups : null,
      check_in: input.check_in,
      check_out: input.check_out,
      adults: input.adults,
      children: input.children ?? 0,
      infants: input.infants ?? 0,
      child_ages: input.child_ages ?? null,
      num_rooms: input.num_rooms,
      extra_beds: input.extra_beds ?? 0,
      meals: input.meals ?? [],
      addons: input.addons ?? [],
      promo_code: input.promo_code ?? null,
      guest_name: input.guest_name,
      guest_email: input.guest_email,
      guest_phone: input.guest_phone,
      lead_guest: leadGuest,
      special_requests: input.special_requests ?? null,
      booking_type: input.booking_type ?? "hotel_only",
      source: input.source ?? (input.booked_by_agent_id ? "agent" : "direct"),
      agency_reference: input.agency_reference ?? null,
      idempotency_key: idempotencyKey,
      meta: input.meta ?? [],
      user_id: input.user_id ?? null,
      booked_by_agent_id: input.booked_by_agent_id ?? null,
      // Booking is held as pending until Razorpay confirms the payment.
      booking_status: "pending",
      payment_status: "pending",
      payment_method: "razorpay",
      send_email: false,
    },
  });

  const bookingId: string | undefined = confirmed?.booking?.id;
  if (cErr || confirmed?.error || !bookingId) {
    throw new Error(confirmed?.error || cErr?.message || "Could not create booking");
  }

  const cancelUnpaid = async (reason: string) => {
    try {
      await supabase.functions.invoke("hotel-booking-cancel", {
        body: { booking_id: bookingId, reason, cancelled_by: "guest" },
      });
    } catch { /* best effort */ }
  };

  const { data: order, error: oErr } = await supabase.functions.invoke("razorpay-pay-existing", {
    body: { booking_id: bookingId },
  });
  if (oErr || !order?.order_id) {
    await cancelUnpaid("Payment order could not be created");
    throw new Error(order?.error || oErr?.message || "Could not start payment");
  }

  return new Promise<string>((resolve, reject) => {
    const rzp = new window.Razorpay({
      ...razorpayCheckoutConfig,
      key: order.key_id,
      amount: order.amount,
      currency: order.currency || "INR",
      name: input.hotel_name || "JAAGA X",
      description: `Booking ${order.booking_reference ?? ""}`.trim(),
      order_id: order.order_id,
      prefill: { name: input.guest_name, email: input.guest_email, contact: input.guest_phone },
      theme: { color: "#10b981" },
      handler: async (response: any) => {
        try {
          const { data: verify, error: vErr } = await supabase.functions.invoke(
            "razorpay-verify-payment",
            {
              body: {
                booking_id: bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            },
          );
          if (vErr || !verify?.success) {
            throw new Error(verify?.error || vErr?.message || "Payment verification failed");
          }
          resolve(bookingId);
        } catch (e: any) {
          reject(new Error(e?.message || "Payment verification failed"));
        }
      },
      modal: {
        ondismiss: async () => {
          await cancelUnpaid("Payment cancelled by guest");
          reject(new Error("Payment cancelled"));
        },
      },
    });
    rzp.on("payment.failed", async (resp: any) => {
      await cancelUnpaid("Payment failed");
      reject(new Error(resp?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
}

