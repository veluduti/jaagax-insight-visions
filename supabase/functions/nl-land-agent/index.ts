// JAAGA Land Registration AI Agent — server-side conversational endpoint.
// Uses Lovable AI Gateway (Gemini) for structured extraction + natural next question.
// Contract: { messages:[{role,content}], state:object, schemaSummary:string, nextField:{id,label,type,options?} | null }
// Returns:  { reply: string, extracted: Record<string,any>, clarification?: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const FUNCTION_FILE = "supabase/functions/nl-land-agent/index.ts";

type FieldSchema = {
  id: string;
  label: string;
  type: "text" | "number" | "enum" | "multi" | "stars" | "gps" | "date" | "upload";
  options?: string[];
  adminOnly?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return debugResponse(requestId, "env_api_key", new Error("LOVABLE_API_KEY missing"));
    }

    const { messages = [], state = {}, schemaSummary = "", schema = [], nextField = null } = await req.json();
    const fieldMap = new Map<string, FieldSchema>((schema as FieldSchema[]).map((field) => [field.id, field]));
    const latestUserMessage = [...messages].reverse().find((message: any) => message?.role === "user")?.content ?? "";

    const systemPrompt = `You are JAAGA, a warm, experienced Indian agriculture consultant helping a landowner register their land through natural conversation — NOT a form.

CORE RULES:
- Speak like a human consultant. Short, warm, 1–2 sentences.
- Ask ONE thing at a time unless the user has clearly volunteered multiple facts.
- NEVER repeat a question if the answer is already in the collected state below.
- NEVER invent information. If unsure, ask a gentle clarification.
- Extract EVERY piece of structured information the user provides — even across many fields in one message.
- If the user says an earlier answer is wrong, treat it as an edit. Return the corrected field in extracted. For multi-select or star fields, include the field id in replace_fields when the new answer should replace the old answer instead of being added.
- Support English, Telugu, Hindi and code-mixed conversations.
- Skip irrelevant fields (e.g. don't ask about crops if the land is Vacant).
- Do not ask admin-only verification fields to the landowner.
- Sound like a person, not a script.

STRICT FIELD-FOCUS RULE (VERY IMPORTANT):
- Your "reply" MUST ask ONLY about the "NEXT MOST-IMPORTANT MISSING FIELD" given below.
- Do NOT ask about any other field in the same turn. Do NOT combine questions.
- Set "active_field" in the JSON to that exact field id so the UI can render matching suggestion chips.
- If (and ONLY if) the user's latest message already answered that field, extract it AND move to the next unanswered required field — then set "active_field" to the NEW field you're now asking about.
- If all required fields are collected, set "active_field" to null and move toward wrap-up.

SCHEMA (fields you're collecting):
${schemaSummary}

COLLECTED SO FAR:
${JSON.stringify(state, null, 2)}

NEXT MOST-IMPORTANT MISSING FIELD:
${nextField ? `${nextField.id} — ${nextField.label}${nextField.options ? ` (options: ${nextField.options.join(", ")})` : ""}` : "None — all required fields captured; move toward wrap-up."}

RESPONSE FORMAT — return STRICT JSON only, no prose outside the JSON:
{
  "extracted": { <fieldId>: <value>, ... },   // only fields you can confidently extract from the LATEST user message. Omit if nothing new.
  "replace_fields": ["<fieldId>"],            // only for corrections where previous multi/star values must be replaced.
  "active_field": "<fieldId or null>",         // the SINGLE field your reply is asking about right now. MUST match a schema field id.
  "reply": "<your next conversational message to the user — ask ONLY about active_field>",
  "clarification": "<optional: a short clarification you need before saving something ambiguous>"
}

The "extracted" values must use these formats:
- enum fields: exact option string from the schema
- multi fields: array of exact option strings
- number fields: number
- stars: object like { "Tourism": 4, "Organic Farming": 5 }
- date fields: YYYY-MM-DD
`;

    const body = {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    };

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "custom-fetch",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gateway error", resp.status, errText);
      return debugResponse(requestId, "ai_provider_call", new Error(`AI Gateway returned ${resp.status}: ${errText}`), {
        model: MODEL,
        providerStatus: resp.status,
        latestUserMessage,
        state,
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    if (detectTruncation(raw)) {
      return debugResponse(requestId, "ai_response_truncated", new Error("AI response appears truncated before JSON parsing."), { rawAIResponse: raw });
    }

    let parsed: any = {};
    try {
      parsed = extractJsonFromResponse(raw);
    } catch (parseError) {
      return debugResponse(requestId, "json_parse", parseError, { rawAIResponse: raw });
    }

    const validation = normalizeExtraction(parsed?.extracted ?? {}, fieldMap);

    return new Response(
      JSON.stringify({
        ok: true,
        requestId,
        reply: parsed.reply ?? "Could you tell me a little more?",
        extracted: validation.extracted,
        replace_fields: Array.isArray(parsed.replace_fields) ? parsed.replace_fields.filter((id: string) => fieldMap.has(id)) : [],
        clarification: parsed.clarification,
        debug: {
          requestId,
          file: FUNCTION_FILE,
          function: "Deno.serve handler",
          model: MODEL,
          stages: ["request_received", "api_key_loaded", "ai_provider_called", "ai_response_received", "json_parsed", "extraction_validated"],
          rawAIResponse: raw,
          validationWarnings: validation.warnings,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("nl-land-agent error", err);
    return debugResponse(requestId, "unhandled_exception", err);
  }
});

function extractJsonFromResponse(response: string): any {
  let cleaned = String(response)
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.search(/[\{\[]/);
  if (jsonStart === -1) throw new Error("No JSON object found in AI response");
  const opener = cleaned[jsonStart];
  const closer = opener === "[" ? "]" : "}";
  const jsonEnd = cleaned.lastIndexOf(closer);
  if (jsonEnd === -1 || jsonEnd < jsonStart) throw new Error("JSON closing boundary not found in AI response");
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const repaired = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    return JSON.parse(repaired);
  }
}

function detectTruncation(response: string): boolean {
  const text = String(response).trim();
  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;
  if (openBraces !== closeBraces || openBrackets !== closeBrackets) return true;
  return [/\.\.\.$/, /…$/, /\[truncated\]/i, /\[continued\]/i].some((pattern) => pattern.test(text));
}

function normalizeExtraction(extracted: Record<string, any>, fieldMap: Map<string, FieldSchema>) {
  const normalized: Record<string, any> = {};
  const warnings: string[] = [];

  for (const [fieldId, value] of Object.entries(extracted || {})) {
    const field = fieldMap.get(fieldId);
    if (!field) {
      warnings.push(`Dropped unknown field: ${fieldId}`);
      continue;
    }
    if (field.adminOnly) {
      warnings.push(`Dropped admin-only field from landowner conversation: ${fieldId}`);
      continue;
    }

    if (field.type === "number") {
      const numberValue = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(numberValue)) normalized[fieldId] = numberValue;
      else warnings.push(`Invalid number for ${fieldId}`);
      continue;
    }

    if (field.type === "enum") {
      normalized[fieldId] = matchOption(value, field.options) ?? value;
      continue;
    }

    if (field.type === "multi") {
      const values = Array.isArray(value) ? value : String(value).split(/,|\/| and /i).map((item) => item.trim()).filter(Boolean);
      normalized[fieldId] = Array.from(new Set(values.map((item) => matchOption(item, field.options) ?? item)));
      continue;
    }

    if (field.type === "stars" && value && typeof value === "object") {
      const ratings: Record<string, number> = {};
      for (const [key, rating] of Object.entries(value)) {
        const option = matchOption(key, field.options) ?? key;
        const parsed = Number(rating);
        if (Number.isFinite(parsed)) ratings[option] = Math.max(1, Math.min(5, Math.round(parsed)));
      }
      normalized[fieldId] = ratings;
      continue;
    }

    normalized[fieldId] = value;
  }

  return { extracted: normalized, warnings };
}

function matchOption(value: unknown, options?: string[]) {
  if (!options?.length) return undefined;
  const target = normalizeToken(value);
  return options.find((option) => normalizeToken(option) === target);
}

function normalizeToken(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function debugResponse(requestId: string, stage: string, error: any, context: Record<string, unknown> = {}) {
  const debug = {
    requestId,
    file: FUNCTION_FILE,
    function: "Deno.serve handler",
    stage,
    model: MODEL,
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    ...context,
  };
  console.error("nl-land-agent runtime debug", JSON.stringify(debug));
  return new Response(
    JSON.stringify({
      ok: false,
      reply: "AI agent runtime failure. The full backend exception is included below.",
      extracted: {},
      debug,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
