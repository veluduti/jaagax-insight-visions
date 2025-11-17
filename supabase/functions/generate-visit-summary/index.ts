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
    const { bookingId } = await req.json();

    if (!bookingId) {
      throw new Error('Missing bookingId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select(`
        *,
        properties (
          id,
          title,
          locality,
          city,
          price,
          bhk,
          area,
          type,
          description
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Fetch story updates from the visit
    const { data: stories } = await supabase
      .from('visit_story_updates')
      .select('content, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    // Fetch similar properties in the same locality
    const { data: similarProperties } = await supabase
      .from('properties')
      .select('id, title, locality, city, price, bhk, area')
      .eq('locality', booking.properties.locality)
      .eq('verified', true)
      .neq('id', booking.properties.id)
      .limit(3);

    // Prepare context for AI
    const context = `
Property Visit Summary Request:

Property Details:
- Title: ${booking.properties.title}
- Location: ${booking.properties.locality}, ${booking.properties.city}
- Type: ${booking.properties.type || 'Residential'}
- Size: ${booking.properties.bhk} BHK, ${booking.properties.area} sq ft
- Price: ₹${booking.properties.price}L
- Description: ${booking.properties.description || 'N/A'}

Visit Updates from Agent:
${stories?.map(s => `- ${s.content || 'Photo shared'}`).join('\n') || 'No updates shared during visit'}

Visit Status: ${booking.status}

Task: Generate a comprehensive visit summary in JSON format with:
1. highlights: Array of 3-5 key highlights from the visit
2. buyer_liked: Array of 3-4 positive aspects the buyer would appreciate
3. concerns: Array of 2-3 potential concerns or things to verify
4. next_steps: Array of 3-4 recommended actions for the buyer
5. ai_insights: A 2-3 sentence personalized insight about this property

Focus on being helpful, realistic, and actionable.
`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful real estate AI assistant that analyzes property visits and provides actionable insights to buyers. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const aiData = await openAIResponse.json();
    const summaryData = JSON.parse(aiData.choices[0].message.content);

    // Save summary to database
    const { data: summary, error: summaryError } = await supabase
      .from('visit_summaries')
      .upsert({
        booking_id: bookingId,
        highlights: summaryData.highlights,
        buyer_liked: summaryData.buyer_liked,
        concerns: summaryData.concerns,
        next_steps: summaryData.next_steps,
        ai_insights: summaryData.ai_insights,
        recommended_properties: similarProperties || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'booking_id'
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    console.log('Visit summary generated:', bookingId);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-visit-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
