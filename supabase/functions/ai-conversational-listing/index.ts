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

/* AI title/description suggestions for free-text creative fields */
async function aiEnrich(field: FieldConfig, state: Record<string, any>): Promise<string[] | null> {
  if (!LOVABLE_API_KEY) return null;
  if (field.id !== "title") return null;

  const userPrompt = `You are helping list a property in India.
Collected facts:
${JSON.stringify(state, null, 2)}

Task: Suggest 4 short catchy titles (max 70 chars) that fit the property.
Return JSON via the tool: { suggestions: string[] }`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Return only the requested tool call." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest",
            description: "Return suggestions",
            parameters: {
              type: "object",
              properties: { suggestions: { type: "array", items: { type: "string" } } },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest" } },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return null;
    const parsed = JSON.parse(tc.function.arguments);
    return parsed.suggestions as string[];
  } catch {
    return null;
  }
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
