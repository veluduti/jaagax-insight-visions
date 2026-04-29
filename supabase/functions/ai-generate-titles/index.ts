// Generate 3 AI titles for a property listing: feature-based, benefit-based, SEO-based
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function fallbackTitles(s: Record<string, any>) {
  const bhk = s.bhk ? `${s.bhk} BHK` : "";
  const sub = (Array.isArray(s.sub_type) ? s.sub_type[0] : s.sub_type) ||
              (Array.isArray(s.type) ? s.type[0] : s.type) || "Property";
  const city = s.city || "";
  const locality = s.locality || "";
  const loc = locality && city ? `${locality}, ${city}` : (locality || city);
  const area =
    s.built_up_area || s.plot_area || s.shop_area || s.total_area || s.carpet_area ||
    s.price_unit?.area;
  const unit = s.unit || s.area_unit || s.price_unit?.unit || "sq ft";
  const purpose = (s.purpose || "sale").toLowerCase();
  const furnishing = s.furnishing || s.furnishing_status || "";
  const floor = s.floor_number != null && s.floor_number !== "" ? `${s.floor_number}` : "";
  const totalFloors = s.total_floors ? `${s.total_floors}` : "";
  const facing = s.facing || "";
  const balconies = s.balconies ? `${s.balconies} balcony` : "";
  const bath = s.bathrooms ? `${s.bathrooms} bath` : "";

  // Feature: stats-heavy & unique
  const featureParts = [
    bhk,
    sub,
    area ? `${area} ${unit}` : "",
    floor && totalFloors ? `Floor ${floor}/${totalFloors}` : (floor ? `Floor ${floor}` : ""),
    facing ? `${facing} facing` : "",
    loc ? `in ${loc}` : "",
  ].filter(Boolean);

  // Benefit: lifestyle-led
  const benefitTone = furnishing
    ? `${furnishing.toString().toLowerCase().includes("fully") ? "Move-in ready" : furnishing}`
    : "Spacious";

  return [
    {
      type: "feature",
      label: "Feature-based",
      title: featureParts.join(" • ").trim() || `${sub}${loc ? ` in ${loc}` : ""}`,
    },
    {
      type: "benefit",
      label: "Benefit-based",
      title: [
        benefitTone,
        bhk || sub,
        bath,
        balconies,
        `for ${purpose}`,
        loc ? `in prime ${loc}` : "",
      ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    },
    {
      type: "seo",
      label: "SEO-based",
      title: [
        bhk,
        sub,
        `for ${purpose}`,
        loc ? `in ${loc}` : "",
        area ? `— ${area} ${unit}` : "",
        furnishing ? `(${furnishing})` : "",
      ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { state } = await req.json();
    if (!state || typeof state !== "object") {
      return new Response(JSON.stringify({ error: "state required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fb = fallbackTitles(state);
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ titles: fb }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You write UNIQUE Indian real-estate listing titles. Given this listing JSON, produce EXACTLY 3 short titles (max 75 chars each).

CRITICAL RULES:
- Use ONLY actual values from the listing JSON. Never invent BHK, area, floor, locality, furnishing, or any spec that isn't in the data.
- Make every title clearly distinct from generic listings — include real numbers (BHK, sqft, floor) and the exact locality/city.
- Do NOT use placeholders like "Property" if a specific sub_type (Flat/Villa/Plot/Shop/Office) is provided.
- Avoid repeating the same title across the three variants.

Variants:
1) feature: stats-led — BHK • sub_type • area+unit • floor/total_floors • locality, city
2) benefit: lifestyle-led — leverage furnishing/amenities/balconies/facing if present, e.g. "Fully-furnished 3 BHK with 2 balconies for sale in Kondapur"
3) seo: keyword-rich for search — "{BHK} {sub_type} for {purpose} in {locality}, {city} — {area} {unit}"

Return strict JSON: { "titles": [{ "type":"feature","label":"Feature-based","title":"..." }, { "type":"benefit","label":"Benefit-based","title":"..." }, { "type":"seo","label":"SEO-based","title":"..." }] }
Listing: ${JSON.stringify(state)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) throw new Error(`AI failed ${r.status}`);
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const titles = Array.isArray(parsed?.titles) && parsed.titles.length === 3 ? parsed.titles : fb;

    return new Response(JSON.stringify({ titles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ titles: fallbackTitles({}) , error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
