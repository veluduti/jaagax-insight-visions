import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    
    if (!data || !data.city || !data.avgPrice) {
      return new Response(
        JSON.stringify({ error: 'Missing required data fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating market trends commentary for:', data);

    const prompt = `You are a real estate market analyst providing insights for JaagaX, an Indian property platform. 

Analyze the following market data and provide a concise, professional 2-3 sentence commentary:

City: ${data.city}
Average Sale Price: ₹${(data.avgPrice / 10000000).toFixed(2)} Crores
Total Transactions: ${data.transactions}
Top Locality: ${data.topLocality}
Price Change QoQ: ${data.priceChangeQoQ}%
${data.rentYield ? `Rent Yield: ${data.rentYield}%` : ''}

Provide specific insights about:
1. Price trend direction and significance
2. Investment potential in this market
3. Key locality to watch

Keep it conversational but data-driven. Use Indian Rupee format (Cr for Crores, L for Lakhs).`;

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
            content: 'You are a professional real estate market analyst. Provide clear, data-driven insights in 2-3 sentences.' 
          },
          { role: 'user', content: prompt }
        ],
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
    const commentary = aiData.choices?.[0]?.message?.content || 'Unable to generate market insights at this time.';

    console.log('Generated commentary:', commentary);

    return new Response(
      JSON.stringify({ commentary }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in market-trends-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
