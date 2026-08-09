// Public quote endpoint for the direct booking engine.
// Server-authoritative: room rates (rate calendar > base price) + meals +
// extra beds + add-ons + promo − discount + GST.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildServerQuote } from "../_shared/hotelQuote.ts";

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
