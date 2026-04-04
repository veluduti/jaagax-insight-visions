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

    const bookingData = await req.json();

    // Ensure the booking is created for the authenticated user
    const userId = user.id;

    const otp = generateOTP();
    const verificationCode = generateVerificationCode();

    const { data: property } = await supabase
      .from('properties')
      .select('city, locality, builder_id, title')
      .eq('id', bookingData.propertyId)
      .single();

    const requiresBuilderApproval = !!property?.builder_id;
    const initialStatus = requiresBuilderApproval ? 'pending_approval' : 'confirmed';

    // Auto-assign agent if not provided
    let agentId = bookingData.agentId;
    if (bookingData.autoAssign && !agentId) {
      let agent = null;

      if (property?.city && !agent) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, phone')
          .contains('cities_served', [property.city])
          .eq('is_online', true)
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      if (!agent) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, phone')
          .eq('is_online', true)
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      if (!agent) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, phone')
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      agentId = agent?.id || null;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .insert({
        user_id: userId,
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
        status: initialStatus,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking insert error:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications (non-fatal)
    try {
      if (requiresBuilderApproval) {
        await supabase.functions.invoke('send-visit-update', { body: { bookingId: booking.id, templateType: 'visit_pending_approval' } });
        await supabase.functions.invoke('send-visit-update', { body: { bookingId: booking.id, templateType: 'builder_approval_needed' } });
      } else {
        await supabase.functions.invoke('send-visit-update', { body: { bookingId: booking.id, templateType: 'visit_confirmed' } });
      }
    } catch (notifError) {
      console.error('Notification error (non-fatal):', notifError);
    }

    if (agentId) {
      try {
        await supabase.functions.invoke('send-visit-update', { body: { bookingId: booking.id, templateType: 'agent_new_assignment' } });
      } catch (notifError) {
        console.error('Agent notification error (non-fatal):', notifError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, booking, otp, verificationCode, status: booking.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-visit:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
