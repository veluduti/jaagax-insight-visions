import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  question: z.string().trim().min(2).max(2000),
  context: z.string().max(8000).optional(),
  mode: z.enum(["chat", "plan"]).default("chat"),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Please sign in to create or change a travel plan." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Please describe the travel experience you want." });
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Travel planning is not configured." }, 500);
    const { question, context, mode } = parsed.data;
    const planSchema = {
      type: "object", additionalProperties: false,
      properties: {
        destination: { type: "string" }, title: { type: "string" }, durationDays: { type: "integer", minimum: 1, maximum: 14 }, mood: { type: "string" }, pace: { type: "string", enum: ["slow", "balanced", "active", "intensive"] }, interests: { type: "array", items: { type: "string" } }, purpose: { type: "string", enum: ["leisure", "family", "business", "relocation", "property", "nri"] }, fitScore: { type: "integer", minimum: 1, maximum: 100 }, explanation: { type: "string" },
        days: { type: "array", items: { type: "object", additionalProperties: false, properties: { day: { type: "integer" }, theme: { type: "string" }, items: { type: "array", items: { type: "object", additionalProperties: false, properties: { period: { type: "string", enum: ["morning", "afternoon", "evening", "flexible"] }, title: { type: "string" }, description: { type: "string" }, location: { type: "string" }, fitScore: { type: "integer", minimum: 1, maximum: 100 } }, required: ["period", "title", "description", "location", "fitScore"] } }, required: ["day", "theme", "items"] } }
      }, required: ["destination", "title", "durationDays", "mood", "pace", "interests", "purpose", "fitScore", "explanation", "days"]
    };
    const instructions = mode === "plan"
      ? "Create a flexible India travel discovery plan. Use morning/afternoon/evening blocks, not exact transport schedules. Never offer or book flights, trains, buses, cabs, taxis, rentals, transfers, drivers, or fleets. Property discovery is optional and only when explicitly relevant. Do not promise investment returns. Use realistic concise suggestions and do not invent verified business facts."
      : "You are JAAGA Travel, a concise India travel discovery companion. Answer from the supplied plan/page context. Explain recommendations. You may suggest experiences, areas and a stay search, but never transport booking. Never invent verified details or investment returns. If the user asks to change a plan, give a clear revised suggestion.";
    const payload: Record<string, unknown> = { model: "openai/gpt-5-mini", store: false, reasoning: { effort: "low" }, instructions, input: [{ role: "user", content: context ? `Context:\n${context}\n\nRequest: ${question}` : question }] };
    if (mode === "plan") payload.text = { format: { type: "json_schema", name: "travel_plan", strict: true, schema: planSchema } };
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const detail = await response.text().catch(() => ""); console.error("Travel AI", response.status, detail.slice(0, 500));
      if (response.status === 429) return json({ error: "Travel planning is busy. Please wait a minute and retry." });
      if (response.status === 402) return json({ error: "AI credits have run out." });
      return json({ error: "JAAGA could not plan that right now." }, 500);
    }
    const result = await response.json();
    const output = result.output?.flatMap((entry: any) => entry.content ?? []).find((entry: any) => entry.type === "output_text")?.text ?? result.output_text ?? "";
    if (!output) return json({ error: "JAAGA could not create a useful answer. Try adding a destination or number of days." });
    if (mode === "plan") { try { return json({ plan: JSON.parse(output) }); } catch { return json({ error: "The plan needs another try." }); } }
    return json({ answer: output.trim() });
  } catch (error) {
    console.error(error); return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
