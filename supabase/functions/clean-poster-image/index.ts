// Clean a property poster: remove all PII text (phone, name, email, agent stamps, watermarks)
// using Nano Banana (gemini-2.5-flash-image) via Lovable AI Gateway.
// Returns a clean image (data URL) with text seamlessly removed — NO black boxes.

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
      return new Response(JSON.stringify({ cleaned_url: null, error: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Edit this real-estate poster/brochure image to remove ALL personal contact information and agent branding so it can be safely re-published on a marketplace.

REMOVE (replace with surrounding visual context — seamless inpainting, NO black boxes, NO blur, NO solid rectangles):
- Phone numbers, mobile numbers, WhatsApp numbers
- Person names, agent names, "Contact:", "Call:" labels
- Email addresses
- Realtor/agent logos, stamps, watermarks with names
- "Marketed by", "Sole Selling Agent", brokerage badges
- Contact QR codes

KEEP intact:
- Property photos, floor plans, amenities
- BHK / area / price / locality text
- Project name, RERA / DTCP / HMDA approval numbers
- Overall layout, colors, and design

Output the cleaned image with the personal info regions naturally filled in (extend the surrounding background, gradient, or pattern). The result must look like a clean, professional, un-watermarked poster.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("clean-poster-image gateway error", r.status, t);
      return new Response(JSON.stringify({ cleaned_url: null, error: `gateway ${r.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const cleanedUrl = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;

    return new Response(JSON.stringify({ cleaned_url: cleanedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clean-poster-image error", e);
    return new Response(JSON.stringify({ cleaned_url: null, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
