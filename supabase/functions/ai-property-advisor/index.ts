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

const PLATFORM_KNOWLEDGE = `
You are JAAGA X AI Advisor — an expert Indian real estate assistant. You behave like ChatGPT/Gemini: friendly, knowledgeable, conversational, and helpful for ANY question the user asks (real estate, general, casual, or platform-specific).

═══════════════════════════════════════
ABOUT JAAGA X (the platform you live in)
═══════════════════════════════════════
JAAGA X (tagline: "Choose Your Place") is India's premium real estate discovery platform with AI-powered guidance. Key features users can access:

🏠 PROPERTY DISCOVERY
- Browse verified properties (apartments, villas, plots, houses) at /properties and /search
- Map-based exploration at /map with AI Area Lens
- Property reels (TikTok-style video tours) at /reels and /promotions
- Sneak Peek listings (fresh unverified arrivals)
- 360° virtual tours on property detail pages

🏗️ NEW PROJECTS & BUILDERS
- Browse new launches at /projects
- Detailed builder microsites (Luxury / Standard / Budget tiers)
- RERA-verified projects with trust scores, master plans, brochures
- Builder Trust Program with delivery confidence badges

👨‍💼 AGENTS
- Find verified agents at /agents
- Agent leaderboard, comparison, and AI-matched recommendations
- Live agent location sharing during visits

📅 SITE VISITS & STAYS
- Schedule property visits with auto-confirm or builder approval
- Bundle visits with hotel stays via Visit + Stay Planner
- Live visit tracking, QR/OTP verification, post-visit insights

🏨 HOTELS
- Book partner hotels at /hotels for property visits
- Hotel + property bundles with discounts

📊 INTELLIGENCE
- Transactions market data at /transactions
- Community & locality insights at /communities
- Price predictions, EMI calculator, property comparison
- Innovation Hub with voice search and smart visit clustering

🎯 USER ROLES
- Buyer (default), Agent, Builder (self-signup) — Admin/Hotel Manager (DB only)
- Buyer dashboard tracks favorites, journey, bookings, saved searches

🌆 CITIES COVERED
Hyderabad, Bangalore, Mumbai, Pune, Delhi NCR, Chennai, Kolkata, Ahmedabad, and 50+ more.

═══════════════════════════════════════
YOUR PERSONALITY & STYLE
═══════════════════════════════════════
- Warm, conversational, helpful — like talking to a knowledgeable friend
- Use Indian currency format (₹, Lakhs, Crores) and Indian English
- Format responses with markdown (bold, bullet points, headings) for readability
- Be CONCISE for simple questions, DETAILED when explaining complex topics
- Use emojis sparingly to add warmth (🏡 📍 ✨ 💡)
- If user asks something unrelated to real estate (weather, jokes, coding, life advice), still respond helpfully like ChatGPT would
- If user asks "what can you do?" or "help" — describe your capabilities

═══════════════════════════════════════
ANSWERING RULES
═══════════════════════════════════════
1. PROPERTY SEARCH: When user wants to find properties (e.g., "3BHK in Gachibowli under 1Cr"), I'll provide you live property data from our DB. Summarize the matches and recommend top picks.

2. GENERAL REAL ESTATE Q&A: Use your knowledge of Indian real estate markets, RERA, home loans, EMI, stamp duty, registration, vastu, builder reputations, locality trends, etc.

3. PLATFORM HOWTO: If asked "how do I book a visit?" or "how to find an agent?" — explain step by step using JAAGA X features above and link them with markdown like [Find Agents](/agents).

4. ANYTHING ELSE: Answer like ChatGPT — be helpful, accurate, friendly. Don't refuse normal questions.

5. NEVER make up specific property listings, prices, or builder names that weren't in the DB context provided to you. For general market trends, your knowledge is fine.
`;

interface PropertyFilters {
  city?: string;
  locality?: string;
  bhk?: number;
  min_price?: number;
  max_price?: number;
  type?: string;
  trust_score_min?: number;
}

async function callAI(messages: any[], jsonMode = false): Promise<any> {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
    temperature: jsonMode ? 0.2 : 0.75,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error:", res.status, t);
    if (res.status === 429)
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error("AI service error");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function detectIntentAndFilters(
  query: string,
  history: any[]
): Promise<{ isPropertySearch: boolean; filters: PropertyFilters }> {
  const historyStr = history
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const content = await callAI(
    [
      {
        role: "system",
        content: `You are a query classifier for a real estate platform. Given the user's latest message and conversation history, decide:
1. Is the user actively trying to SEARCH/FIND specific property listings RIGHT NOW? (true/false)
2. If yes, extract structured filters.

Return ONLY valid JSON:
{
  "isPropertySearch": boolean,
  "filters": {
    "city": "string optional",
    "locality": "string optional",
    "bhk": number optional,
    "min_price": number optional in INR,
    "max_price": number optional in INR,
    "type": "Apartment|Villa|Plot|House optional",
    "trust_score_min": number optional 0-100
  }
}

Only set isPropertySearch=true when the user clearly wants listings (e.g. "show me 3bhk in Mumbai", "find villas under 2cr", "any verified flats in Gachibowli").
Set false for: greetings, general questions ("what is RERA?", "how do home loans work?"), platform howto ("how do I book a visit?"), casual chat, follow-up clarifications without new search intent.`,
      },
      {
        role: "user",
        content: `History:\n${historyStr}\n\nLatest message: ${query}`,
      },
    ],
    true
  );

  try {
    const parsed = JSON.parse(content);
    return {
      isPropertySearch: !!parsed.isPropertySearch,
      filters: parsed.filters || {},
    };
  } catch {
    return { isPropertySearch: false, filters: {} };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service not configured (missing LOVABLE_API_KEY)");
    }

    const { query, userId, conversationContext } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("AI Advisor request:", { query, userId });

    const history = Array.isArray(conversationContext) ? conversationContext : [];

    // Step 1: Classify intent
    const { isPropertySearch, filters } = await detectIntentAndFilters(
      query,
      history
    );
    console.log("Intent:", { isPropertySearch, filters });

    let properties: any[] = [];
    let propertyContextBlock = "";

    // Step 2: If property search, query DB
    if (isPropertySearch) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      let q = supabase
        .from("properties")
        .select(
          "id, title, city, locality, price, area_sqft, bedrooms, bathrooms, bhk, type, trust_score, verified, images, description"
        )
        .eq("verified", true);

      if (filters.city) q = q.ilike("city", `%${filters.city}%`);
      if (filters.locality) q = q.ilike("locality", `%${filters.locality}%`);
      if (filters.bhk) q = q.eq("bhk", filters.bhk);
      if (filters.min_price) q = q.gte("price", filters.min_price);
      if (filters.max_price) q = q.lte("price", filters.max_price);
      if (filters.type) q = q.eq("type", filters.type);
      if (filters.trust_score_min)
        q = q.gte("trust_score", filters.trust_score_min);

      const { data, error } = await q.limit(12);
      if (error) console.error("DB error:", error);
      properties = data || [];

      if (properties.length > 0) {
        propertyContextBlock = `\n\n[LIVE DATA — ${properties.length} matching properties from database:]\n${properties
          .slice(0, 8)
          .map(
            (p, i) =>
              `${i + 1}. ${p.title} — ${p.locality}, ${p.city} | ${p.bhk || "?"}BHK | ₹${(p.price / 100000).toFixed(2)}L | ${p.area_sqft || "?"} sqft | Trust: ${p.trust_score || "N/A"}/100`
          )
          .join("\n")}`;
      } else {
        propertyContextBlock = `\n\n[LIVE DATA — No verified properties matched these filters in our DB. Suggest the user broaden filters or try nearby localities.]`;
      }
    }

    // Step 3: Build conversational reply
    const chatMessages = [
      { role: "system", content: PLATFORM_KNOWLEDGE },
      ...history.slice(-6).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: query + propertyContextBlock,
      },
    ];

    const aiSummary = await callAI(chatMessages, false);

    return new Response(
      JSON.stringify({
        success: true,
        aiComment: isPropertySearch
          ? `Found ${properties.length} matches`
          : "Conversational response",
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
