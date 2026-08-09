// Confirms a direct booking: recalculates the price server-side, validates
// availability, stores booking line items + price snapshot, issues the guest
// portal token and sends the confirmation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildServerQuote, saveBookingItems, bookingPriceColumns } from "../_shared/hotelQuote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomToken(len = 40) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      hotel_id, room_id, check_in, check_out,
      adults = 1, children = 0, num_rooms = 1, extra_beds = 0, meals = [],
      guest_name, guest_email, guest_phone, addons = [], promo_code,
      source = "direct", special_requests = null, user_id = null,
      idempotency_key = null,
    } = body;

    if (!hotel_id || !room_id || !check_in || !check_out || !guest_name || !guest_email) {
      return json({ error: "Missing fields" }, 400);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Duplicate-submission guard
    if (idempotency_key) {
      const { data: dupe } = await supabase.from("hotel_bookings")
        .select("id, guest_portal_token")
        .eq("booking_reference", idempotency_key).maybeSingle();
      if (dupe) return json({ booking: dupe, duplicate: true });
    }

    // Server-authoritative price + validation
    const q = await buildServerQuote(supabase, {
      hotel_id, room_id, check_in, check_out, adults, children,
      child_ages: body.child_ages, num_rooms, extra_beds, meals, addons, promo_code,
    });
    if (q.error || !q.result) return json({ error: q.error }, q.status || 400);
    const result = q.result;

    const token = randomToken(40);
    const { data: booking, error: bErr } = await supabase.from("hotel_bookings").insert({
      hotel_id, room_id,
      hotel_name: q.hotel?.name ?? null,
      hotel_address: [q.hotel?.address, q.hotel?.locality, q.hotel?.city].filter(Boolean).join(", "),
      room_type: q.room?.room_type ?? "Standard",
      check_in, check_out,
      num_guests: Number(adults) + Number(children),
      adults, children, num_rooms, extra_beds,
      guest_name, guest_email, guest_phone,
      user_id: user_id || null,
      special_requests,
      promo_code: promo_code || null,
      source,
      currency: "INR",
      guest_portal_token: token,
      status: "confirmed",
      payment_status: "pending",
      ...bookingPriceColumns(result, meals),
    }).select().single();
    if (bErr) return json({ error: bErr.message }, 400);

    // Line items (price snapshot per component)
    await saveBookingItems(supabase, booking.id, hotel_id, result);

    // Add-on rows for operational views
    const addonItems = result.lineItems.filter((li) => li.item_type === "addon");
    if (addonItems.length) {
      await supabase.from("hotel_booking_addons").insert(
        addonItems.map((a) => ({
          booking_id: booking.id,
          addon_id: (a.price_snapshot as any)?.addon_id ?? null,
          quantity: a.quantity, unit_price: a.unit_price, total_price: a.subtotal,
        })).filter((r) => r.addon_id),
      );
    }

    // Promo usage
    if (q.promo?.code) {
      const { data: p } = await supabase.from("hotel_promo_codes")
        .select("id,uses_count").eq("hotel_id", hotel_id).eq("code", q.promo.code).maybeSingle();
      if (p) await supabase.from("hotel_promo_codes").update({ uses_count: (p.uses_count || 0) + 1 }).eq("id", p.id);
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_ORIGIN") || "";
    const portal_url = `${origin}/stay/${token}`;

    try {
      await fetch(new URL("/functions/v1/send-booking-confirmation", Deno.env.get("SUPABASE_URL")!), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ booking_id: booking.id, guest_portal_url: portal_url }),
      });
    } catch { /* ignore */ }

    return json({ booking, portal_url, quote: result });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
