// Deterministic matching: scores only data partners entered. No AI-invented features.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  source: z.enum(["search", "tell_jaaga"]).default("search"),
  location: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  adults: z.number().int().min(1).max(50).default(1),
  children: z.number().int().min(0).max(50).default(0),
  business_types: z.array(z.string().max(40)).max(20).default([]),
  preferences: z.array(z.string().max(40)).max(20).default([]),
  amenities: z.array(z.string().max(40)).max(30).default([]),
  budget_max: z.number().positive().optional().nullable(),
  free_text: z.string().max(1000).optional().nullable(),
});

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const km = (a: number, b: number, c: number, d: number) => {
  const R = 6371, dLat = (c - a) * Math.PI / 180, dLon = (d - b) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const q = parsed.data;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(auth.slice(7));
      userId = data.user?.id ?? null;
    }

    const nights = q.check_in && q.check_out
      ? Math.max(1, Math.round((Date.parse(q.check_out) - Date.parse(q.check_in)) / 86400000)) : 1;
    const guests = q.adults + q.children;

    let hq = admin.from("partner_hotels")
      .select("id,name,city,locality,latitude,longitude,amenities,business_types,tags,quality_score")
      .eq("is_active", true).limit(200);
    const cityTerm = (q.city || q.location || "").split(",")[0].trim();
    if (cityTerm && !(q.latitude && q.longitude)) hq = hq.or(`city.ilike.%${cityTerm}%,locality.ilike.%${cityTerm}%`);
    const { data: hotels, error } = await hq;
    if (error) throw error;

    const ids = (hotels ?? []).map((h) => h.id);
    const { data: rooms } = ids.length
      ? await admin.from("hotel_rooms")
        .select("id,hotel_id,room_type,base_price,weekly_price,monthly_price,max_occupancy,total_units,is_active,sell_by,min_stay_nights")
        .in("hotel_id", ids).neq("is_active", false)
      : { data: [] as any[] };

    const wantTypes = q.business_types.map(norm);
    const wantAmen = [...q.amenities, ...q.preferences].map(norm);
    const results: any[] = [];

    for (const h of hotels ?? []) {
      const hRooms = (rooms ?? []).filter((r) => r.hotel_id === h.id && (r.sell_by === "bed" || (r.max_occupancy ?? 2) * Math.max(1, r.total_units ?? 1) >= guests));
      if (!hRooms.length) continue;

      // Pick cheapest room that is actually free for the dates.
      let best: { room: any; price: number } | null = null;
      for (const r of hRooms) {
        if (r.min_stay_nights && nights < r.min_stay_nights) continue;
        if (q.check_in && q.check_out) {
          const { data: free } = await admin.rpc("room_free_units", { _room_id: r.id, _check_in: q.check_in, _check_out: q.check_out });
          if (Number(free ?? 0) < 1) continue;
        }
        const nightly = Number(r.base_price || 0);
        const price = nights >= 28 && r.monthly_price ? Number(r.monthly_price) * (nights / 30)
          : nights >= 7 && r.weekly_price ? Number(r.weekly_price) * (nights / 7) : nightly * nights;
        if (price <= 0) continue;
        if (!best || price < best.price) best = { room: r, price };
      }
      if (!best) continue;

      const reasons: { label: string; points: number }[] = [];
      if (q.latitude && q.longitude && h.latitude && h.longitude) {
        const d = km(q.latitude, q.longitude, h.latitude, h.longitude);
        if (d > 50) continue;
        const p = Math.round(30 * Math.max(0, 1 - d / 50));
        reasons.push({ label: `${d.toFixed(1)} km from your location`, points: p });
      } else if (cityTerm) {
        reasons.push({ label: `In ${h.locality || h.city}`, points: 20 });
      }
      const hTypes = (h.business_types ?? []).map(norm);
      const typeHits = wantTypes.filter((t) => hTypes.includes(t));
      if (wantTypes.length && !typeHits.length) continue;
      if (typeHits.length) reasons.push({ label: `Is a ${q.business_types.find((t) => hTypes.includes(norm(t)))}`, points: 20 });

      const hAmen = [...(h.amenities ?? []), ...(h.tags ?? [])].map((a: string) => norm(String(a)));
      const amenHits = q.amenities.filter((a) => hAmen.includes(norm(a)));
      if (amenHits.length) reasons.push({ label: `Has ${amenHits.join(", ")}`, points: Math.round(25 * amenHits.length / Math.max(1, wantAmen.length)) });

      if (q.budget_max) {
        if (best.price > q.budget_max * 1.1) continue;
        reasons.push({ label: `Within your budget (₹${Math.round(best.price).toLocaleString("en-IN")})`, points: 15 });
      }
      if (q.check_in && q.check_out) reasons.push({ label: "Available for your dates", points: 5 });
      if ((h.quality_score ?? 0) >= 80) reasons.push({ label: "Complete, verified listing", points: 5 });

      results.push({
        hotel_id: h.id, hotel_name: h.name, room_id: best.room.id,
        score: Math.min(100, reasons.reduce((s, r) => s + r.points, 0)),
        reasons, price_quote: Math.round(best.price),
      });
    }

    results.sort((a, b) => b.score - a.score || a.price_quote - b.price_quote);
    const top = results.slice(0, 30);

    let stayRequestId: string | null = null;
    if (userId) {
      const { data: sr } = await admin.from("stay_requests").insert({
        user_id: userId, source: q.source, location: q.location, city: q.city,
        latitude: q.latitude, longitude: q.longitude, check_in: q.check_in, check_out: q.check_out,
        adults: q.adults, children: q.children, business_types: q.business_types,
        preferences: q.preferences, amenities: q.amenities, budget_max: q.budget_max, free_text: q.free_text,
      }).select("id").single();
      stayRequestId = sr?.id ?? null;
      if (stayRequestId && top.length) {
        await admin.from("match_results").insert(top.map((m) => ({
          stay_request_id: stayRequestId, hotel_id: m.hotel_id, room_id: m.room_id,
          score: m.score, reasons: m.reasons, price_quote: m.price_quote,
        })));
      }
    }

    return json({ stay_request_id: stayRequestId, matches: top });
  } catch (e) {
    console.error("hospitality-match", e);
    return json({ error: "Could not match stays right now" }, 500);
  }
});
