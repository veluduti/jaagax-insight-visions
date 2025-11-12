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
    const { event_id, language = 'English' } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch event with RSVPs
    const { data: event, error: eventError } = await supabase
      .from('community_events')
      .select(`
        *,
        event_rsvps(count)
      `)
      .eq('id', event_id)
      .single();

    if (eventError) throw eventError;

    const prompt = `Generate an engaging event brief for organizers in ${language}:

Event: ${event.title}
Date: ${event.event_date} at ${event.event_time}
Venue: ${event.venue}, ${event.venue_address}
Category: ${event.category}
Expected: ${event.max_attendees} attendees
Current RSVPs: ${event.current_attendees}
Ticket Price: ₹${event.ticket_price}

Create a brief covering:
1. Event Summary (2-3 sentences)
2. Key Logistics (venue, timing, capacity)
3. RSVP Status & Trends
4. Organizer Action Items (3-5 bullet points)
5. Promotional Suggestions

Format as markdown.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    let brief;

    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an event planning assistant. Create clear, actionable briefs.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error(`AI generation failed: ${response.status}`);
      }

      const data = await response.json();
      brief = data.choices[0].message.content;
    } else if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an event planning assistant. Create clear, actionable briefs.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) throw new Error('OpenAI generation failed');
      
      const data = await response.json();
      brief = data.choices[0].message.content;
    } else {
      throw new Error('No AI API key configured');
    }

    // Log generation
    await supabase.from('event_logs').insert({
      event_id,
      action: 'brief_generated',
      metadata: { language, brief_length: brief.length }
    });

    return new Response(JSON.stringify({ brief }), {
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