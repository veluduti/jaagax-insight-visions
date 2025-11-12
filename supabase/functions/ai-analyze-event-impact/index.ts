import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('community_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError) throw eventError;

    // Fetch nearby properties
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('price, area, city, locality')
      .eq('city', event.city)
      .eq('locality', event.locality)
      .limit(50);

    if (propsError) throw propsError;

    // Prepare AI analysis prompt
    const prompt = `Analyze the impact of this community event on local real estate:

Event: ${event.title}
Category: ${event.category}
Date: ${event.event_date}
Location: ${event.locality}, ${event.city}
Expected Attendees: ${event.max_attendees || 'Unknown'}
Type: ${event.featured ? 'Featured Festival' : 'Community Event'}

Context:
- ${properties?.length || 0} properties in the area
- Average property price: ₹${properties?.reduce((sum, p) => sum + (p.price || 0), 0) / (properties?.length || 1)}

Provide a brief analysis (3-4 sentences) covering:
1. Short-term impact on foot traffic and local business
2. Potential effect on property desirability
3. Cultural/community value addition
4. Investment sentiment outlook

Return as JSON: { "impact_score": 1-10, "summary": "text", "recommendations": ["point1", "point2"] }`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    let aiResponse;
    
    if (LOVABLE_API_KEY) {
      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a real estate market analyst. Provide concise, data-driven insights.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error('Lovable AI error:', lovableResponse.status, errorText);
        throw new Error(`AI analysis failed: ${lovableResponse.status}`);
      }

      const data = await lovableResponse.json();
      aiResponse = JSON.parse(data.choices[0].message.content);
    } else if (OPENAI_API_KEY) {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a real estate market analyst. Provide concise, data-driven insights.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!openaiResponse.ok) throw new Error('OpenAI analysis failed');
      
      const data = await openaiResponse.json();
      aiResponse = JSON.parse(data.choices[0].message.content);
    } else {
      throw new Error('No AI API key configured');
    }

    // Log the analysis
    await supabase.from('event_logs').insert({
      event_id,
      action: 'ai_impact_analysis',
      metadata: { analysis: aiResponse }
    });

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});