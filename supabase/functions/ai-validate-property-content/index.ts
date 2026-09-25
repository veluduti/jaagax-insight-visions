// AI-powered validation: is this content a real-estate / property listing,
// and which listing category does it belong to?
// Accepts either an image (URL or data URL) or extracted text.
// Returns { valid, confidence (0-1), reason?, documentType?, listingCategory? }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const CATEGORIES = ["residential", "commercial", "plots", "agriculture", "coworking", "financial", "unknown"];

const SYSTEM_PROMPT = `You are a strict classifier for a real-estate listing app (India).
Decide if the provided content is related to a PROPERTY LISTING (residential, commercial, plot, agricultural land, co-working, rental, sale, brochure, floor plan, layout, project poster, interior/exterior photo of a building, land photo).

VALID examples: apartment/villa/house photos, floor plans, site/master plans, brochures, project posters, commercial spaces, shops, offices, plots/land photos, farm land posters, construction sites, rental/sale documents.
INVALID examples: nature wallpapers, memes, selfies/portraits, pets, food, Aadhaar/PAN/ID cards, certificates, invoices, random screenshots unrelated to real estate.

Also decide which LISTING CATEGORY the content belongs to:
- residential: flats, apartments, villas, independent houses, penthouses, row houses
- commercial: offices, shops, showrooms, warehouses, factories, commercial buildings, restaurants, hotels
- plots: residential/commercial open plots, layouts, ventures measured in sq yards / sq ft
- agriculture: agricultural land, farm land, acres/guntas, orchards, farm houses on farm land
- coworking: co-working / shared office seats
- financial: home loan / finance documents
- unknown: cannot tell

Reply ONLY with strict JSON:
{"valid": boolean, "confidence": number 0-1, "reason": short string, "documentType": one of ["property_photo","floor_plan","brochure","layout","interior","exterior","commercial","plot","document","unknown"], "listingCategory": one of ${JSON.stringify(CATEGORIES)}}`;

async function callGateway(messages: any[]) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`gateway ${r.status}: ${t}`);
  }
  const j = await r.json();
  const content = j?.choices?.[0]?.message?.content || "{}";
  const m = String(content).match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : "{}");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ valid: true, confidence: 0, reason: "validator unavailable", documentType: "unknown", listingCategory: "unknown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { image_url, image_base64, text } = await req.json();
    const img = image_base64 || image_url;

    let messages: any[];
    if (img) {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this uploaded file. Return only JSON." },
            { type: "image_url", image_url: { url: img } },
          ],
        },
      ];
    } else if (text && String(text).trim().length > 0) {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Classify the following extracted document text. Return only JSON.\n\n---\n${String(text).slice(0, 8000)}` },
      ];
    } else {
      return new Response(
        JSON.stringify({ valid: false, confidence: 0, reason: "no content provided", documentType: "unknown", listingCategory: "unknown" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await callGateway(messages);
    const out = {
      valid: !!result.valid,
      confidence: typeof result.confidence === "number" ? result.confidence : (result.valid ? 0.8 : 0.1),
      reason: result.reason || (result.valid ? "property-related" : "not property-related"),
      documentType: result.documentType || "unknown",
      listingCategory: CATEGORIES.includes(result.listingCategory) ? result.listingCategory : "unknown",
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-validate-property-content error", e);
    return new Response(
      JSON.stringify({ valid: true, confidence: 0, reason: "validator error", documentType: "unknown", listingCategory: "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
