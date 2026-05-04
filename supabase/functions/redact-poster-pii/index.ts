// Detect PII regions (phone, name, email, "contact us" blocks, agent stamps)
// on a property poster and return normalised bounding boxes [0..1].
// The client draws filled rectangles over these regions on a <canvas>
// before uploading the cleaned image — the original is never persisted.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_url } = await req.json();
    if (!image_url || typeof image_url !== "string") {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ regions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You are a vision PII detector for Indian real-estate posters / brochures.
Locate every region that contains personal contact info or branding that should be hidden when re-publishing the poster on a marketplace.
Return regions for:
- Phone numbers / mobile numbers / WhatsApp numbers
- Person names, agent names, "Contact: ____", "Call ___"
- Email addresses
- Realtor/agent logos, stamps, watermarks with names
- Any "Marketed by", "Sole Selling Agent", brokerage badges
- QR codes used for contact

DO NOT cover:
- Property images, floor plans, amenities, BHK/area/price/locality text, project names, RERA/DTCP/HMDA approval numbers.

Coordinates MUST be normalised (0..1) relative to the full image. (x, y) is top-left. Add ~2% padding on each side. Return AT MOST 12 regions.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              { type: "text", text: "Detect PII regions to redact in this poster." },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_pii_regions",
            description: "Return PII bounding boxes to redact (normalised 0..1).",
            parameters: {
              type: "object",
              properties: {
                regions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      x: { type: "number" }, y: { type: "number" },
                      w: { type: "number" }, h: { type: "number" },
                      kind: { type: "string", enum: ["phone","name","email","logo","qr","other"] },
                    },
                    required: ["x","y","w","h"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["regions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_pii_regions" } },
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("redact-poster-pii gateway error", r.status, t);
      return new Response(JSON.stringify({ regions: [], error: `gateway ${r.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const call = j?.choices?.[0]?.message?.tool_calls?.[0];
    let regions: any[] = [];
    try { regions = JSON.parse(call?.function?.arguments || "{}").regions || []; } catch { regions = []; }
    // clamp
    regions = regions
      .filter((re) => re && [re.x, re.y, re.w, re.h].every((n) => typeof n === "number"))
      .map((re) => ({
        x: Math.max(0, Math.min(1, re.x)),
        y: Math.max(0, Math.min(1, re.y)),
        w: Math.max(0, Math.min(1, re.w)),
        h: Math.max(0, Math.min(1, re.h)),
        kind: re.kind || "other",
      }));

    return new Response(JSON.stringify({ regions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("redact-poster-pii error", e);
    return new Response(JSON.stringify({ regions: [], error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
