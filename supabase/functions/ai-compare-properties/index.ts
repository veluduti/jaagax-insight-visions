import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyIds, userId } = await req.json();
    console.log('AI Compare Properties request:', { propertyIds, userId });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!propertyIds || propertyIds.length < 2 || propertyIds.length > 3) {
      throw new Error('Please select 2-3 properties to compare');
    }

    // Fetch properties from Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id, title, city, locality, price, area, beds, baths, bhk, type,
        trust_score, verified, status, images, description,
        agent_id, project_id
      `)
      .in('id', propertyIds);

    if (propertiesError) {
      console.error('Supabase query error:', propertiesError);
      throw propertiesError;
    }

    if (!properties || properties.length === 0) {
      throw new Error('Properties not found');
    }

    console.log(`Found ${properties.length} properties for comparison`);

    // Generate AI comparison
    const comparisonResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Indian real estate advisor. Compare properties in detail across:
- Price & Value (price per sq ft, overall value)
- Location Benefits (locality advantages, connectivity)
- Property Features (size, layout, amenities)
- Trust & Verification (trust scores, builder reputation)
- Investment Potential (appreciation, rental yield)

Provide a structured comparison with:
1. Quick Summary (2-3 lines)
2. Side-by-Side Comparison Table
3. Strengths & Weaknesses for each
4. Final Recommendation (which property for what type of buyer)

Use Indian currency format (₹) and be specific with numbers.`
          },
          {
            role: 'user',
            content: `Compare these ${properties.length} properties:

${properties.map((p, i) => `
Property ${i + 1}: ${p.title}
- Location: ${p.locality}, ${p.city}
- Price: ₹${(p.price / 100000).toFixed(2)}L (₹${(p.price / p.area).toFixed(0)}/sq ft)
- Size: ${p.area} sq ft, ${p.bhk}BHK, ${p.beds} beds, ${p.baths} baths
- Type: ${p.type}
- Trust Score: ${p.trust_score || 'N/A'}/100
- Verified: ${p.verified ? 'Yes' : 'No'}
- Status: ${p.status}
- Description: ${p.description || 'N/A'}
`).join('\n')}

Provide detailed comparison and recommendation.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!comparisonResponse.ok) {
      console.error('OpenAI comparison error:', await comparisonResponse.text());
      throw new Error('Failed to generate AI comparison');
    }

    const comparisonData = await comparisonResponse.json();
    const aiAnalysis = comparisonData.choices[0].message.content;

    // Store comparison if user is authenticated
    if (userId) {
      await supabase
        .from('property_comparisons')
        .insert({
          user_id: userId,
          property_ids: propertyIds,
          ai_analysis: {
            comparison: aiAnalysis,
            properties: properties,
            timestamp: new Date().toISOString(),
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        properties,
        aiAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-compare-properties:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
