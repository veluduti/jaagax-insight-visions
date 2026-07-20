/**
 * nl-profile-generator
 * --------------------
 * Reads a user's completed interview (answers + turns + ai_memory) and asks
 * Gemini to synthesize an AI Profile: persona label, warm summary, 10 score
 * dimensions with explanations + confidence, plus tags/strengths/risks.
 *
 * Persists to `nl_ai_profiles` (upsert-latest) and snapshots each generation
 * into `nl_ai_profile_versions`. Uses the caller's JWT so RLS scopes writes
 * to their own row.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SCORE_DIMENSIONS = [
  { code: "identity", label: "Identity" },
  { code: "lifestyle", label: "Lifestyle" },
  { code: "goals", label: "Goals" },
  { code: "investment", label: "Investment" },
  { code: "experience", label: "Experience" },
  { code: "location", label: "Location" },
  { code: "learning", label: "Learning" },
  { code: "risk", label: "Risk Appetite" },
  { code: "time", label: "Time Availability" },
  { code: "budget", label: "Budget Fit" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    if (!apiKey) return json({ ok: false, error: "missing_api_key" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ ok: false, error: "no_auth" }, 401);

    const { reason = "user_request" }: { reason?: string } = await req.json().catch(() => ({}));

    // Use the caller's JWT so RLS applies.
    const sbHeaders = {
      apikey: anonKey,
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    // Who is the caller?
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: sbHeaders });
    if (!userRes.ok) return json({ ok: false, error: "auth_failed" }, 401);
    const { id: userId, email } = await userRes.json();
    if (!userId) return json({ ok: false, error: "no_user" }, 401);

    // Latest completed / in-progress interview session
    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/nl_interview_sessions?user_id=eq.${userId}&order=updated_at.desc&limit=1`,
      { headers: sbHeaders },
    );
    const [session] = await sessionRes.json();

    // User goals (codes + labels)
    const goalsRes = await fetch(
      `${supabaseUrl}/rest/v1/nl_user_goals?user_id=eq.${userId}&select=nl_goals(code,label,category)`,
      { headers: sbHeaders },
    );
    const goalsRows = await goalsRes.json();
    const goals = (goalsRows || [])
      .map((r: any) => r.nl_goals)
      .filter(Boolean);

    // Recent turns for narrative color
    let turns: any[] = [];
    if (session?.id) {
      const turnsRes = await fetch(
        `${supabaseUrl}/rest/v1/nl_interview_turns?session_id=eq.${session.id}&order=turn_index.asc&limit=200`,
        { headers: sbHeaders },
      );
      turns = await turnsRes.json();
    }

    const answers = (session?.answers as Record<string, unknown>) || {};
    const preferredName = (answers.name_preferred as string) || (email ? String(email).split("@")[0] : "");

    // Ask AI for structured profile.
    const scoreListForPrompt = SCORE_DIMENSIONS.map((s) => `"${s.code}" (${s.label})`).join(", ");
    const goalLines = goals.map((g: any) => `- ${g.label} [${g.code}]`).join("\n") || "- (none selected)";

    const shortTurns = turns
      .filter((t: any) => (t.answer_text || t.answer) && !t.skipped)
      .slice(-30)
      .map((t: any) => `${t.role}: ${t.answer_text || JSON.stringify(t.answer)}`.slice(0, 240))
      .join("\n");

    const systemPrompt = `You are the JAAGA Natural Living AI companion. From the user's structured interview answers, distill a Natural Living AI Profile.

RULES:
- Be warm, specific, and Indian-context-aware. Do not sound like a corporate report.
- Every score must be an integer 0-100 with a short human explanation and a confidence 0-1.
- If an answer for a dimension is missing, still produce a fair score but give lower confidence and say why in the explanation.
- Persona: 2-4 words evoking who they are becoming (e.g. "Regenerative Homesteader", "Weekend Farm Explorer", "Quiet Retiree").
- Summary: 2-3 sentences, second-person ("You...").
- Tags: 5-10 short lowercase snake_case markers useful for filtering recommendations.
- Strengths: 2-4 concise positives about their fit for natural living.
- Risks: 2-4 honest, gentle risks or gaps to keep in mind.
- readiness_score, risk_score, intent_score are separate 0-100 top-level numbers.

DIMENSIONS TO SCORE: ${scoreListForPrompt}

RESPOND WITH STRICT JSON:
{
  "persona": "string",
  "summary": "string",
  "readiness_score": <int 0-100>,
  "risk_score": <int 0-100>,
  "intent_score": <int 0-100>,
  "scores": {
    "<code>": { "value": <int 0-100>, "confidence": <0..1>, "explanation": "string" }
  },
  "tags": ["string"],
  "strengths": ["string"],
  "risks": ["string"]
}`;

    const userPrompt = `Preferred name: ${preferredName || "(unknown)"}
Selected goals:
${goalLines}

Structured interview answers (field_code -> value):
${JSON.stringify(answers, null, 2)}

Interview excerpts (most recent 30 turns, freeform):
${shortTurns || "(no freeform)"}`;

    const gwRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      console.error("nl-profile-generator gw", gwRes.status, errText);
      return json(
        {
          ok: false,
          error:
            gwRes.status === 429
              ? "rate_limited"
              : gwRes.status === 402
                ? "credits_exhausted"
                : "ai_provider_error",
        },
        200,
      );
    }

    const raw = (await gwRes.json())?.choices?.[0]?.message?.content ?? "{}";
    const parsed = extractJson(raw);
    const scores = normalizeScores(parsed?.scores);
    const persona = String(parsed?.persona || "Natural Living Seeker").slice(0, 80);
    const summary = String(parsed?.summary || "").slice(0, 1000);
    const readiness = clampInt(parsed?.readiness_score, 0, 100, meanValue(scores));
    const risk = clampInt(parsed?.risk_score, 0, 100, 50);
    const intent = clampInt(parsed?.intent_score, 0, 100, meanValue(scores));
    const tags = arrOfStrings(parsed?.tags).slice(0, 12);
    const strengths = arrOfStrings(parsed?.strengths).slice(0, 6);
    const risks = arrOfStrings(parsed?.risks).slice(0, 6);

    // Determine next version by counting prior rows.
    const priorRes = await fetch(
      `${supabaseUrl}/rest/v1/nl_ai_profiles?user_id=eq.${userId}&select=id,version&order=version.desc&limit=1`,
      { headers: sbHeaders },
    );
    const [prior] = await priorRes.json();
    const nextVersion = (prior?.version ?? 0) + 1;

    const snapshot = {
      persona,
      summary,
      scores,
      tags,
      strengths,
      risks,
      readiness_score: readiness,
      risk_score: risk,
      intent_score: intent,
      model: MODEL,
      generated_at: new Date().toISOString(),
    };

    let profileId: string | null = prior?.id ?? null;

    if (profileId) {
      const updRes = await fetch(`${supabaseUrl}/rest/v1/nl_ai_profiles?id=eq.${profileId}`, {
        method: "PATCH",
        headers: { ...sbHeaders, Prefer: "return=representation" },
        body: JSON.stringify({
          session_id: session?.id ?? null,
          persona,
          summary,
          scores,
          tags,
          strengths,
          risks,
          readiness_score: readiness,
          risk_score: risk,
          intent_score: intent,
          raw_output: parsed,
          model: MODEL,
          version: nextVersion,
          generated_at: snapshot.generated_at,
          updated_at: snapshot.generated_at,
        }),
      });
      if (!updRes.ok) {
        const t = await updRes.text();
        console.error("update profile failed", t);
        return json({ ok: false, error: "profile_update_failed", detail: t }, 500);
      }
    } else {
      const insRes = await fetch(`${supabaseUrl}/rest/v1/nl_ai_profiles`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: userId,
          session_id: session?.id ?? null,
          persona,
          summary,
          scores,
          tags,
          strengths,
          risks,
          readiness_score: readiness,
          risk_score: risk,
          intent_score: intent,
          raw_output: parsed,
          model: MODEL,
          version: nextVersion,
          generated_at: snapshot.generated_at,
        }),
      });
      if (!insRes.ok) {
        const t = await insRes.text();
        console.error("insert profile failed", t);
        return json({ ok: false, error: "profile_insert_failed", detail: t }, 500);
      }
      const [row] = await insRes.json();
      profileId = row?.id ?? null;
    }

    // Version snapshot row
    if (profileId) {
      await fetch(`${supabaseUrl}/rest/v1/nl_ai_profile_versions`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify({
          profile_id: profileId,
          user_id: userId,
          version: nextVersion,
          snapshot,
          reason,
        }),
      });
    }

    // Mark onboarding state as complete-enough for dashboard readiness.
    await fetch(
      `${supabaseUrl}/rest/v1/nl_onboarding_state?user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({
          stage: "dashboard_ready",
          progress_pct: 100,
          last_step: "profile_generated",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      },
    );

    return json({ ok: true, requestId, profileId, version: nextVersion, snapshot }, 200);
  } catch (err: any) {
    console.error("nl-profile-generator unhandled", err);
    return json({ ok: false, error: "unhandled", message: err?.message ?? String(err), requestId }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(response: string): any {
  let cleaned = String(response).replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) return {};
  const opener = cleaned[start];
  const closer = opener === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closer);
  if (end < start) return {};
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
    } catch {
      return {};
    }
  }
}

function normalizeScores(input: unknown): Record<string, { value: number; confidence: number; explanation: string }> {
  const out: Record<string, { value: number; confidence: number; explanation: string }> = {};
  const rec = (input && typeof input === "object" ? (input as Record<string, any>) : {}) as Record<string, any>;
  for (const dim of SCORE_DIMENSIONS) {
    const src = rec[dim.code] || rec[dim.label] || {};
    out[dim.code] = {
      value: clampInt(src?.value, 0, 100, 50),
      confidence: clampFloat(src?.confidence, 0, 1, 0.5),
      explanation: String(src?.explanation || "").slice(0, 400),
    };
  }
  return out;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function clampFloat(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Number(n.toFixed(2))));
}
function meanValue(scores: Record<string, { value: number }>): number {
  const vals = Object.values(scores).map((s) => s.value);
  if (!vals.length) return 50;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function arrOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 240));
}
