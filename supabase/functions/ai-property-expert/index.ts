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
    const { question, propertyData, conversationHistory } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build property context
    let propertyContext = "No property data available.";
    if (propertyData) {
      const p = propertyData;
      propertyContext = `
PROPERTY DETAILS:
- Title: ${p.title || 'N/A'}
- Type: ${p.type || 'Apartment'}
- Price: ₹${p.price ? (p.price >= 10000000 ? (p.price / 10000000).toFixed(2) + ' Cr' : (p.price / 100000).toFixed(2) + ' Lakh') : 'N/A'}
- Area: ${p.area_sqft || 'N/A'} sq.ft
- Price per sq.ft: ${p.price && p.area_sqft ? '₹' + Math.round(p.price / p.area_sqft).toLocaleString() : 'N/A'}
- BHK: ${p.bhk || p.bedrooms || 'N/A'} BHK
- Bedrooms: ${p.bedrooms || 'N/A'}
- Bathrooms: ${p.bathrooms || 'N/A'}
- City: ${p.city || 'N/A'}
- Locality: ${p.locality || 'N/A'}
- Address: ${p.address || 'N/A'}
- Building Name: ${p.building_name || 'N/A'}
- Total Floors: ${p.total_floors || 'N/A'}
- Parking: ${p.total_parking || 'N/A'} spots
- Elevators: ${p.elevators || 'N/A'}
- Completion Stage: ${p.completion_stage || 'Ready'}
- Verified: ${p.verified ? 'Yes ✅' : 'No'}
- Trust Score: ${p.trust_score || 'N/A'}/100
- Description: ${p.description || 'No description available'}
- Builder ID: ${p.builder_id || 'Independent/Resale'}
`;
    }

    // Build conversation for the AI
    const systemPrompt = `You are an expert real estate advisor for JAAGA X, India's premium property platform. You have deep knowledge about Indian real estate markets, pricing trends, localities, investment advice, and property evaluation.

You are currently advising about a specific property. Here are the details:

${propertyContext}

INSTRUCTIONS:
- Answer questions specifically about THIS property using the data provided
- For location/neighborhood questions, use your knowledge of Indian cities and localities
- Give investment advice based on the locality, price trends, and property type
- Compare with market rates when asked
- Be specific with numbers and facts from the property data
- If asked about amenities nearby, use your knowledge of the locality
- Format responses with markdown for readability
- Keep responses concise but informative (2-4 paragraphs max)
- Always mention the property name when referencing it
- If you don't have specific data, say so honestly but provide general market insights for that area
- Use Indian currency format (₹, Lakhs, Crores)`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // If the last message isn't the user's question, add it
    if (!messages.some((m: any) => m.role === 'user' && m.content === question)) {
      messages.push({ role: "user", content: question });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-property-expert:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
