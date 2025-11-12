import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { city, locality, forceRefresh } = await req.json();

    // Check if we have cached insights that are still valid
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('market_insights')
        .select('*')
        .eq('city', city)
        .eq('locality', locality || '')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (cached && cached.length > 0) {
        return new Response(
          JSON.stringify({ insights: cached, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch real market data from last 30 days
    let query = supabase
      .from('properties')
      .select('*')
      .eq('city', city)
      .gte('submitted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (locality) {
      query = query.eq('locality', locality);
    }

    const { data: properties, error: propError } = await query;

    if (propError) throw propError;

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data available for this location' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate market statistics
    const totalProperties = properties.length;
    const avgPrice = properties.reduce((sum, p) => sum + (p.price || 0), 0) / totalProperties;
    const avgTrustScore = properties.reduce((sum, p) => sum + (p.trust_score || 0), 0) / totalProperties;
    const verifiedCount = properties.filter(p => p.verified).length;
    
    // Calculate price trend (compare first half vs second half of month)
    const midPoint = Math.floor(properties.length / 2);
    const sortedByDate = [...properties].sort((a, b) => 
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
    const oldAvg = sortedByDate.slice(0, midPoint).reduce((sum, p) => sum + (p.price || 0), 0) / midPoint;
    const newAvg = sortedByDate.slice(midPoint).reduce((sum, p) => sum + (p.price || 0), 0) / (properties.length - midPoint);
    const priceTrendValue = oldAvg > 0 ? parseFloat(((newAvg - oldAvg) / oldAvg * 100).toFixed(2)) : 0;

    // Generate AI analysis
    const aiPrompt = `Analyze this real estate market data for ${locality || city}, ${city}:
- Total Properties: ${totalProperties}
- Average Price: ₹${Math.round(avgPrice).toLocaleString()}
- Price Trend (30 days): ${priceTrendValue > 0 ? '+' : ''}${priceTrendValue}%
- Average Trust Score: ${avgTrustScore.toFixed(1)}/100
- Verified Properties: ${verifiedCount} (${(verifiedCount/totalProperties*100).toFixed(1)}%)

Provide a concise market analysis (3-4 sentences) covering:
1. Current market condition and momentum
2. Investment potential and recommendations
3. Key insights about property quality and verification
Keep it professional and actionable for buyers/investors.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a real estate market analyst providing insights based on current data.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0].message.content;

    // Calculate investment score (0-100)
    const investmentScore = Math.min(100, Math.round(
      (avgTrustScore * 0.4) + 
      (verifiedCount/totalProperties * 100 * 0.3) + 
      (Math.max(0, Math.min(20, priceTrendValue + 10)) * 0.3 * 5)
    ));

    // Store insights in cache
    const insights = [
      {
        city,
        locality: locality || null,
        insight_type: 'market_summary',
        data: {
          totalProperties,
          avgPrice: Math.round(avgPrice),
          avgTrustScore: parseFloat(avgTrustScore.toFixed(1)),
          verifiedCount,
          verificationRate: parseFloat((verifiedCount/totalProperties*100).toFixed(1))
        },
        ai_analysis: aiAnalysis,
      },
      {
        city,
        locality: locality || null,
        insight_type: 'price_trend',
        data: {
          trend: priceTrendValue,
          oldAvg: Math.round(oldAvg),
          newAvg: Math.round(newAvg),
          direction: priceTrendValue > 0 ? 'up' : 'down'
        },
        ai_analysis: null,
      },
      {
        city,
        locality: locality || null,
        insight_type: 'investment_score',
        data: {
          score: investmentScore,
          factors: {
            trustScore: avgTrustScore,
            verificationRate: verifiedCount/totalProperties*100,
            priceMomentum: priceTrendValue
          }
        },
        ai_analysis: null,
      }
    ];

    // Upsert insights
    for (const insight of insights) {
      await supabase
        .from('market_insights')
        .upsert(insight, { 
          onConflict: 'city,locality,insight_type',
          ignoreDuplicates: false 
        });
    }

    // Clean up expired insights
    await supabase.rpc('clean_expired_insights');

    return new Response(
      JSON.stringify({ insights, cached: false, generated: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});