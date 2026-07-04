// Creates a Razorpay order for an already-created hotel booking that hasn't
// been paid yet (e.g. legacy bookings inserted directly without a payment).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id required" }, 400);

    const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RZP_KEY || !RZP_SECRET) return json({ error: "Payment gateway not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error } = await supabase
      .from("hotel_bookings")
      .select("id, booking_reference, total_amount, payment_status, hotel_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (error || !booking) return json({ error: "Booking not found" }, 404);
    if (booking.payment_status === "paid") return json({ error: "Booking is already paid" }, 400);
    if (!booking.total_amount || booking.total_amount <= 0) {
      return json({ error: "Invalid booking amount" }, 400);
    }

    const amountPaise = Math.round(Number(booking.total_amount) * 100);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${RZP_KEY}:${RZP_SECRET}`)}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: booking.booking_reference || booking.id,
        notes: { booking_id: booking.id, hotel_id: booking.hotel_id },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok || !order.id) {
      return json({ error: order?.error?.description || "Failed to create payment order" }, 502);
    }

    await supabase.from("hotel_bookings")
      .update({
        razorpay_order_id: order.id,
        payment_status: "pending",
        payment_method: "razorpay",
        payment_attempted_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return json({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: RZP_KEY,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
