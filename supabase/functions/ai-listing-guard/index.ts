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
    const { message, question, category, answers } = await req.json();
    if (!message || typeof message !== "string") return json({ error: "message required" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const system = `You are JAAGA X's property listing assistant (India). A user is filling a property listing chat.
Classify the user's latest message relative to the current question and reply with ONLY compact JSON:
{"intent":"answer"|"question"|"off_topic"|"wrong_category","reply":"..."}
- "wrong_category": the message describes a property of a DIFFERENT category than the current Category (categories: residential, commercial, plots, agriculture, coworking, financial, land). E.g. agricultural land in a residential flow. reply = a one-line caution naming the correct category and asking the user to select that category from the list, then repeat the current question.
- "answer": the message is an attempt to answer the current question (even partial/informal). reply = "".
- "question": the user asks something related to property, real estate, listing, pricing, documents, legal, loans, locality, or this form. reply = a short helpful answer (max 3 sentences), then end with a gentle nudge to answer the current question.
- "off_topic": unrelated to property/real estate (jokes, weather, coding, personal chat, gibberish). reply = a polite one-line caution that you can only help with property listing, then repeat the current question.
Never change the flow; keep replies short.`;

    const user = `Category: ${category || "unknown"}
Current question: ${question || "(none)"}
Answers so far: ${JSON.stringify(answers || {}).slice(0, 1500)}
User message: ${message}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: system,
        input: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      console.error("gateway error", res.status, t);
      return json({ error: t || "AI error" }, res.status);
    }

    // Collect streamed text
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
        } catch { /* partial */ }
      }
    }

    const m = text.match(/\{[\s\S]*\}/);
    let out = { intent: "answer", reply: "" };
    if (m) {
      try {
        const p = JSON.parse(m[0]);
        if (["answer", "question", "off_topic"].includes(p.intent)) out = { intent: p.intent, reply: String(p.reply || "") };
      } catch { /* fallback to answer */ }
    }
    return json(out);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});
