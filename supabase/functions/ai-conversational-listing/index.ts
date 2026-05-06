import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  pickNextField,
  flowProgress,
  buildFieldFlow,
  missingRequired,
  type FieldConfig,
} from "../_shared/propertyFieldsConfig.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a conversational real-estate listing assistant for Indian property (JAAGA X). Behave like ChatGPT — NOT a fixed form.

CRITICAL RULES (apply on every turn):

1. CONTINUOUS RE-EVALUATION
   Re-read the ENTIRE transcript + current state every time. The latest user message has highest priority. Do not blindly continue prior questions.

2. HANDLE CORRECTIONS
   If the user corrects anything ("not plot, it's a flat", "wrong locality, it's Kondapur not Madhapur", "change BHK to 2"):
   - Overwrite that field in state_patch
   - Acknowledge the change naturally in next_question
   - Reset dependent/incompatible fields by setting them to "" in state_patch (e.g., switching from PLOT → APARTMENT clears plot_area, unit, road_width, corner_plot, approval; APARTMENT → PLOT clears bhk, bathrooms, parking, furnishing, floor_number, total_floors)

3. DEPENDENCY RESET
   When type changes, clear fields that don't apply to the new type so the flow restarts cleanly.

4. NO STALE FLOW
   Never repeat a question the user already answered (even via correction). Always pick the next question based on UPDATED state.

5. CONFLICT DETECTION
   If user input is ambiguous/conflicting (e.g. "3 BHK plot", "villa with no rooms"), set clarification=true and ask a focused clarifying question instead of advancing.

6. DYNAMIC QUESTIONING
   Pick the single most useful next question from the missing required fields. Phrase it warmly and briefly (max ~18 words). Reference what they just said when natural.

7. INPUT MODE MUST MATCH THE QUESTION
   Whenever you set clarification=true, you MUST also set clarification_input so the UI renders the right control:
   - locality, village, project name, owner name, descriptions, free corrections, "what is the correct X" → "text"
   - price, area, road width, BHK count, floor numbers, ages, counts → "number"
   - predefined choices (Yes/No, approval types like DTCP/HMDA/RERA, furnishing levels) → "single" (or "multi"/"yesno") AND populate clarification_options
   Never leave the previous numeric/options control on screen when the new question is actually a free-text/locality question.

KNOWN TYPE MAPPING:
- "Plot / Land" → PLOT
- "Apartment / Flat" → APARTMENT
- "Villa" → VILLA
- "Farm Land" → FARM_LAND
- "Commercial Office" → COMMERCIAL_OFFICE
- "Commercial Shop / Showroom" → COMMERCIAL_SHOP
- "Warehouse / Godown" → COMMERCIAL_WAREHOUSE

Always call the tool. Never reply in plain text.`;

type NextField = {
  id: string;
  question: string;
  input: string;
  required?: boolean;
  options?: string[];
};

async function aiTurn(args: {
  state: Record<string, any>;
  transcript: Array<{ role: string; text: string }>;
  candidateField: FieldConfig | null;
  missingFieldIds: string[];
  flow: FieldConfig[];
}): Promise<{
  state_patch: Record<string, any>;
  next_field_id: string | null;
  next_question: string | null;
  clarification: boolean;
  done: boolean;
} | null> {
  if (!LOVABLE_API_KEY) return null;

  const fieldCatalog = args.flow.map((f) => ({
    id: f.id,
    label: f.question,
    input: f.input,
    required: !!f.required,
    options: f.options || [],
  }));

  const userPayload = {
    current_state: args.state,
    missing_required_field_ids_in_order: args.missingFieldIds,
    deterministic_next_field_id: args.candidateField?.id || null,
    field_catalog: fieldCatalog,
    transcript: args.transcript.slice(-20),
  };

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "advance_listing",
              description:
                "Re-evaluate the conversation and choose the next conversational step.",
              parameters: {
                type: "object",
                properties: {
                  state_patch: {
                    type: "object",
                    description:
                      "Fields to OVERWRITE in current_state. Include corrections and dependency resets (use empty string \"\" to clear a field). Omit fields you don't change.",
                    additionalProperties: true,
                  },
                  next_field_id: {
                    type: "string",
                    description:
                      "ID of the next field to ask, from field_catalog. Use empty string if done=true or if asking a clarification.",
                  },
                  next_question: {
                    type: "string",
                    description:
                      "The exact natural-language message to show the user. Acknowledge corrections briefly when relevant.",
                  },
                  clarification: {
                    type: "boolean",
                    description:
                      "True if you're asking a clarifying question (correction, ambiguity, locality/village/name re-ask) instead of advancing the deterministic flow.",
                  },
                  clarification_input: {
                    type: "string",
                    enum: ["text", "textarea", "number", "single", "multi", "yesno"],
                    description:
                      "Input mode that matches your next_question semantics. Use 'text' for locality/village/names/free answers, 'number' for price/area/road-width/counts, 'single'/'multi'/'yesno' only when offering predefined choices. REQUIRED when clarification=true.",
                  },
                  clarification_options: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Choices to render as chips, only when clarification_input is 'single' or 'multi'. Omit otherwise.",
                  },
                  done: {
                    type: "boolean",
                    description:
                      "True only when no required fields remain and you have nothing useful to ask.",
                  },
                },
                required: [
                  "state_patch",
                  "next_field_id",
                  "next_question",
                  "clarification",
                  "done",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "advance_listing" } },
      }),
    });

    if (!r.ok) {
      console.warn("ai-conv gateway", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    const call = j?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return null;
    return JSON.parse(call.function.arguments);
  } catch (e) {
    console.error("aiTurn failed", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const inputState: Record<string, any> = body.state || {};
    const transcript: Array<{ role: string; text: string }> = Array.isArray(body.transcript)
      ? body.transcript
      : [];

    // Deterministic baseline
    const baselineNext = pickNextField(inputState);
    const subtypes: string[] = Array.isArray(inputState.type)
      ? inputState.type
      : inputState.type
        ? [inputState.type]
        : [];
    const flow = buildFieldFlow(subtypes);
    const missing = missingRequired(inputState).map((f) => f.id);

    // Ask the AI to re-evaluate
    const ai = await aiTurn({
      state: inputState,
      transcript,
      candidateField: baselineNext,
      missingFieldIds: missing,
      flow,
    });

    // Apply AI patch (corrections + resets)
    let state = { ...inputState };
    if (ai?.state_patch && typeof ai.state_patch === "object") {
      for (const [k, v] of Object.entries(ai.state_patch)) {
        // empty string clears the field
        if (v === "" || v === null) {
          delete state[k];
        } else {
          state[k] = v;
        }
      }
    }

    // Recompute deterministic next after patch (source of truth for field metadata)
    const recomputedNext = pickNextField(state);
    const progress = flowProgress(state);

    // Done check
    if (ai?.done && !recomputedNext) {
      return new Response(
        JSON.stringify({ done: true, state_patch: ai?.state_patch || {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!recomputedNext) {
      return new Response(
        JSON.stringify({ done: true, state_patch: ai?.state_patch || {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clarification mode: AI is asking something off-flow (correction, ambiguity).
    // Return a synthetic field whose input mode matches the question — DO NOT reuse
    // the deterministic field (that's how stale numeric chips leaked into a
    // "what is the correct locality?" question).
    if (ai?.clarification) {
      const mode = (ai as any).clarification_input || "text";
      const opts = Array.isArray((ai as any).clarification_options)
        ? (ai as any).clarification_options
        : [];
      const synthetic: NextField = {
        id: `__clarify__${Date.now()}`,
        question: (ai?.next_question && ai.next_question.trim()) || "Could you clarify?",
        input: mode,
        required: false,
        options: opts,
      };
      return new Response(
        JSON.stringify({
          done: false,
          field: synthetic,
          suggestions: [],
          progress,
          state_patch: ai?.state_patch || {},
          clarification: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve which field to ask. Prefer AI's choice when valid; fall back to deterministic.
    let chosenField: FieldConfig = recomputedNext;
    if (ai?.next_field_id) {
      const match = flow.find((f) => f.id === ai.next_field_id);
      if (match) {
        // Only honor if not already filled
        const v = state[match.id];
        const filled = Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
        if (!filled) chosenField = match;
      }
    }

    // Use AI's natural question text when available
    const fieldOut: NextField = {
      ...chosenField,
      question: (ai?.next_question && ai.next_question.trim()) || chosenField.question,
    };

    return new Response(
      JSON.stringify({
        done: false,
        field: fieldOut,
        suggestions: [],
        progress,
        state_patch: ai?.state_patch || {},
        clarification: false,
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
