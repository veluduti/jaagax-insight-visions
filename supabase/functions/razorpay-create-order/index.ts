// Creates a pending hotel booking + a Razorpay order for it.
// The final amount is ALWAYS recalculated server-side from the hotel's own
// room rates, meal configuration, extra-bed rules, add-ons and GST settings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildServerQuote, saveBookingItems, bookingPriceColumns,
  buildMultiQuote, saveMultiBookingItems, multiBookingPriceColumns,
} from "../_shared/hotelQuote.ts";

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
      adults = 1, children = 0, num_rooms = 1, extra_beds = 0, meals = [],
      guest_name, guest_email, guest_phone,
      special_requests, addons = [], promo_code, user_id,
      booked_by_agent_id = null,
    } = body;

    const groups = Array.isArray(body.groups) ? body.groups : [];
    const isMulti = groups.length > 0;

    if (!hotel_id || !check_in || !check_out || !guest_name || !guest_email || !guest_phone
      || (!isMulti && !room_id)) {
      return json({ error: "Missing required fields" }, 400);
    }

    const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RZP_KEY || !RZP_SECRET) return json({ error: "Payment gateway not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let resolvedAgentId: string | null = booked_by_agent_id;
    if (!resolvedAgentId && user_id) {
      const { data: agentRow } = await supabase
        .from("agents").select("id").eq("user_id", user_id).maybeSingle();
      if (agentRow?.id) resolvedAgentId = agentRow.id as string;
    }

    /* ---------------- MULTI-ROOM (combination) booking ---------------- */
    if (isMulti) {
      const m = await buildMultiQuote(supabase, { hotel_id, check_in, check_out, groups });
      if (m.error || !m.totals || !m.groups) return json({ error: m.error }, m.status || 400);

      const primary = m.groups[0];
      const grandTotal = m.totals.grandTotal;

      const { data: booking, error: mErr } = await supabase.from("hotel_bookings").insert({
        hotel_id,
        room_id: primary.group.room_id,
        user_id: user_id || null,
        booked_by_agent_id: resolvedAgentId,
        guest_name, guest_email, guest_phone,
        check_in, check_out,
        room_type: m.groups.map((g: any) => `${g.room?.room_type} ×${g.group.quantity}`).join(" + "),
        num_guests: m.totals.adults + m.totals.children,
        adults: m.totals.adults,
        children: m.totals.children,
        num_rooms: m.totals.totalRooms,
        extra_beds: groups.reduce((s: number, g: any) => s + (Number(g.extra_beds) || 0), 0),
        status: "pending",
        payment_status: "pending",
        payment_method: "razorpay",
        special_requests: special_requests || null,
        booking_type: "hotel_only",
        source: resolvedAgentId ? "agent" : "direct",
        currency: "INR",
        hotel_name: m.hotel?.name ?? null,
        hotel_address: [m.hotel?.address, m.hotel?.locality, m.hotel?.city].filter(Boolean).join(", "),
        payment_attempted_at: new Date().toISOString(),
        ...multiBookingPriceColumns(m.totals, m.groups),
      }).select().single();

      if (mErr) return json({ error: mErr.message }, 400);
      await saveMultiBookingItems(supabase, booking.id, hotel_id, m.groups);

      const amt = Math.round(grandTotal * 100);
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${RZP_KEY}:${RZP_SECRET}`)}`,
        },
        body: JSON.stringify({
          amount: amt, currency: "INR",
          receipt: booking.booking_reference || booking.id,
          notes: { booking_id: booking.id, hotel_id, check_in, check_out, multi_room: "true" },
        }),
      });
      const ord = await res.json();
      if (!res.ok || !ord.id) {
        await supabase.from("hotel_bookings").update({
          status: "cancelled", payment_status: "failed",
          cancellation_reason: "Razorpay order creation failed",
        }).eq("id", booking.id);
        return json({ error: ord?.error?.description || "Failed to create payment order" }, 502);
      }
      await supabase.from("hotel_bookings").update({ razorpay_order_id: ord.id }).eq("id", booking.id);

      return json({
        booking_id: booking.id,
        booking_reference: booking.booking_reference ?? null,
        order_id: ord.id,
        amount: amt,
        currency: "INR",
        key_id: RZP_KEY,
        multi_room: true,
        breakdown: { ...m.totals, total: grandTotal },
        hotel: m.hotel ?? null,
      });
    }


    // Prevent duplicate pending payment attempts for the same selection.
    const { data: existingPending } = await supabase.from("hotel_bookings")
      .select("id, razorpay_order_id, total_amount, booking_reference")
      .eq("hotel_id", hotel_id).eq("room_id", room_id)
      .eq("check_in", check_in).eq("check_out", check_out)
      .eq("guest_email", guest_email).eq("payment_status", "pending")
      .gte("payment_attempted_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .maybeSingle();

    // Server-authoritative quote + full validation (availability, occupancy,
    // extra beds, meals, stop-sell, min nights).
    const q = await buildServerQuote(supabase, {
      hotel_id, room_id, check_in, check_out, adults, children,
      child_ages: body.child_ages, num_rooms, extra_beds, meals, addons, promo_code,
    });
    if (q.error || !q.result) return json({ error: q.error }, q.status || 400);
    const result = q.result;
    const grandTotal = result.grandTotal;

    let bookingId: string;
    let bookingRef: string | null = null;

    if (existingPending?.id && Number(existingPending.total_amount) === grandTotal && existingPending.razorpay_order_id) {
      // Reuse the in-flight order instead of creating a duplicate booking.
      return json({
        booking_id: existingPending.id,
        booking_reference: existingPending.booking_reference,
        order_id: existingPending.razorpay_order_id,
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        key_id: RZP_KEY,
        breakdown: breakdownOf(result, num_rooms),
        hotel: q.hotel ?? null,
        reused: true,
      });
    }

    const { data: booking, error: bErr } = await supabase.from("hotel_bookings").insert({
      hotel_id, room_id,
      user_id: user_id || null,
      booked_by_agent_id: resolvedAgentId,
      guest_name, guest_email, guest_phone,
      check_in, check_out,
      room_type: q.room?.room_type ?? "Standard",
      num_guests: Number(adults) + Number(children),
      adults, children, num_rooms, extra_beds,
      status: "pending",
      payment_status: "pending",
      payment_method: "razorpay",
      special_requests: special_requests || null,
      booking_type: "hotel_only",
      source: resolvedAgentId ? "agent" : "direct",
      currency: "INR",
      hotel_name: q.hotel?.name ?? null,
      hotel_address: [q.hotel?.address, q.hotel?.locality, q.hotel?.city].filter(Boolean).join(", "),
      promo_code: promo_code || null,
      payment_attempted_at: new Date().toISOString(),
      ...bookingPriceColumns(result, meals),
    }).select().single();

    if (bErr) return json({ error: bErr.message }, 400);
    bookingId = booking.id;
    bookingRef = booking.booking_reference ?? null;

    // Persist every billing component with its price snapshot.
    await saveBookingItems(supabase, bookingId, hotel_id, result);

    const addonItems = result.lineItems.filter((li) => li.item_type === "addon");
    if (addonItems.length) {
      const rows = addonItems.map((a) => ({
        booking_id: bookingId,
        addon_id: (a.price_snapshot as any)?.addon_id ?? null,
        quantity: a.quantity, unit_price: a.unit_price, total_price: a.subtotal,
      })).filter((r) => r.addon_id);
      if (rows.length) await supabase.from("hotel_booking_addons").insert(rows);
    }

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
        receipt: bookingRef || bookingId,
        notes: { booking_id: bookingId, hotel_id, room_id, check_in, check_out },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok || !order.id) {
      await supabase.from("hotel_bookings").update({
        status: "cancelled",
        payment_status: "failed",
        cancellation_reason: "Razorpay order creation failed",
      }).eq("id", bookingId);
      return json({ error: order?.error?.description || "Failed to create payment order" }, 502);
    }

    await supabase.from("hotel_bookings")
      .update({ razorpay_order_id: order.id })
      .eq("id", bookingId);

    return json({
      booking_id: bookingId,
      booking_reference: bookingRef,
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: RZP_KEY,
      breakdown: breakdownOf(result, num_rooms),
      hotel: q.hotel ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function breakdownOf(result: any, num_rooms: number) {
  return {
    nights: result.nights,
    num_rooms,
    per_night: result.perNight,
    room_subtotal: result.roomCharges,
    meal_total: result.mealTotal,
    meals: result.mealBreakdown,
    extra_bed_total: result.extraBedTotal,
    addon_subtotal: result.addonTotal,
    discount: result.discount,
    taxable_subtotal: result.taxableSubtotal,
    gst_rate: result.gstRate,
    taxes: result.taxAmount,
    total: result.grandTotal,
    line_items: result.lineItems,
  };
}
