import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads } = await req.json();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ rankedLeads: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an AI lead scoring system for real estate agents in India.

Analyze these leads and rank them by conversion potential (1-100 score):

Leads data (JSON):
${JSON.stringify(leads)}

Consider these factors:
1. Budget readiness (higher budget = higher intent)
2. Time urgency (viewing requests, follow-ups)
3. Property match (preferences align with agent's listings)
4. Engagement level (number of properties viewed, questions asked)
5. Location preference (specific vs general)

Return JSON with leads sorted by score (highest first):
{
  "rankedLeads": [
    {
      "leadId": "id",
      "score": 85,
      "reason": "High budget, viewed 5+ properties, requested viewing",
      "priority": "high"
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch?.[0] || '{"rankedLeads":[]}');
    } catch {
      // Fallback: return leads as-is
      result = { rankedLeads: leads.map((l: any, i: number) => ({ ...l, score: 50, priority: 'medium' })) };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
