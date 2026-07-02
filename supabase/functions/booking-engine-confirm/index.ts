// Confirms a direct booking, issues guest portal token, sends confirmation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomToken(len = 40) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      hotel_id, room_id, check_in, check_out, guests = 1,
      guest_name, guest_email, guest_phone, addons = [], promo_code, source = "direct",
    } = body;
    if (!hotel_id || !room_id || !check_in || !check_out || !guest_name || !guest_email) {
      return json({ error: "Missing fields" }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Re-run quote (server-authoritative)
    const quoteRes = await fetch(new URL("/functions/v1/booking-engine-quote", Deno.env.get("SUPABASE_URL")!), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ hotel_id, room_id, check_in, check_out, guests, addons, promo_code }),
    });
    const quote = await quoteRes.json();
    if (quote.error) return json({ error: quote.error }, 400);

    const token = randomToken(40);
    const { data: booking, error: bErr } = await supabase.from("hotel_bookings").insert({
      hotel_id, room_id,
      check_in_date: check_in, check_out_date: check_out,
      number_of_guests: guests,
      guest_name, guest_email, guest_phone,
      total_amount: quote.total,
      addon_total: quote.addon_total,
      promo_code: promo_code || null,
      source,
      guest_portal_token: token,
      status: "confirmed",
    }).select().single();
    if (bErr) return json({ error: bErr.message }, 400);

    // Insert booking add-ons
    if (quote.addons?.length) {
      await supabase.from("hotel_booking_addons").insert(
        quote.addons.filter((a: any) => a.quantity > 0).map((a: any) => ({
          booking_id: booking.id, addon_id: a.addon_id, quantity: a.quantity,
          unit_price: a.unit_price, total_price: a.total_price,
        })),
      );
    }

    // Increment promo usage
    if (quote.promo?.code) {
      await supabase.rpc("increment_promo_use", { _hotel: hotel_id, _code: quote.promo.code }).catch(async () => {
        const { data: p } = await supabase.from("hotel_promo_codes").select("id,uses_count").eq("hotel_id", hotel_id).eq("code", quote.promo.code).maybeSingle();
        if (p) await supabase.from("hotel_promo_codes").update({ uses_count: (p.uses_count || 0) + 1 }).eq("id", p.id);
      });
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_ORIGIN") || "";
    const portal_url = `${origin}/stay/${token}`;

    // Best-effort confirmation via existing edge function
    try {
      await fetch(new URL("/functions/v1/send-booking-confirmation", Deno.env.get("SUPABASE_URL")!), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ booking_id: booking.id, guest_portal_url: portal_url }),
      });
    } catch { /* ignore */ }

    return json({ booking, portal_url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
