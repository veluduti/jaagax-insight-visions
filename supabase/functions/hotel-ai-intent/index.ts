// Turns a natural-language stay requirement into structured hotel-search params.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText } from "npm:ai";
import { z } from "npm:zod@3";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const CATEGORIES = ["hotel","resort","hostel","apartment","serviced_apartment","coliving","pg","homestay","farm_stay","villa","guest_house","boutique","private_room","shared_room"];
const PREFS = ["family","couple","business","budget","luxury","private_room","shared_room","entire_place","short_stay","long_stay","monthly"];
const AMENITIES = ["pet_friendly","breakfast","wifi","parking","pool","ac","gym","restaurant","kitchen","laundry"];

const Body = z.object({ query: z.string().trim().min(3).max(500), today: z.string().max(20).optional() });
const Intent = z.object({
  location: z.string().nullable().catch(null),
  business_types: z.array(z.string()).catch([]),
  preferences: z.array(z.string()).catch([]),
  amenities: z.array(z.string()).catch([]),
  adults: z.number().int().min(1).max(30).nullable().catch(null),
  children: z.number().int().min(0).max(20).nullable().catch(null),
  rooms: z.number().int().min(1).max(20).nullable().catch(null),
  nights: z.number().int().min(1).max(365).nullable().catch(null),
  check_in: z.string().nullable().catch(null),
  max_price: z.number().nullable().catch(null),
  min_price: z.number().nullable().catch(null),
});

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Please describe your stay in a few words." }, 400);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI search is not configured." }, 500);

  const today = parsed.data.today || new Date().toISOString().slice(0, 10);
  const system = `You extract hotel search filters from Indian travellers' requests. Today is ${today}.
Reply with ONLY a JSON object, no prose, with keys:
location (city/area/landmark string or null), business_types (subset of ${JSON.stringify(CATEGORIES)}),
preferences (subset of ${JSON.stringify(PREFS)}), amenities (subset of ${JSON.stringify(AMENITIES)}),
adults, children, rooms, nights (integers or null), check_in (YYYY-MM-DD or null),
max_price, min_price (rupees per night, numbers or null).
"for my family" => preferences family; "two people" => adults 2; "under 3000" => max_price 3000;
"private room" => business_types ["private_room"] and preferences ["private_room"]; monthly/PG => preferences monthly.`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  let streamError: any = null;
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system,
      prompt: parsed.data.query,
      abortSignal: req.signal,
      onError: ({ error }) => { streamError = error; },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    if (streamError) throw streamError;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "AI couldn't understand that request. Try the filters instead." }, 422);
    const intent = Intent.parse(JSON.parse(match[0]));
    intent.business_types = intent.business_types.filter((x) => CATEGORIES.includes(x));
    intent.preferences = intent.preferences.filter((x) => PREFS.includes(x));
    intent.amenities = intent.amenities.filter((x) => AMENITIES.includes(x));
    return json({ intent });
  } catch (e: any) {
    if (req.signal.aborted) return json({ error: "Cancelled" }, 499);
    const status = Number(e?.statusCode ?? e?.status ?? 500);
    if (status === 402) return json({ error: "AI credits are used up. Please add credits to keep using AI search." }, 402);
    if (status === 429 || status === 503) return json({ error: "AI search is busy right now. Please try again in a moment." }, 429);
    if (status === 403) return json({ error: "AI search isn't available for this workspace right now." }, 403);
    console.error("hotel-ai-intent", e);
    return json({ error: "AI search failed. Please use the filters instead." }, 500);
  }
});
