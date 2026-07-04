// Verifies a Razorpay payment signature and confirms the booking.
// Also fires notifications to guest, hotel manager, and admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing payment fields" }, 400);
    }

    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RZP_SECRET) return json({ error: "Payment gateway not configured" }, 500);

    const expected = await hmacHex(RZP_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) {
      return json({ error: "Invalid payment signature" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Mint a stay-portal token
    const tokBytes = new Uint8Array(20);
    crypto.getRandomValues(tokBytes);
    const portalToken = Array.from(tokBytes, b => b.toString(16).padStart(2, "0")).join("");

    const { data: booking, error: bErr } = await supabase
      .from("hotel_bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        razorpay_payment_id,
        razorpay_signature,
        guest_portal_token: portalToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id)
      .eq("razorpay_order_id", razorpay_order_id)
      .select().single();

    if (bErr || !booking) return json({ error: bErr?.message || "Booking not found" }, 404);

    // Notifications (best-effort, non-blocking)
    try {
      // 1) Guest
      if (booking.user_id) {
        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          type: "success",
          title: "Booking confirmed 🎉",
          message: `Your stay at ${booking.hotel_name || "the hotel"} from ${booking.check_in} to ${booking.check_out} is confirmed (Ref: ${booking.booking_reference}).`,
          link: `/hotels/booking/${booking.id}/confirmed`,
          is_read: false,
        });
      }

      // 2) Hotel manager(s): look up staff for this hotel
      const { data: staff } = await supabase
        .from("hotel_staff")
        .select("user_id")
        .eq("hotel_id", booking.hotel_id);
      if (staff?.length) {
        await supabase.from("notifications").insert(staff.map((s: any) => ({
          user_id: s.user_id,
          type: "info",
          title: "New confirmed booking",
          message: `${booking.guest_name} booked ${booking.num_rooms} room(s) · ${booking.check_in} → ${booking.check_out}. Ref: ${booking.booking_reference}.`,
          link: `/partners/dashboard`,
          is_read: false,
        })));
      }

      // 3) Admins
      const { data: admins } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map((a: any) => ({
          user_id: a.user_id,
          type: "info",
          title: "New hotel booking payment received",
          message: `₹${booking.total_amount} · ${booking.hotel_name || "Hotel"} · ${booking.booking_reference}.`,
          link: `/admin`,
          is_read: false,
        })));
      }

      // 4) Email confirmation (reuse existing)
      await fetch(
        new URL("/functions/v1/send-booking-confirmation", Deno.env.get("SUPABASE_URL")!),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ booking_id: booking.id }),
        },
      ).catch(() => {});
    } catch (e) {
      console.error("notification error", e);
    }

    return json({ success: true, booking });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
