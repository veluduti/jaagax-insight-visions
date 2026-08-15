// Confirms a booking against the JAAGA canonical model.
//
//  • Direct JAAGA hotels : price + availability are recalculated server-side.
//  • HyperGuest hotels   : JAAGA revalidates, then calls the HyperGuest
//                          booking/create contract through the channel adapter.
//
// Both paths persist the SAME canonical booking graph (rooms, guests, special
// requests, references, taxes, fees, nightly breakdown, financial model,
// metadata, status history) and both are idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildServerQuote, buildMultiQuote, saveBookingItems, saveMultiBookingItems, bookingPriceColumns } from "../_shared/hotelQuote.ts";
import { persistBookingGraph, jaagaFinancialItems, type PersistRoomInput } from "../_shared/bookingPersistence.ts";
import { directCancellationPolicies } from "../_shared/canonical.ts";
import { hyperguestConfigured, hgCall, buildHgBookingCreatePayload, mapHgBookingResponse, HG } from "../_shared/channel/hyperguest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function randomToken(len = 40) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

const splitName = (full?: string | null) => {
  const parts = String(full ?? "").trim().split(/\s+/);
  return { first: parts[0] ?? null, last: parts.slice(1).join(" ") || null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      hotel_id, room_id, rate_plan_id = null, check_in, check_out,
      adults = 1, children = 0, infants = 0, num_rooms = 1, extra_beds = 0, meals = [],
      guest_name, guest_email, guest_phone, addons = [], promo_code,
      source = "direct", special_requests = null, user_id = null,
      idempotency_key = null, agency_reference = null,
      lead_guest = null, rooms: roomInputs = null, groups = null,
      meta = [], payment_details = null,
      // Payment-driven flows create the booking BEFORE the money is captured:
      // they pass status "pending" and confirm it in razorpay-verify-payment.
      booking_status = "confirmed", payment_status = "pending",
      payment_method = null, booking_type = "hotel_only",
      booked_by_agent_id = null, send_email = null,
    } = body;


    if (!hotel_id || !check_in || !check_out || !guest_name || !guest_email) {
      return json({ error: "Missing fields" }, 400);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /* ----------------------- idempotency ----------------------- */
    if (idempotency_key) {
      const { data: dupe } = await supabase.from("hotel_bookings")
        .select("id, guest_portal_token, status, booking_reference, external_booking_id")
        .or(`idempotency_key.eq.${idempotency_key},booking_reference.eq.${idempotency_key}`)
        .maybeSingle();
      if (dupe) return json({ booking: dupe, duplicate: true, idempotent: true });
    }

    const { data: hotel } = await supabase.from("partner_hotels").select("*").eq("id", hotel_id).maybeSingle();
    if (!hotel) return json({ error: "Hotel not found" }, 404);

    const { data: connection } = await supabase.from("hotel_channel_connections")
      .select("*").eq("hotel_id", hotel_id).eq("channel", HG).eq("is_active", true).maybeSingle();
    const isHyperGuest = Boolean(connection?.channel_property_id) && hyperguestConfigured();

    const multi = Array.isArray(groups) && groups.length > 0;

    /* ------------------- server-authoritative quote ------------------- */
    let quoteRooms: PersistRoomInput[] = [];
    let totals: any;
    let singleQuote: any = null;
    let multiQuote: any = null;

    if (multi) {
      multiQuote = await buildMultiQuote(supabase, { hotel_id, check_in, check_out, groups, addons });
      if (multiQuote.error || !multiQuote.totals) return json({ error: multiQuote.error }, multiQuote.status || 400);
      totals = multiQuote.totals;
    } else {
      if (!room_id) return json({ error: "room_id required" }, 400);
      singleQuote = await buildServerQuote(supabase, {
        hotel_id, room_id, check_in, check_out, adults, children,
        child_ages: body.child_ages, num_rooms, extra_beds, meals, addons, promo_code,
      });
      if (singleQuote.error || !singleQuote.result) return json({ error: singleQuote.error }, singleQuote.status || 400);
      totals = singleQuote.result;
    }

    /* ------------------- cancellation policy snapshot ------------------- */
    const planIds = [rate_plan_id, ...(multi ? groups.map((g: any) => g.rate_plan_id) : [])].filter(Boolean);
    let policyRows: any[] = [];
    if (planIds.length) {
      const { data } = await supabase.from("rate_plan_cancellation_policies").select("*").in("rate_plan_id", planIds);
      policyRows = data || [];
    }
    const policySnapshot = directCancellationPolicies(policyRows, null);

    /* ------------------------- guest model ------------------------- */
    const nameParts = splitName(guest_name);
    const leadGuest = lead_guest ?? {
      title: null, firstName: nameParts.first, lastName: nameParts.last,
      email: guest_email, phone: guest_phone ?? null, guestType: "adult",
    };

    /* --------------- HyperGuest booking create (if connected) --------------- */
    let externalBookingId: string | null = null;
    let externalStatus: string | null = null;
    let externalRooms: any[] = [];
    let externalRaw: unknown = null;

    if (isHyperGuest) {
      const hgRooms = (roomInputs && roomInputs.length ? roomInputs : (multi ? groups : [{
        room_id, rate_plan_id, quantity: num_rooms, adults, children, infants,
        expected_price: totals.grandTotal, expected_currency: "INR",
        special_requests: special_requests ? [special_requests] : [],
      }]));

      // Resolve external codes for each room from the JAAGA mapping tables.
      const resolved = [];
      for (const r of hgRooms) {
        const { data: roomRow } = r.room_id
          ? await supabase.from("hotel_rooms").select("*").eq("id", r.room_id).maybeSingle()
          : { data: null };
        const { data: planRow } = r.rate_plan_id
          ? await supabase.from("hotel_rate_plans").select("*").eq("id", r.rate_plan_id).maybeSingle()
          : { data: null };
        resolved.push({
          ...r,
          room_code: r.room_code ?? roomRow?.hyperguest_room_type_code ?? roomRow?.room_code ?? null,
          rate_code: r.rate_code ?? planRow?.hyperguest_rate_plan_code ?? planRow?.rate_plan_code ?? null,
          expected_price: r.expected_price ?? totals.grandTotal,
          expected_currency: r.expected_currency ?? "INR",
          guests: r.guests ?? [leadGuest],
          special_requests: r.special_requests ?? (special_requests ? [special_requests] : []),
        });
      }

      const payload = buildHgBookingCreatePayload({
        hotel_id, check_in, check_out, lead_guest: leadGuest, rooms: resolved,
        agency_reference: agency_reference ?? idempotency_key, idempotency_key,
        payment_details, meta,
      } as any, connection!.channel_property_id!);

      const res = await hgCall(supabase, {
        operation: "booking_create",
        path: Deno.env.get("HYPERGUEST_BOOKING_PATH") ?? "/booking",
        body: payload,
        hotel_id,
      });
      if (!res.ok) return json({ error: res.error?.error ?? "HyperGuest booking failed", channel_error: res.error }, res.status || 502);

      const mapped = mapHgBookingResponse(res.data);
      externalBookingId = mapped.externalBookingId;
      externalStatus = mapped.status;
      externalRooms = mapped.rooms;
      externalRaw = mapped.raw;
    }

    /* ------------------------ JAAGA booking row ------------------------ */
    const token = randomToken(40);
    const priceCols = multi
      ? {
        room_charges: totals.roomCharges, meal_total: totals.mealTotal,
        extra_bed_total: totals.extraBedTotal, addon_total: totals.addonTotal,
        discount_total: totals.discount, taxable_subtotal: totals.taxableSubtotal,
        gst_rate: totals.gstRate, tax_amount: totals.taxAmount, total_amount: totals.grandTotal,
        price_snapshot: { computed_at: new Date().toISOString(), groups: multiQuote.groups?.map((g: any) => ({ room: g.room?.room_type, result: g.result })) },
      }
      : bookingPriceColumns(singleQuote.result, meals);

    const firstRoom = multi ? multiQuote.groups?.[0]?.room : singleQuote.room;

    const { data: booking, error: bErr } = await supabase.from("hotel_bookings").insert({
      hotel_id,
      room_id: multi ? (multiQuote.groups?.[0]?.group?.room_id ?? null) : room_id,
      rate_plan_id: rate_plan_id ?? null,
      hotel_name: hotel.name ?? null,
      hotel_address: [hotel.address, hotel.locality, hotel.city].filter(Boolean).join(", "),
      room_type: firstRoom?.room_type ?? "Standard",
      check_in, check_out,
      num_guests: Number(totals.adults ?? adults) + Number(totals.children ?? children),
      adults: totals.adults ?? adults,
      children: totals.children ?? children,
      infants,
      child_ages: body.child_ages ?? null,
      num_rooms: multi ? totals.totalRooms : num_rooms,
      extra_beds,
      guest_name, guest_email, guest_phone,
      lead_guest: leadGuest,
      user_id: user_id || null,
      booked_by_agent_id: booked_by_agent_id || null,
      booking_type,
      special_requests,
      promo_code: promo_code || null,
      source,
      channel: isHyperGuest ? HG : "jaaga",
      external_booking_id: externalBookingId,
      external_status: externalStatus,
      agency_reference: agency_reference ?? null,
      idempotency_key: idempotency_key ?? null,
      currency: "INR",
      guest_portal_token: token,
      status: booking_status,
      payment_status,
      payment_method,
      payment_attempted_at: payment_method ? new Date().toISOString() : null,

      taxes_total: totals.taxAmount ?? 0,
      cancellation_policy_snapshot: policySnapshot,
      ...priceCols,
    }).select().single();
    if (bErr) return json({ error: bErr.message }, 400);

    /* ---------------------- canonical booking graph ---------------------- */
    const persistRooms: PersistRoomInput[] = multi
      ? multiQuote.groups.map((g: any, i: number) => ({
        room_id: g.group.room_id,
        rate_plan_id: g.group.rate_plan_id ?? null,
        external_item_id: externalRooms[i]?.externalItemId ?? null,
        external_room_id: externalRooms[i]?.externalRoomId ?? null,
        external_rate_plan_id: externalRooms[i]?.externalRatePlanId ?? null,
        room_name: g.room?.room_type ?? null,
        room_code: g.room?.hyperguest_room_type_code ?? g.room?.room_code ?? null,
        board: g.group.board ?? null,
        quantity: g.group.quantity, adults: g.group.adults, children: g.group.children,
        infants: g.group.infants ?? 0, child_ages: g.group.child_ages ?? null,
        extra_beds: g.group.extra_beds ?? 0, meals: g.group.meals ?? null,
        expected_price: g.result.grandTotal, expected_currency: "INR",
        final_price: g.result.grandTotal, final_currency: "INR",
        cancellation_policy_snapshot: policySnapshot,
        guests: g.group.guests ?? [], special_requests: g.group.special_requests ?? [],
        nightly: (g.result.nightly ?? []).map((x: any) => ({
          date: x.date, sell: { price: x.price, currency: "INR" }, net: { price: x.price, currency: "INR" },
        })),
        raw: { group: g.group },
      }))
      : [{
        room_id,
        rate_plan_id: rate_plan_id ?? null,
        external_item_id: externalRooms[0]?.externalItemId ?? null,
        external_room_id: externalRooms[0]?.externalRoomId ?? null,
        external_rate_plan_id: externalRooms[0]?.externalRatePlanId ?? null,
        room_name: singleQuote.room?.room_type ?? null,
        room_code: singleQuote.room?.hyperguest_room_type_code ?? singleQuote.room?.room_code ?? null,
        quantity: num_rooms, adults, children, infants,
        child_ages: body.child_ages ?? null, extra_beds, meals,
        expected_price: totals.grandTotal, expected_currency: "INR",
        final_price: totals.grandTotal, final_currency: "INR",
        cancellation_policy_snapshot: policySnapshot,
        guests: roomInputs?.[0]?.guests ?? [],
        special_requests: special_requests ? [special_requests] : [],
        taxes: [{ code: "GST", name: `GST @ ${totals.gstRate}%`, amount: totals.taxAmount, currency: "INR", relation: "exclusive", calculationType: "percent", calculationValue: totals.gstRate }],
        nightly: (totals.nightly ?? []).map((x: any) => ({
          date: x.date, sell: { price: x.price, currency: "INR" }, net: { price: x.price, currency: "INR" },
        })),
      }];

    await persistBookingGraph(supabase, booking.id, {
      rooms: persistRooms,
      lead_guest: leadGuest,
      references: [
        { reference_type: "jaaga", reference_value: booking.id },
        ...(externalBookingId ? [{ reference_type: HG, reference_value: externalBookingId }] : []),
        ...(agency_reference ? [{ reference_type: "agency", reference_value: agency_reference }] : []),
        ...(idempotency_key ? [{ reference_type: "idempotency", reference_value: idempotency_key }] : []),
      ],
      meta,
      status: booking_status,
      status_source: isHyperGuest ? HG : "jaaga",
      financial_model: { source: isHyperGuest ? HG : "jaaga", items: jaagaFinancialItems(totals), raw: externalRaw ?? null },
    });

    // Legacy line items (unchanged behaviour for existing UI/invoices)
    if (multi) await saveMultiBookingItems(supabase, booking.id, hotel_id, multiQuote.groups);
    else await saveBookingItems(supabase, booking.id, hotel_id, singleQuote.result);

    // Add-on rows for operational views (price snapshot kept forever)
    const allLineItems: any[] = multi
      ? (multiQuote?.groups ?? []).flatMap((g: any) => g.result?.lineItems ?? [])
      : (singleQuote?.result?.lineItems ?? []);
    const addonItems = allLineItems.filter((li: any) => li.item_type === "addon");
    if (addonItems.length) {
      const gstRate = Number(totals?.gstRate ?? 0);
      await supabase.from("hotel_booking_addons").insert(
        addonItems.map((a: any) => ({
          booking_id: booking.id,
          addon_id: (a.price_snapshot as any)?.addon_id ?? null,
          addon_title: a.item_name ?? null,
          unit: (a.price_snapshot as any)?.unit ?? null,
          quantity: a.quantity,
          unit_price: a.unit_price,
          total_price: a.subtotal,
          tax_rate: gstRate,
          tax_amount: Math.round(((Number(a.subtotal) || 0) * gstRate) / 100 * 100) / 100,
          status: "pending",
        })).filter((r: any) => r.addon_id),
      );
    }

    // Promo usage
    if (singleQuote?.promo?.code) {
      const { data: p } = await supabase.from("hotel_promo_codes")
        .select("id,uses_count").eq("hotel_id", hotel_id).eq("code", singleQuote.promo.code).maybeSingle();
      if (p) await supabase.from("hotel_promo_codes").update({ uses_count: (p.uses_count || 0) + 1 }).eq("id", p.id);
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_ORIGIN") || "";
    const portal_url = `${origin}/stay/${token}`;

    // Payment-driven flows email the guest only after the payment is verified.
    const shouldEmail = send_email ?? (booking_status === "confirmed" && payment_status !== "pending");
    if (shouldEmail) {
      try {
        await fetch(new URL("/functions/v1/send-booking-confirmation", Deno.env.get("SUPABASE_URL")!), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ booking_id: booking.id, guest_portal_url: portal_url }),
        });
      } catch { /* ignore */ }
    }


    return json({
      booking, portal_url,
      quote: multi ? multiQuote.totals : singleQuote.result,
      channel: isHyperGuest ? HG : "jaaga",
      external_booking_id: externalBookingId,
      cancellation_policies: policySnapshot,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
