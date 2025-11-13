import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, locality } = await req.json();
    
    if (!city || !locality) {
      return new Response(
        JSON.stringify({ error: 'City and locality are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching events for ${locality}, ${city}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Lovable AI to generate realistic community events
    const prompt = `Generate 5-8 realistic upcoming community events for ${locality} in ${city}, India. 
    
    Include a mix of:
    - Real estate open houses and property showcases
    - Community festivals and cultural events
    - Local business expos and markets
    - Educational workshops and seminars
    - Sports and fitness events
    
    For each event, provide:
    - title (engaging and descriptive)
    - description (2-3 sentences)
    - category (one of: real-estate, cultural, business, educational, sports, community)
    - event_date (between ${new Date().toISOString().split('T')[0]} and 3 months from now, format: YYYY-MM-DD)
    - event_time (in HH:MM format, 24-hour)
    - venue (specific venue name in ${locality})
    - max_attendees (between 50-500 depending on event type)
    - ticket_price (0 for free events, otherwise 100-2000 INR)
    - organizer_name (realistic name)
    - organizer_contact (10-digit Indian phone number starting with 9, 8, 7, or 6)
    - image_url (use appropriate Unsplash images based on event type)
    
    Make events diverse, relevant to the locality, and appealing.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a community events curator. Return ONLY valid JSON array of events, no markdown formatting, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_events',
            description: 'Create community events with structured data',
            parameters: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      category: { 
                        type: 'string',
                        enum: ['real-estate', 'cultural', 'business', 'educational', 'sports', 'community']
                      },
                      event_date: { type: 'string' },
                      event_time: { type: 'string' },
                      venue: { type: 'string' },
                      max_attendees: { type: 'number' },
                      ticket_price: { type: 'number' },
                      organizer_name: { type: 'string' },
                      organizer_contact: { type: 'string' },
                      image_url: { type: 'string' }
                    },
                    required: ['title', 'description', 'category', 'event_date', 'event_time', 'venue', 'max_attendees', 'ticket_price', 'organizer_name', 'organizer_contact', 'image_url']
                  }
                }
              },
              required: ['events']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_events' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData));

    let events = [];
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const parsedData = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
      events = parsedData.events;
    } else {
      throw new Error('Unexpected AI response format');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert events into database
    const eventsToInsert = events.map((event: any) => ({
      title: event.title,
      description: event.description,
      category: event.category,
      city: city,
      locality: locality,
      event_date: event.event_date,
      event_time: event.event_time,
      venue: event.venue,
      max_attendees: event.max_attendees,
      current_attendees: Math.floor(Math.random() * event.max_attendees * 0.3), // 0-30% filled
      ticket_price: event.ticket_price,
      organizer_name: event.organizer_name,
      organizer_contact: event.organizer_contact,
      image_url: event.image_url,
      status: 'published',
      is_cancelled: false,
      is_featured: Math.random() > 0.7 // 30% chance of being featured
    }));

    const { data: insertedEvents, error: insertError } = await supabase
      .from('community_events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedEvents.length} events`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched and saved ${insertedEvents.length} events for ${locality}, ${city}`,
        events: insertedEvents
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching community events:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});