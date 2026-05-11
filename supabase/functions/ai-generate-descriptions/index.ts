// Generate Short + Full AI descriptions for a property listing.
// Uses Lovable AI Gateway. Falls back to a deterministic template if the
// gateway is unavailable so the Sell Your Property flow never breaks.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function fallback(s: Record<string, any>) {
  const bhk = s.bhk ? `${s.bhk}` : "";
  const sub = s.property_type || "property";
  const loc = [s.locality, s.city].filter(Boolean).join(", ");
  const furn = s.furnishing ? `${s.furnishing.toLowerCase()} ` : "";
  const facing = s.facing ? ` ${s.facing.toLowerCase()}-facing` : "";
  const amen = Array.isArray(s.amenities) && s.amenities.length
    ? ` Key amenities include ${s.amenities.slice(0, 5).join(", ")}.`
    : "";
  const size = s.flat_size || s.land_size || s.built_area || "";
  const sizeUnit = s.size_unit || "sq ft";
  const short = `${furn}${bhk ? bhk + " BHK " : ""}${sub}${loc ? " in " + loc : ""}${size ? `, ${size} ${sizeUnit}` : ""}${facing}.`;
  const full = `${short} ${amen} A great opportunity for ${s.listing_type === "Rent" ? "tenants" : "buyers"} looking for a well-located ${sub} with modern conveniences and easy connectivity.`;
  return { short: short.replace(/\s+/g, " ").trim(), full: full.replace(/\s+/g, " ").trim() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { state } = await req.json();
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify(fallback(state || {})), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a professional Indian real-estate copywriter. Generate two descriptions for the property data below.

Return STRICT JSON: {"short": string, "full": string}

- "short": 1 sentence, max 25 words, warm and natural.
- "full": 3-5 sentences, professional, highlight property type, BHK, locality, furnishing, facing, amenities, connectivity, payment options, approvals — only mention values present in the data. Do not invent facts. SEO friendly. Human tone.

Property data:
${JSON.stringify(state, null, 2)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You write authentic, human real-estate descriptions. Reply with only JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify(fallback(state || {})), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const txt = j?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(txt); } catch { parsed = {}; }
    const out = {
      short: typeof parsed.short === "string" && parsed.short.trim() ? parsed.short.trim() : fallback(state || {}).short,
      full: typeof parsed.full === "string" && parsed.full.trim() ? parsed.full.trim() : fallback(state || {}).full,
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ short: "", full: "", error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
