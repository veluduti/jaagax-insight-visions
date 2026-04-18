import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are JAAGA X AI Advisor — a friendly, intelligent real-estate assistant for India, similar to ChatGPT or Gemini. You can answer ANY question — real estate, general knowledge, casual chat, or platform how-to.

ABOUT JAAGA X (the platform you live in):
JAAGA X (tagline "Choose Your Place") is India's premium real-estate discovery platform.
- Browse properties at /properties, /search, /map, /reels
- New projects & builders at /projects with RERA verification & trust scores
- Verified agents at /agents with leaderboards & live location sharing
- Site visits with auto-confirm/builder approval, hotel bundles via /hotels
- Market data at /transactions, /communities
- Roles: Buyer, Agent, Builder (self-signup), Admin & Hotel Manager (DB only)
- Cities: Hyderabad, Bangalore, Mumbai, Pune, Delhi NCR, Chennai, Kolkata, Ahmedabad + 50 more

STYLE:
- Warm, conversational, helpful — like a knowledgeable friend
- Use markdown (bold, bullets) for readability
- Use ₹, Lakhs, Crores for Indian currency
- Be concise for simple questions, detailed for complex ones
- Light emoji use (🏡 ✨ 💡)
- Answer ANY question helpfully — never refuse normal questions
- For platform how-to, link routes like [Find Agents](/agents)

When the user asks for property listings, the system will inject [LIVE DATA] from our database — summarize those matches and highlight top picks. Never invent specific listings, prices, or builder names not provided in [LIVE DATA].`;

interface PropertyFilters {
  city?: string;
  locality?: string;
  bhk?: number;
  min_price?: number;
  max_price?: number;
  type?: string;
}

async function detectIntent(
  query: string,
  history: any[]
): Promise<{ isPropertySearch: boolean; filters: PropertyFilters }> {
  const historyStr = history
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Classify if user wants to SEARCH property listings right now. Return ONLY JSON:
{"isPropertySearch": boolean, "filters": {"city": "?", "locality": "?", "bhk": number?, "min_price": number?, "max_price": number?, "type": "Apartment|Villa|Plot|House?"}}
Set true only for clear listing searches. Set false for greetings, general questions, platform how-to, casual chat.`,
          },
          { role: "user", content: `History:\n${historyStr}\n\nLatest: ${query}` },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("Intent classifier error:", res.status);
      return { isPropertySearch: false, filters: {} };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    // Strip placeholder/empty values ("?", "", null, "N/A") that the LLM emits
    const rawFilters = parsed.filters || {};
    const cleanFilters: PropertyFilters = {};
    for (const [k, v] of Object.entries(rawFilters)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string") {
        const t = v.trim();
        if (!t || t === "?" || t.toLowerCase() === "n/a" || t.toLowerCase() === "any") continue;
        (cleanFilters as any)[k] = t;
      } else if (typeof v === "number" && !isNaN(v) && v > 0) {
        (cleanFilters as any)[k] = v;
      }
    }
    return {
      isPropertySearch: !!parsed.isPropertySearch,
      filters: cleanFilters,
    };
  } catch (e) {
    console.error("Intent detection failed:", e);
    return { isPropertySearch: false, filters: {} };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service not configured");
    }

    const { query, conversationContext } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Advisor query:", query);
    const history = Array.isArray(conversationContext) ? conversationContext : [];

    // Step 1: Intent detection (best-effort, never blocks reply)
    const { isPropertySearch, filters } = await detectIntent(query, history);
    console.log("Intent:", isPropertySearch, JSON.stringify(filters));

    // Step 2: Live property data (only if needed)
    let properties: any[] = [];
    let liveDataBlock = "";

    if (isPropertySearch) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        let q = supabase
          .from("properties")
          .select("id, title, city, locality, price, area_sqft, bedrooms, bhk, type, trust_score, verified")
          .eq("verified", true);

        if (filters.city) q = q.ilike("city", `%${filters.city}%`);
        if (filters.locality) q = q.ilike("locality", `%${filters.locality}%`);
        if (filters.bhk) q = q.eq("bhk", filters.bhk);
        if (filters.min_price) q = q.gte("price", filters.min_price);
        if (filters.max_price) q = q.lte("price", filters.max_price);
        if (filters.type) q = q.eq("type", filters.type);

        const { data, error } = await q.limit(10);
        if (error) console.error("DB error:", error);
        properties = data || [];

        if (properties.length > 0) {
          liveDataBlock = `\n\n[LIVE DATA — ${properties.length} matching properties]\n${properties
            .slice(0, 8)
            .map(
              (p, i) =>
                `${i + 1}. ${p.title} — ${p.locality || "?"}, ${p.city} | ${p.bhk || "?"}BHK | ₹${(p.price / 100000).toFixed(2)}L | ${p.area_sqft || "?"} sqft | Trust ${p.trust_score || "N/A"}/100`
            )
            .join("\n")}`;
        } else {
          liveDataBlock = `\n\n[LIVE DATA — No verified properties matched. Suggest broadening filters or nearby localities.]`;
        }
      } catch (dbErr) {
        console.error("DB query failed:", dbErr);
      }
    }

    // Step 3: Conversational reply (always runs)
    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || ""),
      })),
      { role: "user", content: query + liveDataBlock },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        temperature: 0.8,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit reached. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const aiSummary =
      aiData.choices?.[0]?.message?.content ||
      "I'm here to help! Could you rephrase your question?";

    return new Response(
      JSON.stringify({
        success: true,
        aiSummary,
        filters: isPropertySearch ? filters : null,
        properties,
        totalResults: properties.length,
        isPropertySearch,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-property-advisor error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
