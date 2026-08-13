// Canonical JAAGA booking cancellation.
//
//  • HyperGuest-connected bookings : the official HyperGuest cancellation
//    contract is called through the channel adapter. The complete request and
//    response are stored. JAAGA never fakes an external cancellation.
//  • Direct JAAGA bookings : the cancellation policy SNAPSHOTTED at booking
//    time decides the penalty, so later rate-plan edits never change history.
//
// Refunds continue to run through Razorpay exactly as before.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { penaltyPercentFromPolicies, directCancellationPolicies, type CanonicalCancellationPolicy } from "../_shared/canonical.ts";
import { hyperguestConfigured, hgCall, HG } from "../_shared/channel/hyperguest.ts";
import { nightsBetween } from "../_shared/hotelPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
    if (b.status === "cancelled") {
      const { data: existing } = await supabase.from("booking_cancellations")
        .select("*").eq("booking_id", booking_id).maybeSingle();
      return json({ success: true, already_cancelled: true, idempotent: true, booking: b, cancellation: existing });
    }
    if (b.status === "checked_out") return json({ error: "Cannot cancel a completed stay" }, 400);

    const total = Number(b.total_amount || 0);
    const nights = Math.max(1, nightsBetween(b.check_in, b.check_out));

    /* ------------- policy snapshot (never re-read live rate plan) ------------- */
    const snapshot: CanonicalCancellationPolicy[] = Array.isArray(b.cancellation_policy_snapshot) && b.cancellation_policy_snapshot.length
      ? b.cancellation_policy_snapshot
      : directCancellationPolicies([], null);
    const penalty = penaltyPercentFromPolicies(snapshot, b.check_in, nights, total);

    /* --------------------- external cancellation --------------------- */
    let externalCancellationId: string | null = null;
    let externalStatus: string | null = null;
    let channelError: any = null;
    let rawRequest: unknown = null;
    let rawResponse: unknown = null;

    if (b.channel === HG && b.external_booking_id) {
      if (!hyperguestConfigured()) {
        return json({ error: "HyperGuest is not configured — cannot cancel a channel booking", channel: HG }, 503);
      }
      const template = Deno.env.get("HYPERGUEST_CANCEL_PATH") ?? "/booking/{bookingId}/cancel";
      const path = template.replace("{bookingId}", encodeURIComponent(b.external_booking_id));
      rawRequest = { bookingId: b.external_booking_id, reason: reason ?? "guest_cancel" };
      const res = await hgCall(supabase, {
        operation: "booking_cancel", path, body: rawRequest,
        hotel_id: b.hotel_id, booking_id: b.id,
      });
      rawResponse = res.data;
      if (!res.ok) {
        channelError = res.error;
        await supabase.from("booking_cancellations").insert({
          booking_id: b.id, channel: HG, status: "failed", reason: reason ?? null,
          cancelled_by: cancelled_by ?? null, policy_snapshot: snapshot,
          error_message: res.error?.error ?? "external cancellation failed",
          raw_request: rawRequest, raw_response: res.error?.raw_response ?? null,
        });
        await supabase.from("booking_status_history").insert({
          booking_id: b.id, status: "cancellation_pending", source: HG,
          reason: res.error?.external_message ?? "external cancellation failed",
        });
        await supabase.from("hotel_bookings").update({ status: "cancellation_pending" }).eq("id", b.id);
        return json({ error: res.error?.error ?? "Cancellation failed at the channel", channel_error: res.error }, res.status || 502);
      }
      const d: any = res.data ?? {};
      externalCancellationId = d.cancellationId ?? d.id ?? null;
      externalStatus = d.status ?? "cancelled";
    }

    /* --------------------------- refund --------------------------- */
    const refundAmt = Math.max(0, Math.round(total - penalty.amount));
    let refundId: string | null = null;
    if (refundAmt > 0 && b.payment_status === "paid" && b.razorpay_payment_id) {
      const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
      const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (RZP_KEY && RZP_SECRET) {
        const res = await fetch(`https://api.razorpay.com/v1/payments/${b.razorpay_payment_id}/refund`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${RZP_KEY}:${RZP_SECRET}`)}` },
          body: JSON.stringify({ amount: refundAmt * 100, notes: { booking_id, reason: reason || "guest_cancel" } }),
        });
        const rr = await res.json();
        if (res.ok && rr.id) refundId = rr.id;
        else console.error("Razorpay refund failed", rr);
      }
    }

    const paymentStatus = refundAmt <= 0 ? (b.payment_status ?? "pending") : refundId ? "refunded" : "refund_pending";

    const { data: updated, error: uErr } = await supabase.from("hotel_bookings")
      .update({
        status: "cancelled",
        external_status: externalStatus ?? b.external_status,
        payment_status: paymentStatus,
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelled_by || null,
        refunded_amount: refundAmt,
        refunded_at: refundId ? new Date().toISOString() : null,
        razorpay_refund_id: refundId,
      })
      .eq("id", booking_id).select().single();
    if (uErr) return json({ error: uErr.message }, 500);

    const { data: cancellation } = await supabase.from("booking_cancellations").insert({
      booking_id: b.id,
      external_cancellation_id: externalCancellationId,
      channel: b.channel ?? "jaaga",
      status: "completed",
      reason: reason ?? null,
      cancelled_by: cancelled_by ?? null,
      policy_snapshot: snapshot,
      penalty_amount: penalty.amount,
      refund_amount: refundAmt,
      currency: b.currency ?? "INR",
      raw_request: rawRequest, raw_response: rawResponse,
    }).select().single();

    await supabase.from("booking_status_history").insert({
      booking_id: b.id, status: "cancelled",
      source: b.channel === HG ? HG : "jaaga", reason: reason ?? null,
    });
    if (refundId) {
      await supabase.from("booking_transactions").insert({
        booking_id: b.id, provider: "razorpay", external_transaction_id: refundId,
        transaction_type: "refund", status: "completed", amount: refundAmt, currency: b.currency ?? "INR",
      });
    }
    await supabase.from("booking_rooms").update({ status: "cancelled" }).eq("booking_id", b.id);

    return json({
      success: true,
      booking: updated,
      cancellation,
      policy: penalty.matched,
      penalty: { amount: penalty.amount, percent: penalty.percent },
      refund: { amount: refundAmt, percent: total ? Math.round((refundAmt / total) * 100) : 0, id: refundId },
      channel: b.channel ?? "jaaga",
      channel_error: channelError,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
