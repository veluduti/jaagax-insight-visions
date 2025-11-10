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
    const { userId, city, minPrice, maxPrice, bhk } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's recent favorites and searches
    const { data: favorites } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId)
      .limit(5);

    // Fetch properties that match preferences
    let query = supabase
      .from('properties')
      .select('*')
      .eq('verified', true)
      .order('trust_score', { ascending: false })
      .limit(20);

    if (city) query = query.eq('city', city);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (bhk) query = query.eq('bhk', bhk);

    const { data: properties } = await query;

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to rank and personalize suggestions
    const prompt = `You are a real estate recommendation engine for Indian properties.
    
User preferences: ${city ? `City: ${city}` : 'Any city'}, ${bhk ? `${bhk} BHK` : 'Any BHK'}, Budget: ₹${minPrice || 0} - ₹${maxPrice || 'unlimited'}

Available properties (JSON):
${JSON.stringify(properties.slice(0, 10))}

User's recent favorites: ${favorites?.length || 0} properties

Task: Select and rank the TOP 5 properties that best match the user's preferences. Consider:
1. Budget alignment
2. Trust score and verification
3. Location desirability
4. Value for money (price per sqft)

Return ONLY a JSON array of property IDs in order of recommendation: [id1, id2, id3, id4, id5]`;

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
      console.error('AI Gateway error:', await aiResponse.text());
      // Fallback: return top 5 by trust score
      const fallbackSuggestions = properties.slice(0, 5).map(p => p.id);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parse AI response
    let suggestedIds = [];
    try {
      suggestedIds = JSON.parse(content.match(/\[[\d,\s]+\]/)?.[0] || '[]');
    } catch {
      suggestedIds = properties.slice(0, 5).map(p => p.id);
    }

    return new Response(
      JSON.stringify({ suggestions: suggestedIds }),
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
