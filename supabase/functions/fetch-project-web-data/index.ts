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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { projectId } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching data for project ID: ${projectId}`);

    // Fetch enriched data from database
    const [
      { data: project },
      { data: amenities },
      { data: floorPlans },
      { data: specifications },
      { data: highlights },
      { data: status }
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("project_amenities").select("*").eq("project_id", projectId),
      supabase.from("project_floor_plans").select("*").eq("project_id", projectId),
      supabase.from("project_specifications").select("*").eq("project_id", projectId),
      supabase.from("project_highlights").select("*").eq("project_id", projectId),
      supabase.from("project_web_data_status").select("*").eq("project_id", projectId).single()
    ]);

    if (!project) {
      throw new Error("Project not found");
    }

    // If no enriched data exists, trigger enrichment
    if (!status || status.fetch_status === "pending") {
      console.log("No enriched data found, triggering background enrichment");
      
      // Trigger enrichment in background (don't wait)
      fetch(`${supabaseUrl}/functions/v1/enrich-project-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ projectId }),
      }).catch(e => console.error("Failed to trigger enrichment:", e));
    }

    // Return data (may be empty if not yet enriched)
    const webData = {
      overview: project.overview,
      amenities: amenities || [],
      floorPlans: floorPlans || [],
      specifications: specifications?.reduce((acc: any, s: any) => {
        acc[s.category] = s.specification;
        return acc;
      }, {}) || {},
      highlights: highlights?.map((h: any) => h.highlight) || [],
      status: status?.fetch_status || "pending"
    };

    return new Response(
      JSON.stringify({ success: true, data: webData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-project-web-data:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
