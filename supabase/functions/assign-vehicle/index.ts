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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { travelMode, date, timeSlot } = await req.json();

    if (travelMode === 'self') {
      return new Response(
        JSON.stringify({ vehicle: null, message: 'Self arrival - no vehicle needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryMap: Record<string, string> = {
      'base': 'base',
      'premium': 'premium',
      'ultimate': 'ultimate'
    };

    const category = categoryMap[travelMode];

    const { data: vehicle, error } = await supabase
      .from('fleet_vehicles')
      .select('id, vehicle_type, vehicle_model, capacity, status, category')
      .eq('category', category)
      .eq('status', 'available')
      .limit(1)
      .single();

    if (error || !vehicle) {
      return new Response(
        JSON.stringify({ vehicle: null, message: `All ${travelMode} cars currently busy. Please select a different plan or time slot.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
