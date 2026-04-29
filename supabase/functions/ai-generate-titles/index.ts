// Generate 3 AI titles for a property listing: feature-based, benefit-based, SEO-based
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function fallbackTitles(s: Record<string, any>) {
  const bhk = s.bhk ? `${s.bhk} BHK` : "";
  const sub = s.sub_type || s.type || "Property";
  const loc = s.locality || s.city || "";
  const area =
    s.built_up_area || s.plot_area || s.shop_area || s.total_area || s.carpet_area;
  const unit = s.unit || s.area_unit || "sq ft";
  const purpose = (s.purpose || "sale").toLowerCase();

  return [
    {
      type: "feature",
      label: "Feature-based",
      title: [bhk, sub, area ? `${area} ${unit}` : "", loc ? `in ${loc}` : ""]
        .filter(Boolean).join(" ").trim(),
    },
    {
      type: "benefit",
      label: "Benefit-based",
      title: `Spacious ${bhk || sub} for ${purpose}${loc ? ` in prime ${loc}` : ""} — move-in ready`,
    },
    {
      type: "seo",
      label: "SEO-based",
      title: `${bhk ? bhk + " " : ""}${sub} for ${purpose}${loc ? ` in ${loc}` : ""}${area ? ` — ${area} ${unit}` : ""}`,
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

    const prompt = `You write Indian real-estate listing titles. Given this listing JSON, produce EXACTLY 3 short titles (max 75 chars each):
1) feature: highlights key specs (BHK, area, location)
2) benefit: highlights lifestyle/value (e.g. "move-in ready", "great rental yield")
3) seo: keyword-rich for search engines (e.g. "3 BHK Flat for Sale in Kondapur")
Return strict JSON: { "titles": [{ "type":"feature","label":"Feature-based","title":"..." }, ...] }
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
