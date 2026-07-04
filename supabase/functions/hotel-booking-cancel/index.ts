// Cancels a hotel booking with policy-based refund via Razorpay.
// Rules (simple defaults, tune per hotel later):
//   • > 72h before check-in → 100% refund
//   • 24-72h before check-in → 50% refund
//   • < 24h before check-in or after check-in → 0% refund
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function refundPct(checkIn: string): number {
  const hrs = (+new Date(checkIn) - Date.now()) / 36e5;
  if (hrs >= 72) return 1;
  if (hrs >= 24) return 0.5;
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { booking_id, reason, cancelled_by } = await req.json();
    if (!booking_id) return json({ error: "booking_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: b, error } = await supabase.from("hotel_bookings")
      .select("*").eq("id", booking_id).maybeSingle();
    if (error || !b) return json({ error: "Booking not found" }, 404);
    if (b.status === "cancelled") return json({ error: "Already cancelled" }, 400);
    if (b.status === "checked_out") return json({ error: "Cannot cancel a completed stay" }, 400);

    const pct = refundPct(b.check_in);
    const refundAmt = Math.round(Number(b.total_amount || 0) * pct);
    let refundId: string | null = null;

    // Attempt refund only if paid via Razorpay
    if (refundAmt > 0 && b.payment_status === "paid" && b.razorpay_payment_id) {
      const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
      const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (RZP_KEY && RZP_SECRET) {
        const res = await fetch(`https://api.razorpay.com/v1/payments/${b.razorpay_payment_id}/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${RZP_KEY}:${RZP_SECRET}`)}`,
          },
          body: JSON.stringify({
            amount: refundAmt * 100,
            notes: { booking_id, reason: reason || "guest_cancel" },
          }),
        });
        const rr = await res.json();
        if (res.ok && rr.id) {
          refundId = rr.id;
        } else {
          console.error("Razorpay refund failed", rr);
          // proceed with cancellation but flag refund pending
        }
      }
    }

    const paymentStatus = refundAmt <= 0
      ? "paid"
      : refundId ? "refunded" : "refund_pending";

    const { data: updated, error: uErr } = await supabase.from("hotel_bookings")
      .update({
        status: "cancelled",
        payment_status: paymentStatus,
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelled_by || null,
        refunded_amount: refundAmt,
        refunded_at: refundId ? new Date().toISOString() : null,
        razorpay_refund_id: refundId,
      })
      .eq("id", booking_id)
      .select().single();

    if (uErr) return json({ error: uErr.message }, 500);

    return json({
      success: true,
      booking: updated,
      refund: { amount: refundAmt, percent: Math.round(pct * 100), id: refundId },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
