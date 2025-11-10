import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, locality, avg_price, appreciation_rate, verified_projects, verified_properties } = await req.json();
    
    if (!city || !locality) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: city, locality' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing community:', { city, locality, avg_price, appreciation_rate });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if profile already exists and is recent (< 7 days old)
    const { data: existingProfile } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('city', city)
      .eq('locality', locality)
      .single();

    if (existingProfile && existingProfile.updated_at) {
      const daysSinceUpdate = (Date.now() - new Date(existingProfile.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        console.log('Returning cached profile');
        return new Response(
          JSON.stringify({
            ai_summary: existingProfile.ai_summary,
            ai_recommendation: existingProfile.ai_recommendation,
            ai_rating: existingProfile.ai_rating,
            cached: true
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate AI analysis
    const prompt = `You are a real estate analyst for JaagaX in India. Analyze this community and provide insights.

Community Data:
- City: ${city}
- Locality: ${locality}
- Average Price: ₹${(avg_price / 10000000).toFixed(2)} Crores
- Appreciation Rate: ${appreciation_rate}% YoY
- Verified Projects: ${verified_projects}
- Verified Properties: ${verified_properties}

Provide a detailed analysis with:
1. A 3-sentence summary highlighting key investment factors and neighborhood character
2. A recommendation on who this area is best suited for (families, young professionals, investors, retirees, students)
3. A rating from 1-5 stars based on overall investment potential, infrastructure, and livability

Respond in JSON format:
{
  "ai_summary": "...",
  "ai_recommendation": "Best suited for...",
  "ai_rating": 4
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional real estate analyst. Provide data-driven insights in JSON format only.' 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON from AI');
    }

    console.log('Generated AI analysis:', result);

    // Store in database
    const { error: upsertError } = await supabase
      .from('community_profiles')
      .upsert({
        city,
        locality,
        avg_price,
        appreciation_rate,
        verified_projects,
        verified_properties,
        ai_summary: result.ai_summary,
        ai_recommendation: result.ai_recommendation,
        ai_rating: result.ai_rating,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'city,locality'
      });

    if (upsertError) {
      console.error('Error storing profile:', upsertError);
    }

    return new Response(
      JSON.stringify({
        ai_summary: result.ai_summary,
        ai_recommendation: result.ai_recommendation,
        ai_rating: result.ai_rating,
        cached: false
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-community function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
