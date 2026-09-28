import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const base = "https://connector-gateway.lovable.dev/google_maps";
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return respond({ error: "Please sign in to search locations" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anon) return respond({ error: "Authentication unavailable" }, 503);
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return respond({ error: "Please sign in to search locations" }, 401);

    const { action, input, placeId, sessionToken, latitude, longitude } = await req.json();
    const token = typeof sessionToken === "string" && /^[0-9a-f-]{36}$/i.test(sessionToken) ? sessionToken : null;
    if (!token) return respond({ error: "Invalid search session" }, 400);
    const api = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const lovable = Deno.env.get("LOVABLE_API_KEY");
    if (!api || !lovable) return respond({ error: "Location search unavailable" }, 503);
    const headers = { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": api, "Content-Type": "application/json" };
    let upstream: Response;
    if (action === "suggest") {
      if (typeof input !== "string" || input.trim().length < 2 || input.length > 120) return respond({ suggestions: [] });
      const body: Record<string, unknown> = { input: input.trim(), sessionToken: token };
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        body.locationBias = { circle: { center: { latitude, longitude }, radius: 40000 } };
      }
      upstream = await fetch(`${base}/places/v1/places:autocomplete`, {
        method: "POST", headers: { ...headers, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text" }, body: JSON.stringify(body),
      });
    } else if (action === "details") {
      if (typeof placeId !== "string" || !/^[\w-]{5,250}$/.test(placeId)) return respond({ error: "Invalid place" }, 400);
      upstream = await fetch(`${base}/places/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(token)}`, {
        headers: { ...headers, "X-Goog-FieldMask": "id,formattedAddress,location" },
      });
    } else return respond({ error: "Invalid action" }, 400);

    if (!upstream.ok) {
      const details = await upstream.text();
      console.error(`Location search failed [${upstream.status}]: ${details}`);
      return respond({ error: "Google Maps location search failed", status: upstream.status, details }, upstream.status);
    }
    const result = await upstream.json();
    if (action === "suggest") {
      return respond({ suggestions: (result.suggestions || []).slice(0, 5).map((entry: any) => ({
        placeId: entry.placePrediction?.placeId, text: entry.placePrediction?.text?.text,
      })).filter((entry: any) => entry.placeId && entry.text) });
    }
    const lat = result.location?.latitude;
    const lng = result.location?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !result.formattedAddress) return respond({ error: "That place has no exact map location" }, 422);
    return respond({ latitude: lat, longitude: lng, address: result.formattedAddress, placeId: result.id });
  } catch (error) {
    console.error("Location search error", error);
    return respond({ error: "Location search is temporarily unavailable" }, 500);
  }
});