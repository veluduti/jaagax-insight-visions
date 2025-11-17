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
    const { bookingId, lat, lng, locationType } = await req.json();

    if (!bookingId || !lat || !lng || !locationType) {
      throw new Error('Missing required fields: bookingId, lat, lng, locationType');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get current user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify booking exists and user is authorized
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select('*, agents(user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Check if user is the assigned agent
    const isAgent = booking.agents?.user_id === user.id;
    if (!isAgent) {
      throw new Error('Not authorized to update location for this booking');
    }

    const locationData = {
      lat,
      lng,
      updated_at: new Date().toISOString()
    };

    // Update location in visit_bookings
    const columnName = locationType === 'agent' ? 'agent_location' : 'vehicle_location';
    const { error: updateError } = await supabase
      .from('visit_bookings')
      .update({ [columnName]: locationData })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    // Store in location history
    const { error: historyError } = await supabase
      .from('visit_locations')
      .insert({
        booking_id: bookingId,
        location_type: locationType,
        lat,
        lng
      });

    if (historyError) {
      console.error('Failed to store location history:', historyError);
    }

    console.log(`Location updated for booking ${bookingId}: ${locationType} at ${lat}, ${lng}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        location: locationData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in update-location function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
