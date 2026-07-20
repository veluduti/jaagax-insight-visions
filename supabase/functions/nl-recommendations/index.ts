/**
 * nl-recommendations
 * ------------------
 * Generates six categories of personalized recommendations
 * (land, weekend_farming, investment, tourism, learning, community) from the
 * user's AI Profile + selected goals + interview answers, and caches them in
 * `nl_recommendations_cache`. Every card includes a WHY reason string.
 *
 * Real land items are drawn from `nl_land_registrations` where possible;
 * other categories are AI-synthesized cards with reasoning.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const CATEGORIES = ["land", "weekend_farming", "investment", "tourism", "learning", "community"] as const;
type Category = typeof CATEGORIES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    if (!apiKey) return json({ ok: false, error: "missing_api_key" }, 500);
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return json({ ok: false, error: "no_auth" }, 401);

    const sbHeaders = { apikey: anonKey, Authorization: auth, "Content-Type": "application/json" };

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: sbHeaders });
    if (!userRes.ok) return json({ ok: false, error: "auth_failed" }, 401);
    const { id: userId } = await userRes.json();

    const { force = false }: { force?: boolean } = await req.json().catch(() => ({}));

    // Reuse fresh cache unless forced.
    if (!force) {
      const cacheRes = await fetch(
        `${supabaseUrl}/rest/v1/nl_recommendations_cache?user_id=eq.${userId}&order=rank.asc&limit=60`,
        { headers: sbHeaders },
      );
      const cached = await cacheRes.json();
      if (Array.isArray(cached) && cached.length > 0) {
        const firstAge = Date.now() - new Date(cached[0].updated_at || cached[0].created_at).getTime();
        if (firstAge < 1000 * 60 * 60 * 6) {
          return json({ ok: true, cached: true, items: cached });
        }
      }
    }

    const [profileRes, goalsRes, sessionRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/nl_ai_profiles?user_id=eq.${userId}&order=version.desc&limit=1`, { headers: sbHeaders }).then((r) => r.json()),
      fetch(`${supabaseUrl}/rest/v1/nl_user_goals?user_id=eq.${userId}&select=nl_goals(code,label,category)`, { headers: sbHeaders }).then((r) => r.json()),
      fetch(`${supabaseUrl}/rest/v1/nl_interview_sessions?user_id=eq.${userId}&order=updated_at.desc&limit=1`, { headers: sbHeaders }).then((r) => r.json()),
    ]);
    const profile = profileRes?.[0] || null;
    const goals = (goalsRes || []).map((r: any) => r.nl_goals).filter(Boolean);
    const answers = sessionRes?.[0]?.answers || {};

    if (!profile) return json({ ok: false, error: "no_profile" }, 400);

    // ---------- LAND: real listings if any ----------
    const landItems: RecItem[] = await buildLandRecommendations(supabaseUrl, sbHeaders, answers, profile);

    // ---------- Non-land categories via AI ----------
    const systemPrompt = `You are the JAAGA Natural Living recommendation engine.
Given a user's AI Profile, goals, and interview answers, produce 3-4 tailored recommendation cards for EACH of these categories:
- weekend_farming
- investment
- tourism
- learning
- community

Every card must include a short honest reason explaining WHY this fits THIS user (referencing their goals, budget, experience, timeline, or location where relevant). No generic filler.

STRICT JSON only, shape:
{
  "weekend_farming": [ { "title": "...", "subtitle": "...", "reason": "...", "score": <0-100>, "tags": ["..."], "cta": "..." } ],
  "investment":      [ ... ],
  "tourism":         [ ... ],
  "learning":        [ ... ],
  "community":       [ ... ]
}`;

    const userPrompt = `AI PROFILE:
persona: ${profile.persona}
summary: ${profile.summary}
tags: ${JSON.stringify(profile.tags)}
scores: ${JSON.stringify(profile.scores)}
readiness_score: ${profile.readiness_score}
risk_score: ${profile.risk_score}
intent_score: ${profile.intent_score}

SELECTED GOALS:
${goals.map((g: any) => `- ${g.label} [${g.code}]`).join("\n") || "(none)"}

INTERVIEW ANSWERS:
${JSON.stringify(answers, null, 2)}`;

    const gwRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      console.error("nl-recommendations gw", gwRes.status, errText);
      return json({ ok: false, error: gwRes.status === 429 ? "rate_limited" : "ai_provider_error" }, 200);
    }

    const raw = (await gwRes.json())?.choices?.[0]?.message?.content ?? "{}";
    const parsed = extractJson(raw);
    const nonLand: RecItem[] = [];
    for (const cat of ["weekend_farming", "investment", "tourism", "learning", "community"] as const) {
      const arr = Array.isArray(parsed?.[cat]) ? parsed[cat] : [];
      arr.slice(0, 4).forEach((c: any, idx: number) => {
        nonLand.push({
          item_type: cat,
          item_id: null,
          item_ref: null,
          title: String(c?.title || "").slice(0, 160) || `${cat} idea ${idx + 1}`,
          score: clampInt(c?.score, 0, 100, 65),
          reason: String(c?.reason || "").slice(0, 400),
          matched_tags: arrOfStrings(c?.tags).slice(0, 6),
          rank: idx,
          payload: {
            subtitle: String(c?.subtitle || "").slice(0, 240),
            cta: String(c?.cta || "Learn more").slice(0, 40),
          },
        });
      });
    }

    const allItems = [...landItems, ...nonLand];

    // Replace cache for this user, then insert new items.
    await fetch(`${supabaseUrl}/rest/v1/nl_recommendations_cache?user_id=eq.${userId}`, { method: "DELETE", headers: sbHeaders });

    if (allItems.length) {
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
      const rows = allItems.map((it) => ({
        user_id: userId,
        profile_id: profile.id,
        item_type: it.item_type,
        item_id: it.item_id,
        item_ref: it.item_ref,
        title: it.title,
        score: it.score,
        reason: it.reason,
        matched_tags: it.matched_tags,
        payload: it.payload,
        rank: it.rank,
        expires_at: expires,
      }));
      const insRes = await fetch(`${supabaseUrl}/rest/v1/nl_recommendations_cache`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "return=representation" },
        body: JSON.stringify(rows),
      });
      if (!insRes.ok) {
        const t = await insRes.text();
        console.error("recs insert failed", t);
        return json({ ok: false, error: "cache_insert_failed", detail: t }, 500);
      }
      const inserted = await insRes.json();
      return json({ ok: true, cached: false, items: inserted, requestId });
    }

    return json({ ok: true, cached: false, items: [] });
  } catch (err: any) {
    console.error("nl-recommendations unhandled", err);
    return json({ ok: false, error: "unhandled", message: err?.message ?? String(err), requestId }, 500);
  }
});

// ---------------- helpers ----------------

interface RecItem {
  item_type: Category;
  item_id: string | null;
  item_ref: string | null;
  title: string;
  score: number;
  reason: string;
  matched_tags: string[];
  rank: number;
  payload: Record<string, unknown>;
}

async function buildLandRecommendations(
  supabaseUrl: string,
  sbHeaders: Record<string, string>,
  answers: any,
  profile: any,
): Promise<RecItem[]> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/nl_land_registrations?status=eq.approved&order=created_at.desc&limit=20`,
      { headers: sbHeaders },
    );
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const budgetKey = answers.budget_range as string | undefined;
    const location = String(answers.preferred_location || "").toLowerCase();
    const tags = new Set<string>((profile?.tags || []).map((t: string) => t.toLowerCase()));

    return rows.slice(0, 4).map((r: any, idx: number) => {
      const parts: string[] = [];
      if (location && String(r.location || "").toLowerCase().includes(location.split(/[,\s]+/)[0] || location)) {
        parts.push("matches your preferred location");
      }
      if (r.total_area) parts.push(`${r.total_area} available`);
      if (budgetKey) parts.push(`priced in your ${budgetKey.replaceAll("_", " ")} range`);
      if (!parts.length) parts.push("close fit to your Natural Living profile");
      return {
        item_type: "land" as Category,
        item_id: null,
        item_ref: r.id,
        title: r.title || r.land_name || `${r.location || "Land"} parcel`,
        score: 82 + idx,
        reason: `We flagged this because it ${parts.join(", ")}.`,
        matched_tags: [...tags].slice(0, 5),
        rank: idx,
        payload: {
          location: r.location,
          total_area: r.total_area,
          land_type: r.land_type,
          image: r.hero_image_url || r.image_url || null,
          cta: "View listing",
          route: `/natural-living/lands/${r.id}`,
        },
      };
    });
  } catch (e) {
    console.warn("buildLandRecommendations failed", e);
    return [];
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function extractJson(s: string): any {
  let cleaned = String(s).replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) return {};
  const opener = cleaned[start];
  const closer = opener === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closer);
  if (end < start) return {};
  cleaned = cleaned.slice(start, end + 1);
  try { return JSON.parse(cleaned); } catch { try { return JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")); } catch { return {}; } }
}
function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function arrOfStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
