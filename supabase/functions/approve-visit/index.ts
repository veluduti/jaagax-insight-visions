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
    const { bookingId, approved, notes, rejectionReason } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For testing: Skip authentication check
    // In production, you should verify user role properly
    console.log('Processing booking approval (auth bypassed for testing)');

    // Get the booking with property details
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select('*, properties(id, title, builder_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found');
    }

    // Skip role check for testing
    console.log(`Processing booking ${bookingId} (role check bypassed for testing)`);

    // Update booking status
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (approved) {
      updateData.status = 'confirmed';
      updateData.builder_notes = notes || null;
    } else {
      updateData.status = 'builder_rejected';
      updateData.rejection_reason = rejectionReason || 'No reason provided';
    }

    const { error: updateError } = await supabase
      .from('visit_bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    // Send notifications
    const templateType = approved ? 'builder_approved' : 'builder_rejected';
    await supabase.functions.invoke('send-visit-update', {
      body: {
        bookingId,
        templateType
      }
    });

    console.log(`Visit ${bookingId} ${approved ? 'approved' : 'rejected'} by builder`);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: updateData.status,
        message: approved ? 'Visit approved successfully' : 'Visit rejected'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in approve-visit function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
