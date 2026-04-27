import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ============================================================
   FIELD CATALOG — what we ultimately need to collect.
   The AI orchestrator picks WHICH field to ask next based on
   what is already filled and the property type.
   ============================================================ */

type FieldDef = {
  id: string;
  section: string;
  question: string;
  input:
    | "text" | "textarea" | "number" | "phone" | "email"
    | "single" | "multi" | "yesno" | "media"
    | "city" | "locality" | "price_unit";
  options?: string[];
  optional?: boolean;
  when?: (s: Record<string, any>) => boolean;
};

const ALL_PROPERTY_TYPES = [
  "Apartment / Flat", "Independent House", "Villa", "Plot / Land",
  "Agricultural Land", "Penthouse", "Duplex / Triplex", "Row House / Townhouse",
];

// `type` is now an array (multi-select). Helpers check ANY/ALL.
const typesOf = (t: any): string[] => Array.isArray(t) ? t : (t ? [t] : []);
const anyLand = (t: any) => typesOf(t).some((x) => x === "Plot / Land" || x === "Agricultural Land");
const allLand = (t: any) => {
  const a = typesOf(t);
  return a.length > 0 && a.every((x) => x === "Plot / Land" || x === "Agricultural Land");
};

/* MINIMAL ESSENTIAL FIELDS — short conversational flow.
   Property type is multi-select. Pricing is unit-based (sq ft / gunta / acre / cent). */
const FIELDS: FieldDef[] = [
  { id: "title", section: "Basic", question: "Give your listing a short catchy title", input: "text" },
  { id: "type", section: "Basic", question: "What kind of property are you listing? (pick one or more)", input: "multi", options: ALL_PROPERTY_TYPES },
  { id: "purpose", section: "Basic", question: "Are you listing it for…", input: "single", options: ["Sale", "Rent", "Lease"] },
  { id: "city", section: "Location", question: "Which city?", input: "city" },
  { id: "locality", section: "Location", question: "Area / Locality?", input: "locality" },
  // Unit-based pricing replaces a single total-price field.
  { id: "price_unit", section: "Price", question: "How would you like to price it?", input: "price_unit" },
  { id: "bhk", section: "Configuration", question: "How many BHK?", input: "single",
    options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"], when: (s) => !allLand(s.type) },
  { id: "furnishing", section: "Furnishing", question: "Furnishing status?", input: "single",
    options: ["Unfurnished", "Semi-Furnished", "Fully Furnished"], when: (s) => !allLand(s.type) },
  { id: "car_parking", section: "Parking", question: "How many car parking slots?", input: "number",
    optional: true, when: (s) => !allLand(s.type) },
  { id: "media", section: "Media", question: "Upload a photo (optional)", input: "media", optional: true },
  { id: "contact_name", section: "Contact", question: "Your full name?", input: "text" },
  { id: "contact_mobile", section: "Contact", question: "Mobile number?", input: "phone" },
];

/* ============================================================
   Helper: pick the next field that is missing & gated correctly
   ============================================================ */
function pickNextField(state: Record<string, any>): FieldDef | null {
  for (const f of FIELDS) {
    const present = state[f.id];
    // A field is considered handled if it has any value OR was explicitly skipped (null marker)
    const wasSkipped = present === null;
    const isFilled = Array.isArray(present)
      ? present.length > 0
      : present !== undefined && present !== "";
    if (isFilled || wasSkipped) continue;
    if (f.when && !f.when(state)) continue;
    return f;
  }
  return null;
}

/* ============================================================
   Try AI to enrich the next question (smarter wording, suggest title/desc)
   Falls back gracefully if AI gateway fails (e.g. 402 credits).
   ============================================================ */
async function aiEnrich(field: FieldDef, state: Record<string, any>) {
  if (!LOVABLE_API_KEY) return null;
  // Only enrich for free-text creative fields
  if (!["title"].includes(field.id)) return null;

  const userPrompt = `You are helping list a property in India.
Collected facts:
${JSON.stringify(state, null, 2)}

Task: Suggest 4 short ${field.id === "title" ? "catchy titles (max 70 chars)" : "2-3 sentence descriptions"} that fit the property. Return JSON: { suggestions: string[] }`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
              properties: {
                suggestions: { type: "array", items: { type: "string" } },
              },
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const state = body.state || {};

    const next = pickNextField(state);

    if (!next) {
      return new Response(
        JSON.stringify({ done: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestions = await aiEnrich(next, state);

    // progress: how many of currently-applicable fields are filled
    const applicable = FIELDS.filter((f) => !f.when || f.when(state));
    const filled = applicable.filter((f) => {
      const v = state[f.id];
      return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
    }).length;

    return new Response(
      JSON.stringify({
        done: false,
        field: next,
        suggestions: suggestions || [],
        progress: { filled, total: applicable.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-conversational-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
