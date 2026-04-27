import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const propertyType: string = body.propertyType || "";
    const listingPurpose: string = body.listingPurpose || "sale";
    const city: string = body.city || "";
    const locality: string = body.locality || "";
    const landmark: string = body.landmark || "";

    if (!propertyType || !city) {
      return new Response(
        JSON.stringify({ error: "propertyType and city are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Generate listing suggestions for a real estate ad in India.

Property: ${propertyType}
Purpose: ${listingPurpose}
City: ${city}
Area / Locality: ${locality || "not specified"}
Landmark: ${landmark || "not specified"}

Return concise, market-realistic suggestions tailored to this exact property type and locality. Do NOT include numbers in titles. Pricing should be a realistic per-unit suggestion in INR. Amenities must match the property type (no BHK/lift for plots/agri land). Description must be 2-3 sentences, persuasive, locality-specific.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an Indian real estate listing copywriter. Output only the requested tool call. Be specific to Indian cities, localities, and units (Sq Yard, Gunta, Acre, Cent, Sq Ft).",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "listing_suggestions",
              description: "Return creative listing assets for a property.",
              parameters: {
                type: "object",
                properties: {
                  titles: {
                    type: "array",
                    description: "3-5 short, catchy property titles (max 70 chars each).",
                    items: { type: "string" },
                  },
                  amenities: {
                    type: "array",
                    description: "Relevant amenities for this property type only.",
                    items: { type: "string" },
                  },
                  nearby_landmarks: {
                    type: "array",
                    description: "3-5 plausible nearby landmarks for the locality.",
                    items: { type: "string" },
                  },
                  description: {
                    type: "string",
                    description: "Persuasive 2-3 sentence description.",
                  },
                  price_suggestion: {
                    type: "object",
                    properties: {
                      unit: {
                        type: "string",
                        enum: ["Sq Ft", "Sq Yard", "Acre", "Cent", "Gunta"],
                      },
                      price_per_unit: { type: "number" },
                      reasoning: { type: "string" },
                    },
                    required: ["unit", "price_per_unit", "reasoning"],
                    additionalProperties: false,
                  },
                },
                required: [
                  "titles",
                  "amenities",
                  "nearby_landmarks",
                  "description",
                  "price_suggestion",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "listing_suggestions" },
        },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable Cloud." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-listing-suggestions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
