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
    const { bookingId, otpCode } = await req.json();

    if (!bookingId || !otpCode) {
      throw new Error('Missing required fields: bookingId and otpCode');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select('*, properties(title, locality, city)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Booking not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP
    if (booking.otp_code !== otpCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid OTP code' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if visit is in valid state for verification
    if (!['confirmed', 'agent_pending'].includes(booking.status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot verify visit in ${booking.status} state. Visit must be confirmed first.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update booking status to in_progress
    const { error: updateError } = await supabase
      .from('visit_bookings')
      .update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    // Send notification
    await supabase.functions.invoke('send-visit-update', {
      body: {
        bookingId,
        templateType: 'visit_started'
      }
    });

    console.log(`Visit ${bookingId} verified and started`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Visit verified successfully',
        booking: {
          id: booking.id,
          status: 'in_progress',
          property: booking.properties
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-visit function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
