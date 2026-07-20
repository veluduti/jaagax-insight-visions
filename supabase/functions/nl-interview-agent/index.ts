// nl-interview-agent — AI extraction + natural acknowledgement for the Natural
// Living AI Interview Engine. Given the current question, its options, and the
// user's freeform reply, returns { extracted, confidence, ack, needsConfirmation }.
//
// Uses Lovable AI Gateway (Gemini). Never trusts the model blindly:
// - Enum answers are matched against the schema's option values.
// - Multi answers are deduped against the schema.
// - Scale answers are clamped to [min,max].
// - Numbers are parsed leniently.
// - Free text is trimmed + length-capped.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type QOption = { value: string; label: string };
type Question = {
  code: string;
  question: string;
  question_type: "text" | "single_choice" | "multi_choice" | "scale" | "number";
  options?: QOption[] | { min: number; max: number };
  field_code?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ ok: false, error: "missing_api_key", requestId }, 500);
    }

    const {
      question,
      userMessage = "",
      priorAnswers = {},
      selectedGoalCodes = [],
      preferredName = "",
    }: {
      question: Question;
      userMessage?: string;
      priorAnswers?: Record<string, unknown>;
      selectedGoalCodes?: string[];
      preferredName?: string;
    } = await req.json();

    if (!question || !question.code || !question.question_type) {
      return json({ ok: false, error: "invalid_question", requestId }, 400);
    }

    const optionValues = optionValueList(question);
    const schemaSummary = describeQuestion(question);

    const systemPrompt = `You are the JAAGA Natural Living companion — a warm, unhurried Indian consultant helping someone reflect on the life they want on land.

TONE:
- Speak like a person, not a form. Short: 1–2 sentences.
- Occasionally address the user by name (${preferredName || "the user"}) — sparingly.
- Never repeat the question verbatim. Acknowledge briefly, then move forward.
- Never lecture. Never invent facts.

CURRENT QUESTION (the ONLY thing you're trying to understand from the latest user message):
${schemaSummary}

PRIOR ANSWERS (context — do not re-ask):
${JSON.stringify(priorAnswers, null, 2)}

USER'S SELECTED GOALS: ${selectedGoalCodes.join(", ") || "(none)"}

INSTRUCTIONS:
- Extract a structured value for the current question ONLY, from the LATEST user message.
- If the user is vague, ambiguous, or off-topic, return extracted=null and set confidence low.
- If the user's message clearly answers a DIFFERENT prior field, still return extracted=null for the current question (the app handles corrections separately).
- For enum / single_choice: return the exact option value from the schema.
- For multi_choice: return an array of exact option values.
- For scale: return an integer within the min/max range.
- For number: return a plain number.
- For text: return a concise, cleaned-up version of what they meant (never longer than 240 chars).
- confidence is a number between 0 and 1. 0.8+ = save silently. 0.5–0.79 = save but reflect back gently. <0.5 = ask a soft clarification.

RESPOND with STRICT JSON only:
{
  "extracted": <value or null>,
  "confidence": <number 0..1>,
  "needs_confirmation": <true|false>,
  "clarification": "<optional short question if extracted is null or confidence < 0.5>",
  "ack": "<short warm acknowledgement to the user, 1-2 sentences. Do NOT re-ask the current question. If you need clarification, phrase it here as a soft follow-up.>"
}`;

    const body = {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage || "(no reply yet)" },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
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
      console.error("nl-interview-agent gateway error", resp.status, errText);
      return json(
        {
          ok: false,
          error: resp.status === 429 ? "rate_limited" : resp.status === 402 ? "credits_exhausted" : "ai_provider_error",
          providerStatus: resp.status,
          requestId,
        },
        200,
      );
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = extractJson(raw);
    } catch (err) {
      console.error("nl-interview-agent parse error", err, raw);
      return json({ ok: false, error: "parse_error", requestId, raw }, 200);
    }

    const { value, confidence } = normalizeAnswer(parsed?.extracted, Number(parsed?.confidence ?? 0), question, optionValues);
    const needsConfirmation = value != null && (parsed?.needs_confirmation === true || confidence < 0.5);

    return json(
      {
        ok: true,
        requestId,
        extracted: value,
        confidence,
        needsConfirmation,
        clarification: typeof parsed?.clarification === "string" ? parsed.clarification.slice(0, 240) : null,
        ack: typeof parsed?.ack === "string" ? parsed.ack.slice(0, 400) : null,
      },
      200,
    );
  } catch (err: any) {
    console.error("nl-interview-agent unhandled", err);
    return json({ ok: false, error: "unhandled", message: err?.message ?? String(err), requestId }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function optionValueList(q: Question): string[] {
  if (Array.isArray(q.options)) return q.options.map((o) => o.value);
  return [];
}

function describeQuestion(q: Question): string {
  const parts = [`code: ${q.code}`, `type: ${q.question_type}`, `question: ${q.question}`];
  if (Array.isArray(q.options) && q.options.length) {
    parts.push("options: " + q.options.map((o) => `"${o.value}" (${o.label})`).join(", "));
  } else if (q.options && typeof q.options === "object" && "min" in q.options) {
    parts.push(`scale range: ${q.options.min}..${q.options.max}`);
  }
  return parts.join("\n");
}

function normalizeAnswer(
  raw: unknown,
  rawConfidence: number,
  q: Question,
  optionValues: string[],
): { value: unknown; confidence: number } {
  let confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0;
  if (raw == null || raw === "") return { value: null, confidence };

  switch (q.question_type) {
    case "single_choice": {
      const match = matchOption(raw, optionValues);
      return { value: match ?? null, confidence: match ? confidence : Math.min(confidence, 0.4) };
    }
    case "multi_choice": {
      const arr = Array.isArray(raw) ? raw : [raw];
      const matched = Array.from(
        new Set(arr.map((v) => matchOption(v, optionValues)).filter((v): v is string => !!v)),
      );
      return { value: matched.length ? matched : null, confidence: matched.length ? confidence : Math.min(confidence, 0.4) };
    }
    case "scale": {
      const range = (q.options && typeof q.options === "object" && "min" in q.options)
        ? (q.options as { min: number; max: number })
        : { min: 1, max: 5 };
      const num = Number(raw);
      if (!Number.isFinite(num)) return { value: null, confidence: Math.min(confidence, 0.3) };
      return { value: Math.max(range.min, Math.min(range.max, Math.round(num))), confidence };
    }
    case "number": {
      const num = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(num) ? { value: num, confidence } : { value: null, confidence: Math.min(confidence, 0.3) };
    }
    case "text":
    default: {
      const s = String(raw).trim().slice(0, 240);
      return { value: s || null, confidence: s ? confidence : Math.min(confidence, 0.3) };
    }
  }
}

function matchOption(raw: unknown, options: string[]): string | null {
  if (!options.length) return null;
  const target = norm(raw);
  return options.find((o) => norm(o) === target) ?? null;
}

function norm(v: unknown): string {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractJson(response: string): any {
  let cleaned = String(response).replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) throw new Error("no json");
  const opener = cleaned[start];
  const closer = opener === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closer);
  if (end < start) throw new Error("no closer");
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
  }
}
