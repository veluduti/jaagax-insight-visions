// Creates a pending hotel booking + a Razorpay order for it.
// Client then opens Razorpay Checkout with the returned order_id.
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
    const body = await req.json();
    const {
      hotel_id, room_id, check_in, check_out,
      adults = 1, children = 0, num_rooms = 1,
      guest_name, guest_email, guest_phone,
      special_requests, addons = [], promo_code, user_id,
      booked_by_agent_id = null,
    } = body;

    if (!hotel_id || !room_id || !check_in || !check_out || !guest_name || !guest_email || !guest_phone) {
      return json({ error: "Missing required fields" }, 400);
    }

    const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RZP_KEY || !RZP_SECRET) return json({ error: "Payment gateway not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Server-authoritative quote
    const quoteRes = await fetch(
      new URL("/functions/v1/booking-engine-quote", Deno.env.get("SUPABASE_URL")!),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          hotel_id, room_id, check_in, check_out,
          guests: adults + children, addons, promo_code,
        }),
      },
    );
    const quote = await quoteRes.json();
    if (quote.error) return json({ error: quote.error }, 400);

    // Verify availability
    const { data: avail } = await supabase.rpc("check_room_availability", {
      _room_id: room_id, _check_in: check_in, _check_out: check_out,
    });
    if ((avail ?? 0) < num_rooms) {
      return json({ error: "Not enough rooms available for the selected dates" }, 409);
    }

    // Multiply per-room totals by num_rooms
    const nights = Math.max(1, Math.round(
      (+new Date(check_out) - +new Date(check_in)) / 86400000,
    ));
    const roomSubtotal = Number(quote.total || 0) * num_rooms;
    const addonSubtotal = Number(quote.addon_total || 0);
    const gstRate = (Number(quote.perNight ?? quote.per_night ?? 0)) < 7500 ? 0.12 : 0.18;
    // Quote already includes taxes for a single room? booking-engine-quote returns total pre-tax.
    // We conservatively add GST on the room portion here.
    const taxes = Math.round(roomSubtotal * gstRate);
    const grandTotal = roomSubtotal + addonSubtotal + taxes;

    // Hotel context
    const { data: hotel } = await supabase
      .from("partner_hotels")
      .select("name, address, locality, city")
      .eq("id", hotel_id).maybeSingle();

    const { data: room } = await supabase
      .from("hotel_rooms").select("room_type").eq("id", room_id).maybeSingle();

    // Insert PENDING booking
    const { data: booking, error: bErr } = await supabase.from("hotel_bookings").insert({
      hotel_id,
      user_id: user_id || null,
      booked_by_agent_id: booked_by_agent_id || null,
      guest_name, guest_email, guest_phone,
      check_in, check_out,
      room_type: room?.room_type ?? "Standard",
      num_guests: adults + children,
      num_rooms,
      total_amount: grandTotal,
      addon_total: addonSubtotal,
      status: "pending",
      payment_status: "pending",
      payment_method: "razorpay",
      special_requests: special_requests || null,
      booking_type: "hotel_only",
      source: booked_by_agent_id ? "agent" : "direct",
      currency: "INR",
      hotel_name: hotel?.name ?? null,
      hotel_address: [hotel?.address, hotel?.locality, hotel?.city].filter(Boolean).join(", "),
      promo_code: promo_code || null,
      payment_attempted_at: new Date().toISOString(),
    }).select().single();

    if (bErr) return json({ error: bErr.message }, 400);

    // Persist add-ons (best effort)
    if (Array.isArray(quote.addons) && quote.addons.length) {
      await supabase.from("hotel_booking_addons").insert(
        quote.addons.filter((a: any) => a.quantity > 0).map((a: any) => ({
          booking_id: booking.id, addon_id: a.addon_id, quantity: a.quantity,
          unit_price: a.unit_price, total_price: a.total_price,
        })),
      );
    }

    // Create Razorpay order
    const amountPaise = Math.round(grandTotal * 100);
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
        notes: {
          booking_id: booking.id,
          hotel_id, room_id, check_in, check_out,
        },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok || !order.id) {
      await supabase.from("hotel_bookings").update({
        status: "cancelled",
        payment_status: "failed",
        cancellation_reason: "Razorpay order creation failed",
      }).eq("id", booking.id);
      return json({ error: order?.error?.description || "Failed to create payment order" }, 502);
    }

    await supabase.from("hotel_bookings")
      .update({ razorpay_order_id: order.id })
      .eq("id", booking.id);

    return json({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: RZP_KEY,
      breakdown: {
        room_subtotal: roomSubtotal,
        addon_subtotal: addonSubtotal,
        taxes,
        total: grandTotal,
        nights,
        num_rooms,
      },
      hotel: hotel ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
