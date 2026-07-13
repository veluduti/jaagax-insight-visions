// Reverse geocode lat/lng → { city, locality, pincode, formattedAddress }
// Calls Google Geocoding API via the Lovable connector gateway (the browser
// key is NOT authorized for Geocoding, so it MUST go through the gateway).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function pick(comps: any[], type: string): string {
  const m = comps?.find((c) => Array.isArray(c.types) && c.types.includes(type));
  return m?.long_name || m?.short_name || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { latitude, longitude } = await req.json();
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(JSON.stringify({ error: "latitude/longitude required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps connector not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${latitude},${longitude}&language=en&region=in`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    });
    const json: any = await res.json();
    if (!res.ok || json.status !== "OK" || !json.results?.length) {
      return new Response(JSON.stringify({ error: "geocoding failed", status: json?.status }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const best = json.results[0];
    const comps: any[] = best.address_components || [];
    const city =
      pick(comps, "locality") ||
      pick(comps, "administrative_area_level_2") ||
      pick(comps, "administrative_area_level_3");
    const locality =
      pick(comps, "sublocality_level_1") ||
      pick(comps, "sublocality") ||
      pick(comps, "neighborhood") ||
      pick(comps, "locality");
    const sub_locality =
      pick(comps, "sublocality_level_2") ||
      pick(comps, "sublocality_level_3") ||
      "";
    const state = pick(comps, "administrative_area_level_1");
    const country = pick(comps, "country");
    const landmark = pick(comps, "point_of_interest") || pick(comps, "premise") || "";
    const pincode = pick(comps, "postal_code");
    return new Response(
      JSON.stringify({
        city,
        locality,
        sub_locality,
        state,
        country,
        landmark,
        pincode,
        formattedAddress: best.formatted_address,
        place_id: best.place_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
