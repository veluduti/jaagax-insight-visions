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
    const { travelMode, date, timeSlot } = await req.json();

    if (travelMode === 'self') {
      return new Response(
        JSON.stringify({ vehicle: null, message: 'Self arrival - no vehicle needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map travel modes to vehicle categories
    const categoryMap: Record<string, string> = {
      'base': 'base',
      'premium': 'premium',
      'ultimate': 'ultimate'
    };

    const category = categoryMap[travelMode];

    // Find available vehicle of the requested category
    const { data: vehicle, error } = await supabase
      .from('fleet_vehicles')
      .select('*')
      .eq('category', category)
      .eq('status', 'available')
      .limit(1)
      .single();

    if (error || !vehicle) {
      return new Response(
        JSON.stringify({ 
          vehicle: null, 
          error: 'No vehicles available',
          message: `All ${travelMode} cars currently busy. Please select a different plan or time slot.` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update vehicle status to assigned
    await supabase
      .from('fleet_vehicles')
      .update({ status: 'assigned' })
      .eq('id', vehicle.id);

    return new Response(
      JSON.stringify({ vehicle, message: 'Vehicle assigned successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-vehicle:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
