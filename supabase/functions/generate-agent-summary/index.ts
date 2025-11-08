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
    const { agentName, agencyName, salesCount, rentCount, cities, languages, specialization, trustScore } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Generate a professional, engaging bio for a real estate agent with the following details:

Name: ${agentName}
Agency: ${agencyName}
Specialization: ${specialization}
Sales Completed: ${salesCount}
Rental Deals: ${rentCount}
Cities Served: ${cities.join(', ')}
Languages: ${languages.join(', ')}
Trust Score: ${trustScore}/100

Write a 2-3 sentence professional bio that highlights their expertise, experience, and what makes them stand out. Make it personable and trustworthy. Focus on their strengths and commitment to clients.`;

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
            content: 'You are a professional real estate copywriter. Create engaging, trustworthy agent bios that highlight expertise and build confidence.' 
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
    const summary = data.choices[0].message.content.trim();
    
    console.log('Generated agent summary:', summary);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-agent-summary:', error);
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
