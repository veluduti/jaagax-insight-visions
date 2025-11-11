import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData, amenities, units } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const amenitiesList = amenities.map((a: any) => `${a.type} (${a.status})`).join(", ");
    const unitsList = units.map((u: any) => `${u.bhk} BHK - ${u.area} sq.ft at ₹${(u.price / 10000000).toFixed(2)}Cr`).join("; ");

    const prompt = `Analyze this real estate project and provide a comprehensive, insightful summary in 3-4 paragraphs:

Project Name: ${projectData.name}
Builder: ${projectData.builder_name || "Not specified"}
Location: ${projectData.locality}, ${projectData.city}
Price Range: Starting from ₹${(projectData.avg_price / 10000000).toFixed(2)} Crores
Trust Score: ${projectData.trust_score}/100
RERA ID: ${projectData.rera_id || "Not available"}
Verified: ${projectData.verified ? "Yes" : "No"}
Overview: ${projectData.overview || "No description provided"}
Amenities: ${amenitiesList || "None listed"}
Available Units: ${unitsList || "No units available"}

Provide a professional analysis covering:
1. Project highlights and unique selling points
2. Investment potential and market positioning
3. Lifestyle and amenities benefits
4. Location advantages
5. Trust and verification status

Write in a professional, informative tone that helps potential buyers make informed decisions.`;

    console.log("Calling Lovable AI for project summary...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional real estate analyst providing comprehensive project summaries for potential buyers and investors."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment.",
            fallback: true 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits exhausted. Please add credits to your workspace.",
            fallback: true 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "Unable to generate summary.";

    console.log("AI summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-project-summary:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
