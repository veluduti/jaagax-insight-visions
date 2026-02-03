import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    console.log('Received booking data:', JSON.stringify(bookingData));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate OTP and verification code
    const otp = generateOTP();
    const verificationCode = generateVerificationCode();

    // Get property details to find project_id if exists
    const { data: property } = await supabase
      .from('properties')
      .select('city, locality')
      .eq('id', bookingData.propertyId)
      .single();

    console.log('Property details:', property);

    // Auto-assign agent if not provided
    let agentId = bookingData.agentId;
    if (bookingData.autoAssign && !agentId) {
      let agent = null;

      // Strategy 1: Try to match by city first
      if (property?.city && !agent) {
        const { data } = await supabase
          .from('agents')
          .select('id')
          .contains('cities_served', [property.city])
          .eq('is_online', true)
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      // Strategy 2: Fallback to any online agent with highest trust score
      if (!agent) {
        const { data } = await supabase
          .from('agents')
          .select('id')
          .eq('is_online', true)
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      // Strategy 3: Any agent if none are online
      if (!agent) {
        const { data } = await supabase
          .from('agents')
          .select('id')
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      agentId = agent?.id || null;
      console.log('Auto-assigned agent:', agentId);
    }

    // Create visit booking using only existing columns
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .insert({
        user_id: bookingData.userId,
        property_id: bookingData.propertyId,
        agent_id: agentId,
        visit_date: bookingData.visitDate,
        visit_time: bookingData.visitTime,
        otp_code: otp,
        verification_code: verificationCode,
        buyer_name: bookingData.userName,
        buyer_email: bookingData.userEmail,
        buyer_phone: bookingData.userPhone,
        notes: bookingData.specialRequests || null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking insert error:', bookingError);
      throw bookingError;
    }

    console.log('Booking created:', booking.id);

    // Send confirmation notifications
    try {
      await supabase.functions.invoke('send-visit-update', {
        body: {
          bookingId: booking.id,
          templateType: 'visit_confirmed'
        }
      });
      console.log('Sent confirmation notification');
    } catch (notifError) {
      console.error('Notification error (non-fatal):', notifError);
    }

    // Notify agent about assignment
    if (agentId) {
      try {
        await supabase.functions.invoke('send-visit-update', {
          body: {
            bookingId: booking.id,
            templateType: 'agent_new_assignment'
          }
        });
        console.log('Sent agent assignment notification');
      } catch (notifError) {
        console.error('Agent notification error (non-fatal):', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: booking,
        otp,
        verificationCode,
        status: booking.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-visit:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
