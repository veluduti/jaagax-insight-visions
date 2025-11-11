import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Enriching project data for project ID: ${projectId}`);

    // Check if data already exists and is recent (less than 7 days old)
    const { data: existingStatus } = await supabase
      .from("project_web_data_status")
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (existingStatus?.fetch_status === "success") {
      const lastFetched = new Date(existingStatus.last_fetched_at);
      const daysSince = (Date.now() - lastFetched.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSince < 7) {
        console.log("Using cached data (less than 7 days old)");
        return new Response(
          JSON.stringify({ success: true, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Update status to processing
    await supabase
      .from("project_web_data_status")
      .upsert({
        project_id: projectId,
        fetch_status: "processing",
        updated_at: new Date().toISOString(),
      });

    console.log(`Searching web for: ${project.name} ${project.locality} ${project.city}`);

    // Search the web for project information
    const searchQuery = `${project.name} ${project.locality} ${project.city} real estate project amenities floor plans specifications`;
    
    let webContent = "";
    
    // Try to fetch from a real estate search (simulated for now)
    try {
      const searchResponse = await fetch(
        `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );
      
      if (searchResponse.ok) {
        webContent = await searchResponse.text();
      }
    } catch (e) {
      console.log("Direct search failed, using AI generation");
    }

    // Use AI to extract and structure the data
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiPrompt = `You are analyzing real estate project data. Extract and structure information for this project:

Project Name: ${project.name}
Location: ${project.locality}, ${project.city}
Builder: ${project.builder_name || "Not specified"}
Price: ₹${(project.avg_price / 10000000).toFixed(2)} Crores
RERA: ${project.rera_id || "Not available"}

${webContent ? "Web Search Results:\n" + webContent.substring(0, 3000) : ""}

Generate comprehensive and realistic data for this project in the following JSON structure:
{
  "overview": "3-4 paragraph detailed overview",
  "amenities": [
    {"type": "security", "name": "24x7 Security", "status": "Available"},
    {"type": "gym", "name": "Modern Gymnasium", "status": "Available"}
  ],
  "floorPlans": [
    {
      "bhk": 2,
      "area": 1200,
      "price": 45000000,
      "facing": "East",
      "description": "Spacious 2 BHK",
      "features": ["Feature 1", "Feature 2"]
    }
  ],
  "specifications": [
    {"category": "Structure", "specification": "RCC Frame Structure"},
    {"category": "Flooring", "specification": "Vitrified Tiles"}
  ],
  "highlights": [
    "Key highlight 1",
    "Key highlight 2"
  ]
}

Include 15-20 realistic amenities, 3-4 floor plan variants, 8-10 specifications, and 6-8 highlights.
Make it comprehensive and realistic based on typical ${project.city} real estate projects.
Return ONLY valid JSON, no markdown or explanations.`;

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
            content: "You are a real estate data extraction expert. Always return valid JSON."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        throw new Error("AI service rate limited or out of credits");
      }
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let parsedData;
    
    try {
      const content = aiData.choices?.[0]?.message?.content || "{}";
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedData = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw new Error("Failed to parse AI response");
    }

    console.log("AI data parsed successfully, storing in database...");

    // Store data in database
    // 1. Update project overview
    if (parsedData.overview) {
      await supabase
        .from("projects")
        .update({ overview: parsedData.overview })
        .eq("id", projectId);
    }

    // 2. Store amenities
    if (parsedData.amenities && parsedData.amenities.length > 0) {
      // Delete existing amenities
      await supabase.from("project_amenities").delete().eq("project_id", projectId);
      
      // Insert new amenities
      await supabase.from("project_amenities").insert(
        parsedData.amenities.map((a: any) => ({
          project_id: projectId,
          type: a.type || "other",
          name: a.name,
          status: a.status || "Available",
        }))
      );
    }

    // 3. Store floor plans
    if (parsedData.floorPlans && parsedData.floorPlans.length > 0) {
      await supabase.from("project_floor_plans").delete().eq("project_id", projectId);
      
      await supabase.from("project_floor_plans").insert(
        parsedData.floorPlans.map((fp: any) => ({
          project_id: projectId,
          bhk: fp.bhk,
          area: fp.area,
          price: fp.price,
          facing: fp.facing,
          description: fp.description,
          features: fp.features || [],
        }))
      );
    }

    // 4. Store specifications
    if (parsedData.specifications && parsedData.specifications.length > 0) {
      await supabase.from("project_specifications").delete().eq("project_id", projectId);
      
      await supabase.from("project_specifications").insert(
        parsedData.specifications.map((s: any) => ({
          project_id: projectId,
          category: s.category,
          specification: s.specification,
        }))
      );
    }

    // 5. Store highlights
    if (parsedData.highlights && parsedData.highlights.length > 0) {
      await supabase.from("project_highlights").delete().eq("project_id", projectId);
      
      await supabase.from("project_highlights").insert(
        parsedData.highlights.map((h: string) => ({
          project_id: projectId,
          highlight: h,
        }))
      );
    }

    // Update status to success
    await supabase
      .from("project_web_data_status")
      .upsert({
        project_id: projectId,
        fetch_status: "success",
        last_fetched_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      });

    console.log("Project data enrichment completed successfully");

    return new Response(
      JSON.stringify({ success: true, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in enrich-project-data:", error);
    
    // Update status to error
    try {
      const { projectId } = await req.json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from("project_web_data_status")
        .upsert({
          project_id: projectId,
          fetch_status: "error",
          error_message: error instanceof Error ? error.message : "Unknown error",
          updated_at: new Date().toISOString(),
        });
    } catch (e) {
      console.error("Failed to update error status:", e);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
