// Canonical JAAGA hotel search.
// Returns the JAAGA canonical model (HyperGuest superset) for BOTH direct JAAGA
// hotels and HyperGuest-connected hotels. The customer UI never sees raw
// HyperGuest JSON and never needs to know the source.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  loadDirectRatePlans, toCanonicalRoom, toCanonicalProperty,
  type CanonicalProperty, type CanonicalSearchedPax,
} from "../_shared/canonical.ts";
import { hyperguestConfigured, hgCall, mapHgSearchResponse, HG } from "../_shared/channel/hyperguest.ts";
import { nightsBetween, stayDates } from "../_shared/hotelPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = req.method === "GET" ? Object.fromEntries(new URL(req.url).searchParams) : await req.json();
    const {
      hotel_id = null, city = null, locality = null, query = null,
      check_in = null, check_out = null, board = null, limit = 50,
    } = body ?? {};
    const adults = Math.max(1, Number(body?.adults ?? 1));
    const children = Math.max(0, Number(body?.children ?? 0));
    const infants = Math.max(0, Number(body?.infants ?? 0));
    const roomsWanted = Math.max(1, Number(body?.rooms ?? 1));
    const childAges: number[] = Array.isArray(body?.child_ages) ? body.child_ages.map(Number) : [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nights = check_in && check_out ? nightsBetween(check_in, check_out) : 0;
    const dates = nights > 0 ? stayDates(check_in, nights) : [];
    const pax: CanonicalSearchedPax = { adults, children, infants, childAges };

    /* ---------------- direct JAAGA hotels ---------------- */
    let hq = supabase.from("partner_hotels").select("*").eq("is_active", true).limit(Number(limit));
    if (hotel_id) hq = hq.eq("id", hotel_id);
    if (city) hq = hq.ilike("city", `%${city}%`);
    if (locality) hq = hq.ilike("locality", `%${locality}%`);
    if (query) hq = hq.or(`name.ilike.%${query}%,city.ilike.%${query}%,locality.ilike.%${query}%`);
    const { data: hotels, error: hErr } = await hq;
    if (hErr) return json({ error: hErr.message }, 400);

    const results: CanonicalProperty[] = [];
    for (const hotel of hotels || []) {
      const [{ data: rooms }, { data: remarks }, { data: meals }, { data: addons }, { data: services }, { data: conn }] =
        await Promise.all([
          supabase.from("hotel_rooms").select("*").eq("hotel_id", hotel.id).eq("is_active", true),
          supabase.from("hotel_remarks").select("*").eq("hotel_id", hotel.id),
          supabase.from("hotel_meals").select("*").eq("hotel_id", hotel.id).eq("is_active", true),
          supabase.from("hotel_addons").select("*").eq("hotel_id", hotel.id).eq("is_active", true),
          supabase.from("hotel_extra_services").select("*").eq("hotel_id", hotel.id).eq("is_active", true),
          supabase.from("hotel_channel_connections").select("*").eq("hotel_id", hotel.id).eq("is_active", true).maybeSingle(),
        ]);

      const canonicalRooms = [];
      for (const room of rooms || []) {
        const [{ data: bedding }, { data: inventory }] = await Promise.all([
          supabase.from("room_bedding_configurations").select("*").eq("room_id", room.id),
          dates.length
            ? supabase.from("hotel_inventory").select("*").eq("room_id", room.id)
              .gte("date", dates[0]).lte("date", dates[dates.length - 1])
            : Promise.resolve({ data: [] }),
        ]);

        // Restrictions: stop sell / CTA / CTD / min / max stay.
        const inv = inventory || [];
        const blocked = inv.some((i: any) => i.stop_sell)
          || inv.some((i: any) => i.date === dates[0] && i.closed_to_arrival)
          || inv.some((i: any) => i.date === dates[dates.length - 1] && i.closed_to_departure)
          || inv.some((i: any) => i.min_stay && nights && nights < i.min_stay)
          || inv.some((i: any) => i.max_stay && nights && nights > i.max_stay);
        if (blocked) continue;

        let available: number | null = null;
        if (dates.length) {
          try {
            const { data: a } = await supabase.rpc("check_room_availability", {
              _room_id: room.id, _check_in: check_in, _check_out: check_out,
            });
            if (a != null) available = Number(a);
          } catch { /* optional */ }
          if (inv.length) {
            const invMin = Math.min(...inv.map((i: any) => Number(i.available_units ?? room.total_units ?? 0)));
            available = available == null ? invMin : Math.min(available, invMin);
          }
        }

        let ratePlans = await loadDirectRatePlans(supabase, hotel, room, Math.max(1, nights), dates);
        if (board) ratePlans = ratePlans.filter((rp) => rp.board === board);
        if (!ratePlans.length) continue;

        canonicalRooms.push(toCanonicalRoom(room, ratePlans, bedding || [], pax, available, inv));
      }

      if (!canonicalRooms.length && !hotel_id) continue;
      results.push(toCanonicalProperty(hotel, canonicalRooms, {
        remarks: remarks || [], meals: meals || [], addons: addons || [],
        extraServices: services || [], connection: conn,
      }));
    }

    /* ---------------- HyperGuest-connected hotels ---------------- */
    let external: CanonicalProperty[] = [];
    let externalError: unknown = null;
    if (hyperguestConfigured()) {
      const { data: connections } = await supabase
        .from("hotel_channel_connections").select("hotel_id, channel_property_id")
        .eq("channel", HG).eq("is_active", true);
      const propertyIds = (connections || []).map((c: any) => c.channel_property_id).filter(Boolean);
      if (propertyIds.length) {
        const res = await hgCall(supabase, {
          operation: "search",
          path: Deno.env.get("HYPERGUEST_SEARCH_PATH") ?? "/search",
          body: {
            propertyIds,
            dates: { from: check_in, to: check_out },
            occupancy: [{ adults, children, infants, childrenAges: childAges }],
            numberOfRooms: roomsWanted,
          },
        });
        if (res.ok) {
          const byProperty = new Map((connections || []).map((c: any) => [c.channel_property_id, c.hotel_id]));
          external = mapHgSearchResponse(res.data).map((p) => ({
            ...p, jaagaHotelId: byProperty.get(p.propertyId ?? "") ?? null,
          }));
          // Merge external rooms into an already-listed JAAGA hotel when mapped.
          for (const ext of external) {
            const local = results.find((r) => r.jaagaHotelId && r.jaagaHotelId === ext.jaagaHotelId);
            if (local) {
              local.rooms.push(...ext.rooms);
              local.remarks.push(...ext.remarks);
            }
          }
          external = external.filter((e) => !results.some((r) => r.jaagaHotelId === e.jaagaHotelId));
        } else {
          externalError = res.error;
        }
      }
    }

    return json({
      results: [...results, ...external],
      count: results.length + external.length,
      searched: { check_in, check_out, nights, adults, children, infants, child_ages: childAges, rooms: roomsWanted },
      channels: { hyperguest: hyperguestConfigured() ? (externalError ? "error" : "ok") : "not_configured" },
      channel_error: externalError,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
