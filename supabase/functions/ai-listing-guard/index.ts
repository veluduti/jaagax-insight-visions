// Classifies a user's chat message during property listing:
//  - "answer"    → a genuine answer to the current question (flow continues)
//  - "question"  → a property-related question; returns a short helpful reply
//  - "off_topic" → unrelated to property listing; returns a polite caution
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { message, question, category, answers, required } = await req.json();
    if (!message || typeof message !== "string") return json({ error: "message required" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const system = `You are JAAGA X's property listing assistant (India). A user is filling a property listing chat.
Classify the user's latest message relative to the current question and reply with ONLY compact JSON:
{"intent":"answer"|"question"|"off_topic"|"wrong_category"|"reluctant","reply":"..."}
- "wrong_category": the message describes a property of a DIFFERENT category than the current Category (categories: residential, commercial, plots, agriculture, coworking, financial, land). E.g. agricultural land in a residential flow. reply = a one-line caution naming the correct category and asking the user to select that category from the list, then repeat the current question.
- "answer": the message is an attempt to answer the current question (even partial/informal). reply = "".
- "question": the user asks something related to property, real estate, listing, pricing, documents, legal, loans, locality, or this form. reply = a short helpful answer (max 3 sentences), then end with a gentle nudge to answer the current question.
- "off_topic": unrelated to property/real estate (jokes, weather, coding, personal chat, gibberish). reply = a polite one-line caution that you can only help with property listing, then repeat the current question.
- "reluctant": the user refuses, hesitates, is confused, or doesn't want/know how to answer (e.g. "I don't want to answer", "not sure", "why do you need this", "later", "no idea"). reply = a warm, empathetic 1-2 sentence response in the user's tone: acknowledge their feeling, briefly explain why this detail helps buyers/verification. If the question is optional (Required: no) say you'll skip it for now. If required, reassure privacy and gently ask again, offering a simple example answer.
Reply in the same language the user writes in. Never change the flow; keep replies short.`;

    const user = `Category: ${category || "unknown"}
Current question: ${question || "(none)"}
Answers so far: ${JSON.stringify(answers || {}).slice(0, 1500)}
Required: ${required ? "yes" : "no"}
User message: ${message}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("gateway error", res.status, t);
      return json({ error: t || "AI error" }, res.status);
    }
    const j = await res.json();
    const text: string = j?.choices?.[0]?.message?.content || "";
    const m = text.match(/\{[\s\S]*\}/);
    let out = { intent: "answer", reply: "" };
    if (m) {
      try {
        const p = JSON.parse(m[0]);
        if (["answer", "question", "off_topic", "wrong_category", "reluctant"].includes(p.intent)) out = { intent: p.intent, reply: String(p.reply || "") };
      } catch { /* fallback to answer */ }
    }
    return json(out);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});
