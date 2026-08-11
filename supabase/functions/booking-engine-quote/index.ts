// Public quote endpoint for the direct booking engine.
// Server-authoritative: room rates (rate calendar > base price) + meals +
// extra beds + add-ons + promo − discount + GST.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildServerQuote, buildMultiQuote } from "../_shared/hotelQuote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Multi-room (combination) quote
    if (Array.isArray(body.groups) && body.groups.length) {
      const m = await buildMultiQuote(supabase, body);
      if (m.error || !m.totals) return json({ error: m.error }, m.status || 400);
      return json({
        multi_room: true,
        nights: m.totals.nights,
        room_total: m.totals.roomCharges,
        meal_total: m.totals.mealTotal,
        extra_bed_total: m.totals.extraBedTotal,
        discount: m.totals.discount,
        taxable_subtotal: m.totals.taxableSubtotal,
        gst_rate: m.totals.gstRate,
        tax_amount: m.totals.taxAmount,
        grand_total: m.totals.grandTotal,
        total: m.totals.grandTotal,
        groups: (m.groups || []).map((g) => ({
          room_id: g.group.room_id,
          room_type: g.room?.room_type ?? null,
          quantity: g.group.quantity,
          adults: g.group.adults,
          children: g.group.children,
          per_night: g.result.perNight,
          total: g.result.grandTotal,
          line_items: g.result.lineItems,
        })),
      });
    }

    const q = await buildServerQuote(supabase, body);

    if (q.error || !q.result) return json({ error: q.error }, q.status || 400);
    const r = q.result;

    return json({
      // canonical fields
      nights: r.nights,
      nightly: r.nightly,
      per_night: r.perNight,
      perNight: r.perNight,
      room_total: r.roomCharges,
      room_charges: r.roomCharges,
      meal_total: r.mealTotal,
      meals: r.mealBreakdown,
      extra_bed_total: r.extraBedTotal,
      addon_total: r.addonTotal,
      discount: r.discount,
      promo: q.promo,
      taxable_subtotal: r.taxableSubtotal,
      gst_rate: r.gstRate,
      tax_amount: r.taxAmount,
      grand_total: r.grandTotal,
      total: r.grandTotal,
      line_items: r.lineItems,
      available: q.available ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
