// Canonical JAAGA booking retrieve.
//   GET/POST  { booking_id }  or  { guest_portal_token }
// For HyperGuest-connected bookings the external booking is retrieved,
// the complete response is stored, JAAGA is updated and the CANONICAL JAAGA
// booking is returned — the caller never sees raw HyperGuest JSON unless it
// explicitly asks for it with include_raw.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { hyperguestConfigured, hgCall, mapHgBookingResponse, HG } from "../_shared/channel/hyperguest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const bookingId = body.booking_id ?? url.searchParams.get("booking_id") ?? url.pathname.split("/").pop();
    const token = body.guest_portal_token ?? url.searchParams.get("guest_portal_token");
    const includeRaw = Boolean(body.include_raw ?? url.searchParams.get("include_raw"));

    if (!bookingId && !token) return json({ error: "booking_id or guest_portal_token required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = supabase.from("hotel_bookings").select("*");
    q = token ? q.eq("guest_portal_token", token) : q.eq("id", bookingId);
    const { data: booking } = await q.maybeSingle();
    if (!booking) return json({ error: "Booking not found" }, 404);

    /* -------- refresh from HyperGuest when channel-connected -------- */
    let channelError: unknown = null;
    let externalRaw: unknown = null;
    if (booking.channel === HG && booking.external_booking_id && hyperguestConfigured()) {
      const path = `${Deno.env.get("HYPERGUEST_BOOKING_PATH") ?? "/booking"}/${booking.external_booking_id}`;
      const res = await hgCall(supabase, {
        operation: "booking_retrieve", path, method: "GET",
        hotel_id: booking.hotel_id, booking_id: booking.id,
      });
      if (res.ok) {
        const mapped = mapHgBookingResponse(res.data);
        externalRaw = mapped.raw;
        if (mapped.status && mapped.status !== booking.external_status) {
          await supabase.from("hotel_bookings")
            .update({ external_status: mapped.status }).eq("id", booking.id);
          await supabase.from("booking_status_history").insert({
            booking_id: booking.id, status: mapped.status, source: HG, reason: "external sync",
          });
          booking.external_status = mapped.status;
        }
        for (const r of mapped.rooms) {
          if (!r.externalItemId) continue;
          await supabase.from("booking_rooms")
            .update({ status: r.status ?? undefined, final_price: r.price ?? undefined, final_currency: r.currency ?? undefined })
            .eq("booking_id", booking.id).eq("external_item_id", r.externalItemId);
        }
      } else {
        channelError = res.error;
      }
    }

    const [rooms, guests, requests, refs, taxes, fees, nightly, items, history, transactions, metadata, cancellations, modifications, financials] =
      await Promise.all([
        supabase.from("booking_rooms").select("*").eq("booking_id", booking.id),
        supabase.from("booking_guests").select("*").eq("booking_id", booking.id),
        supabase.from("booking_special_requests").select("*").eq("booking_id", booking.id),
        supabase.from("booking_references").select("*").eq("booking_id", booking.id),
        supabase.from("booking_taxes").select("*").eq("booking_id", booking.id),
        supabase.from("booking_fees").select("*").eq("booking_id", booking.id),
        supabase.from("booking_nightly_breakdown").select("*").eq("booking_id", booking.id).order("date"),
        supabase.from("hotel_booking_items").select("*").eq("booking_id", booking.id),
        supabase.from("booking_status_history").select("*").eq("booking_id", booking.id).order("created_at"),
        supabase.from("booking_transactions").select("*").eq("booking_id", booking.id).order("created_at"),
        supabase.from("booking_metadata").select("*").eq("booking_id", booking.id),
        supabase.from("booking_cancellations").select("*").eq("booking_id", booking.id),
        supabase.from("booking_modifications").select("*").eq("booking_id", booking.id),
        supabase.from("booking_financial_models").select("*, booking_financial_model_items(*, booking_financial_item_tags(*))").eq("booking_id", booking.id),
      ]);

    return json({
      booking,
      channel: booking.channel,
      external_booking_id: booking.external_booking_id,
      rooms: rooms.data ?? [],
      guests: guests.data ?? [],
      special_requests: requests.data ?? [],
      references: refs.data ?? [],
      taxes: taxes.data ?? [],
      fees: fees.data ?? [],
      nightly_breakdown: nightly.data ?? [],
      line_items: items.data ?? [],
      status_history: history.data ?? [],
      transactions: transactions.data ?? [],
      metadata: metadata.data ?? [],
      cancellations: cancellations.data ?? [],
      modifications: modifications.data ?? [],
      financial_models: financials.data ?? [],
      cancellation_policies: booking.cancellation_policy_snapshot ?? [],
      channel_error: channelError,
      raw: includeRaw ? externalRaw : undefined,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
