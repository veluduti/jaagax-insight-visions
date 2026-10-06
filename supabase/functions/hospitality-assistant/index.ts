import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  role: z.enum(["owner", "staff", "customer", "admin"]),
  question: z.string().trim().min(2).max(1500),
  context: z.string().max(4000).optional(),
});

const ROLE_PROMPTS: Record<string, string> = {
  owner: "You help a hotel / stay property owner on JAAGA grow bookings: pricing, offers, listing photos and descriptions, replying to reviews, occupancy. Give 3-5 short practical steps.",
  staff: "You help front desk, housekeeping and maintenance staff at a stay property do daily tasks: check-in, check-out, cleaning order, reporting problems, handling guest requests politely. Keep answers very short and simple.",
  customer: "You help a guest on JAAGA with their stay: booking, cancellation, check-in, what to ask the property, safety. If it is an emergency tell them to call 112. Never invent property details.",
  admin: "You help a JAAGA administrator handle support tickets, refunds, disputes, partner verification and safety reports fairly and quickly. Suggest clear next actions.",
};

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Please sign in to use the helper." }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Please type a question." });
    const { role, question, context } = parsed.data;

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Helper is not configured." }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: `${ROLE_PROMPTS[role]} Platform: JAAGA (India, prices in rupees). Use plain simple English, under 150 words, no markdown tables. Only use facts given in the context; say so if you don't know.`,
        input: [{ role: "user", content: context ? `Context:\n${context}\n\nQuestion: ${question}` : question }],
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      console.error("AI gateway", res.status, t.slice(0, 500));
      if (res.status === 429) return json({ error: "Too many questions right now. Please wait a minute and try again." });
      if (res.status === 402) return json({ error: "AI credits have run out. Please add credits in workspace settings." });
      if (res.status === 403) return json({ error: "The AI helper is not allowed for this workspace right now." });
      return json({ error: "The helper could not answer. Please try again shortly." });
    }

    // Consume the SSE stream and collect the final text.
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = "", answer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
        try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") answer += ev.delta ?? ""; } catch { /* ignore */ }
      }
    }
    if (!answer.trim()) return json({ error: "The helper couldn't answer that. Try a different question about your stay or property." });
    return json({ answer: answer.trim() });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
