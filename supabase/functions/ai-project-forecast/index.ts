import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, city, locality, avgPrice, verified, reraId } = await req.json();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch market trends for the locality
    const { data: marketData } = await supabase
      .from('market_trends')
      .select('*')
      .eq('city', city)
      .eq('locality', locality)
      .maybeSingle();

    // Fetch community profile
    const { data: communityData } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('city', city)
      .eq('locality', locality)
      .maybeSingle();

    const prompt = `You are an AI real estate market analyst for Indian cities.

Project Details:
- City: ${city}
- Locality: ${locality}
- Average Price: ₹${avgPrice}
- RERA Verified: ${verified ? 'Yes' : 'No'}
- RERA ID: ${reraId || 'Not provided'}

Market Context:
- Locality Appreciation Rate: ${marketData?.appreciation_rate || 'N/A'}%
- Locality Avg Price: ₹${marketData?.avg_price || 'N/A'}
- AI Community Rating: ${communityData?.ai_rating || 'N/A'}/5

Task: Provide a comprehensive project forecast including:
1. Sales Velocity Prediction (units/month) - 12-month forecast
2. Price Appreciation Forecast (%) - 3-year outlook
3. Demand Score (1-100)
4. Risk Assessment (Low/Medium/High)
5. Key Success Factors (3-4 points)
6. Recommendations for builder (3-4 actionable insights)

Return JSON format:
{
  "salesVelocity": { "current": 8, "predicted": 12, "trend": "increasing" },
  "appreciation": { "year1": 6.5, "year2": 8.2, "year3": 9.1 },
  "demandScore": 78,
  "riskLevel": "low",
  "successFactors": ["Factor 1", "Factor 2"],
  "recommendations": ["Rec 1", "Rec 2"]
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
    
    let forecast;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      forecast = JSON.parse(jsonMatch?.[0] || '{}');
    } catch {
      // Fallback forecast
      forecast = {
        salesVelocity: { current: 5, predicted: 7, trend: "stable" },
        appreciation: { year1: 5.0, year2: 6.0, year3: 7.0 },
        demandScore: 60,
        riskLevel: "medium",
        successFactors: ["Good location", "Competitive pricing"],
        recommendations: ["Improve RERA compliance", "Enhance marketing"]
      };
    }

    return new Response(
      JSON.stringify({ forecast }),
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
