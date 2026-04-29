import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  pickNextField,
  flowProgress,
  type FieldConfig,
} from "../_shared/propertyFieldsConfig.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* Title is auto-generated post-flow by `ai-generate-titles`, not asked here. */
async function aiEnrich(_field: FieldConfig, _state: Record<string, any>): Promise<string[] | null> {
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const state = body.state || {};

    const next = pickNextField(state);

    if (!next) {
      return new Response(
        JSON.stringify({ done: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const suggestions = await aiEnrich(next, state);
    const progress = flowProgress(state);

    return new Response(
      JSON.stringify({
        done: false,
        field: next,
        suggestions: suggestions || [],
        progress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-conversational-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
