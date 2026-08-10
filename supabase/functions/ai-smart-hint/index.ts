import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Returns a single short market-aware hint for the field being asked.
 * Examples:
 *  - "In Kondapur, most 3BHK flats are 1100–1500 sqft"
 *  - "Plots near HMDA approval typically range 150–300 sq yd"
 *  - "Most offices in Hitech City list at ₹70–₹110 per sqft/month"
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { field_id, state } = await req.json();
    if (!field_id) {
      return new Response(JSON.stringify({ hint: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ hint: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = {
      property_type: state?.type,
      bhk: state?.bhk,
      city: state?.city,
      locality: state?.locality,
      purpose: state?.purpose,
      built_up_area: state?.built_up_area,
      plot_area: state?.plot_area,
      total_area: state?.total_area,
    };

    const sys = `You are a real-estate market expert for India (Hyderabad/Telangana focus when locality unknown).
Given the property context and the field a user is about to fill, return ONE concise market hint (max 18 words).
Use real ranges and locality cues. Examples:
- "In Kondapur, most 3BHK flats are 1100–1500 sqft."
- "HMDA-approved plots in Patancheru typically range 150–300 sq yd."
- "Office spaces in Hitech City rent for ₹70–₹110 per sqft/month."
If you can't infer a useful range, return an empty hint.
Return ONLY through the tool.`;

    const user = `Field user is filling: ${field_id}\nContext: ${JSON.stringify(ctx)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "smart_hint",
            description: "Return one concise market hint for the user.",
            parameters: {
              type: "object",
              properties: { hint: { type: "string" } },
              required: ["hint"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "smart_hint" } },
      }),
    });

    if (!r.ok) {
      await r.text().catch(() => "");
      return new Response(JSON.stringify({ hint: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await r.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { hint: null };
    return new Response(JSON.stringify({ hint: parsed.hint || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-smart-hint error", e);
    return new Response(JSON.stringify({ hint: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
