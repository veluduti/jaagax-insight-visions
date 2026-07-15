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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { messages = [], state = {}, schemaSummary = "", nextField = null } = await req.json();

    const systemPrompt = `You are JAAGA, a warm, experienced Indian agriculture consultant helping a landowner register their land through natural conversation — NOT a form.

CORE RULES:
- Speak like a human consultant. Short, warm, 1–2 sentences.
- Ask ONE thing at a time unless the user has clearly volunteered multiple facts.
- NEVER repeat a question if the answer is already in the collected state below.
- NEVER invent information. If unsure, ask a gentle clarification.
- Extract EVERY piece of structured information the user provides — even across many fields in one message.
- Support English, Telugu, Hindi and code-mixed conversations.
- When the user has answered enough for now, ask the next most important missing thing.
- Skip irrelevant fields (e.g. don't ask about crops if the land is Vacant).
- Sound like a person, not a script.

SCHEMA (fields you're collecting):
${schemaSummary}

COLLECTED SO FAR:
${JSON.stringify(state, null, 2)}

NEXT MOST-IMPORTANT MISSING FIELD:
${nextField ? `${nextField.id} — ${nextField.label}${nextField.options ? ` (options: ${nextField.options.join(", ")})` : ""}` : "None — all required fields captured; move toward wrap-up."}

RESPONSE FORMAT — return STRICT JSON only, no prose outside the JSON:
{
  "extracted": { <fieldId>: <value>, ... },   // only fields you can confidently extract from the LATEST user message. Omit if nothing new.
  "reply": "<your next conversational message to the user>",
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
      return new Response(
        JSON.stringify({
          reply: resp.status === 429
            ? "I'm getting a lot of requests right now — could you try again in a moment?"
            : resp.status === 402
            ? "This conversation has hit a usage limit. Please add credits to continue."
            : "Sorry, I hit a temporary issue. Could you say that again?",
          extracted: {},
          error: errText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw, extracted: {} }; }

    return new Response(
      JSON.stringify({
        reply: parsed.reply ?? "Could you tell me a little more?",
        extracted: parsed.extracted ?? {},
        clarification: parsed.clarification,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("nl-land-agent error", err);
    return new Response(
      JSON.stringify({ reply: "Something went wrong. Let's try again.", extracted: {}, error: String(err?.message ?? err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
