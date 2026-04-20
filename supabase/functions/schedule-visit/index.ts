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

    const bookingData = await req.json();
    const userId = user.id;

    // Get property to find city/locality + the strictly-assigned agent
    const { data: property } = await supabase
      .from('properties')
      .select('city, locality, builder_id, submitted_by, title, assigned_agent_id')
      .eq('id', bookingData.propertyId)
      .single();

    // STRICT RULE: Use the assigned agent first. Only fall back to auto-pick when none.
    let agentId = property?.assigned_agent_id || bookingData.agentId || null;

    if (!agentId && bookingData.autoAssign) {
      let agent = null;
      if (property?.city) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, phone, user_id')
          .ilike('cities_served', `%${property.city}%`)
          .order('trust_score', { ascending: false })
          .limit(1)
          .maybeSingle();
        agent = data;
      }
      if (!agent) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, phone, user_id')
          .order('trust_score', { ascending: false })
          .limit(1)
          .maybeSingle();
        agent = data;
      }
      agentId = agent?.id || null;
    }

    // NEW FLOW: Always start at pending_agent (agent must confirm first)
    const initialStatus = 'pending_agent';

    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .insert({
        buyer_id: userId,
        property_id: bookingData.propertyId,
        agent_id: agentId,
        visit_date: bookingData.visitDate,
        visit_time: bookingData.visitTime,
        buyer_name: bookingData.userName,
        buyer_email: bookingData.userEmail,
        buyer_phone: bookingData.userPhone,
        notes: bookingData.specialRequests || null,
        city: property?.city || null,
        locality: property?.locality || null,
        status: initialStatus,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking insert error:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Notify buyer (in-app)
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'booking',
      title: 'Visit request submitted',
      message: `Your visit request for ${property?.title || 'the property'} on ${bookingData.visitDate} has been sent to the agent for confirmation.`,
      metadata: { booking_id: booking.id, property_id: bookingData.propertyId },
    });

    // Notify the assigned agent so they can review & confirm
    let agentName = '';
    if (agentId) {
      const { data: agentRow } = await supabase
        .from('agents')
        .select('user_id, name')
        .eq('id', agentId)
        .maybeSingle();

      agentName = agentRow?.name || '';

      if (agentRow?.user_id) {
        await supabase.from('notifications').insert({
          user_id: agentRow.user_id,
          type: 'visit_request',
          title: 'New visit request',
          message: `${bookingData.userName} requested a site visit for ${property?.title || 'a property'} on ${bookingData.visitDate} at ${bookingData.visitTime}. Please review and confirm.`,
          metadata: { booking_id: booking.id, property_id: bookingData.propertyId, action: 'agent_confirm' },
        });
      }
    }

    // Notify all admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const adminMsg = `${bookingData.userName} booked a visit to ${property?.title || 'a property'} on ${bookingData.visitDate} at ${bookingData.visitTime}.${agentName ? ` Assigned to agent ${agentName}.` : ' (No agent assigned yet)'}`;
      const adminRows = admins.map((a: any) => ({
        user_id: a.user_id,
        type: 'admin_visit_event',
        title: 'New visit booking',
        message: adminMsg,
        metadata: { booking_id: booking.id, property_id: bookingData.propertyId, agent_id: agentId, agent_name: agentName, step: 'created' },
      }));
      await supabase.from('notifications').insert(adminRows);
    }

    return new Response(
      JSON.stringify({ success: true, booking, status: booking.status }),
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
