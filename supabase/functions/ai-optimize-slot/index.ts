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
    const { agentId, date, pickupLocation, propertyLocation } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // Get agent availability for the date
    const { data: availability, error } = await supabase
      .from('agent_availability')
      .select('time_slots')
      .eq('agent_id', agentId)
      .eq('date', date)
      .single();

    if (error || !availability) {
      // Generate default slots if no availability data
      const defaultSlots = [
        { time: '09:00', available: true, label: 'Morning' },
        { time: '10:00', available: true, label: 'Mid-Morning' },
        { time: '11:00', available: true, label: 'Late Morning' },
        { time: '14:00', available: true, label: 'Afternoon' },
        { time: '15:00', available: true, label: 'Mid-Afternoon' },
        { time: '16:00', available: true, label: 'Late Afternoon' },
        { time: '17:00', available: true, label: 'Evening' },
        { time: '18:00', available: true, label: 'Late Evening' },
      ];

      return new Response(
        JSON.stringify({ 
          slots: defaultSlots,
          recommended: defaultSlots[0],
          aiInsight: 'Morning slots typically have less traffic and better visibility.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timeSlots = availability.time_slots as any[];
    const availableSlots = timeSlots.filter((slot: any) => slot.available);

    // Use AI to recommend best slot
    if (lovableApiKey && availableSlots.length > 0) {
      try {
        const prompt = `As a property visit scheduler, recommend the best time slot for a property visit on ${date}.
Available slots: ${availableSlots.map((s: any) => s.time).join(', ')}
Pickup location: ${JSON.stringify(pickupLocation)}
Property location: ${JSON.stringify(propertyLocation)}

Consider:
1. Traffic patterns in Indian cities (worst 8-10 AM and 6-8 PM)
2. Property viewing best done in natural daylight
3. Agent's schedule
4. Customer convenience

Respond with JSON: { "recommendedTime": "HH:MM", "reason": "brief explanation", "alternateSlots": ["HH:MM", "HH:MM"] }`;

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

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiRecommendation = JSON.parse(
            aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
          );

          const recommendedSlot = availableSlots.find(
            (s: any) => s.time === aiRecommendation.recommendedTime
          );

          return new Response(
            JSON.stringify({
              slots: availableSlots,
              recommended: recommendedSlot || availableSlots[0],
              aiInsight: aiRecommendation.reason,
              alternateSlots: aiRecommendation.alternateSlots,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (aiError) {
        console.error('AI optimization failed:', aiError);
      }
    }

    // Fallback: simple heuristic - prefer mid-morning slots
    const preferredTimes = ['10:00', '11:00', '15:00', '16:00'];
    const recommended = availableSlots.find((s: any) => 
      preferredTimes.includes(s.time)
    ) || availableSlots[0];

    return new Response(
      JSON.stringify({
        slots: availableSlots,
        recommended,
        aiInsight: 'Mid-morning slots offer optimal viewing conditions with good natural light and moderate traffic.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-optimize-slot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});