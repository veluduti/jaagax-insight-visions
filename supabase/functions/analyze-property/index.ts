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
    const { price, area, location, type, beds, baths } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Analyze this Indian property and provide a detailed investment analysis:

Property Details:
- Price: ₹${price.toLocaleString('en-IN')}
- Area: ${area} sq.ft
- Location: ${location}
- Type: ${type}
- Bedrooms: ${beds}
- Bathrooms: ${baths}

Please provide:
1. Valuation range (min-max as percentage of current price)
2. Area appreciation estimate for last 12 months (realistic percentage)
3. Investment score out of 100
4. Brief summary highlighting key features and investment potential
5. List of 2-3 risk factors to consider

Format your response as JSON with these exact keys:
{
  "valuationMin": number (actual price value),
  "valuationMax": number (actual price value),
  "appreciation": number (percentage),
  "investmentScore": number (0-100),
  "summary": string (2-3 sentences),
  "risks": array of strings
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
            content: 'You are a real estate analyst specializing in Indian property markets. Provide accurate, data-driven insights. Always respond with valid JSON only, no markdown or additional text.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback with default values
      analysis = {
        valuationMin: Math.round(price * 0.95),
        valuationMax: Math.round(price * 1.15),
        appreciation: 8,
        investmentScore: 75,
        summary: `This ${beds} BHK ${type} in ${location} offers good investment potential with modern amenities and strong connectivity.`,
        risks: ['Market volatility', 'Location-specific factors']
      };
    }

    console.log('AI Analysis result:', analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
