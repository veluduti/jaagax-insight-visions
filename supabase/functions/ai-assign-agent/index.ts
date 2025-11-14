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
    const { propertyId, locality, city, date, preferredAgentId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If preferred agent is specified and available, use them
    if (preferredAgentId) {
      const { data: availability } = await supabase
        .from('agent_availability')
        .select('*')
        .eq('agent_id', preferredAgentId)
        .eq('date', date)
        .eq('is_available', true)
        .single();

      if (availability) {
        const { data: agent } = await supabase
          .from('agents')
          .select('*')
          .eq('id', preferredAgentId)
          .single();

        return new Response(
          JSON.stringify({ agent, reason: 'Preferred agent available' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Find best available agent based on locality, trust score, and availability
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .ilike('cities_served', `%${city}%`)
      .order('trust_score', { ascending: false })
      .order('sales_count', { ascending: false })
      .limit(10);

    if (error || !agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No agents found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check availability for each agent on the requested date
    for (const agent of agents) {
      const { data: availability } = await supabase
        .from('agent_availability')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('date', date)
        .eq('is_available', true)
        .single();

      if (availability) {
        return new Response(
          JSON.stringify({ 
            agent, 
            reason: 'Best available agent based on trust score and locality match' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: return highest-rated agent even if no availability recorded
    return new Response(
      JSON.stringify({ 
        agent: agents[0], 
        reason: 'Fallback agent (highest trust score)' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-assign-agent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});