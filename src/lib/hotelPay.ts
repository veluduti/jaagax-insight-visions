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

export interface HotelPayGroup {
  room_id: string;
  quantity: number;
  adults: number;
  children: number;
  extra_beds?: number;
  meals?: string[];
}

export interface HotelPayInput {
  hotel_id: string;
  hotel_name?: string | null;
  /** Single-room booking. Omit when `groups` is provided. */
  room_id?: string;
  /** Multi-room (combination) booking with per-room guest allocation. */
  groups?: HotelPayGroup[];
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  num_rooms: number;
  extra_beds?: number;
  meals?: string[];
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests?: string | null;
  user_id?: string | null;
  booked_by_agent_id?: string | null;
}

/**
 * Runs the full pay flow. Resolves with the booking id once the payment has
 * been verified server-side; rejects on failure/cancellation.
 */
export async function payForHotelBooking(input: HotelPayInput): Promise<string> {
  const ok = await loadRazorpayScript();
  if (!ok) throw new Error("Failed to load payment gateway");

  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: {
      hotel_id: input.hotel_id,
      room_id: input.room_id ?? null,
      groups: input.groups ?? [],
      check_in: input.check_in,
      check_out: input.check_out,
      adults: input.adults,
      children: input.children ?? 0,
      num_rooms: input.num_rooms,
      extra_beds: input.extra_beds ?? 0,
      meals: input.meals ?? [],
      guest_name: input.guest_name,
      guest_email: input.guest_email,
      guest_phone: input.guest_phone,
      special_requests: input.special_requests ?? null,
      user_id: input.user_id ?? null,
      booked_by_agent_id: input.booked_by_agent_id ?? null,
    },
  });

  if (error || !data?.order_id) {
    throw new Error(data?.error || error?.message || "Could not start payment");
  }

  return new Promise<string>((resolve, reject) => {
    const rzp = new window.Razorpay({
      ...razorpayCheckoutConfig,
      key: data.key_id,
      amount: data.amount,
      currency: data.currency || "INR",
      name: input.hotel_name || "JAAGA X",
      description: `Booking ${data.booking_reference ?? ""}`.trim(),
      order_id: data.order_id,
      prefill: { name: input.guest_name, email: input.guest_email, contact: input.guest_phone },
      theme: { color: "#10b981" },
      handler: async (response: any) => {
        try {
          const { data: verify, error: vErr } = await supabase.functions.invoke(
            "razorpay-verify-payment",
            {
              body: {
                booking_id: data.booking_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            },
          );
          if (vErr || !verify?.success) {
            throw new Error(verify?.error || vErr?.message || "Payment verification failed");
          }
          resolve(data.booking_id as string);
        } catch (e: any) {
          reject(new Error(e?.message || "Payment verification failed"));
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.on("payment.failed", (resp: any) => {
      reject(new Error(resp?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
}
