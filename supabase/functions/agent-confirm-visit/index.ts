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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { bookingId, approved, notes, rejectionReason } = await req.json();

    // Get booking with property + builder info
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select('*, properties(id, title, builder_id, submitted_by, city, locality)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify the caller is the assigned agent
    const { data: agentRow } = await supabase
      .from('agents')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin.data && (!agentRow || agentRow.id !== booking.agent_id)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const property = booking.properties as any;
    const hasBuilder = !!(property?.builder_id || property?.submitted_by);

    let newStatus: string;
    if (!approved) {
      newStatus = 'cancelled';
    } else if (hasBuilder) {
      newStatus = 'pending_builder';
    } else {
      newStatus = 'confirmed';
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (notes) updateData.notes = (booking.notes ? booking.notes + '\n\n[Agent]: ' : '[Agent]: ') + notes;

    const { error: updateError } = await supabase
      .from('visit_bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update booking' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Notify buyer
    if (booking.buyer_id) {
      const buyerTitle = !approved
        ? 'Visit request declined'
        : hasBuilder
          ? 'Agent confirmed — awaiting builder'
          : 'Visit confirmed!';
      const buyerMsg = !approved
        ? `Your visit was declined by the agent. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`
        : hasBuilder
          ? `${agentRow?.name || 'Your agent'} confirmed your visit to ${property?.title}. Now waiting for the builder to prepare.`
          : `${agentRow?.name || 'Your agent'} confirmed your visit to ${property?.title} on ${booking.visit_date}.`;

      await supabase.from('notifications').insert({
        user_id: booking.buyer_id,
        type: 'booking',
        title: buyerTitle,
        message: buyerMsg,
        metadata: { booking_id: bookingId, property_id: property?.id, status: newStatus },
      });
    }

    // Notify builder if needed
    if (approved && hasBuilder) {
      const builderUserId = property.builder_id || property.submitted_by;
      await supabase.from('notifications').insert({
        user_id: builderUserId,
        type: 'booking',
        title: 'New site visit to prepare',
        message: `${booking.buyer_name || 'A buyer'} will visit ${property?.title} on ${booking.visit_date} at ${booking.visit_time}. Agent ${agentRow?.name || ''} has confirmed. Please review in Visit Approvals.`,
        metadata: { booking_id: bookingId, property_id: property?.id, action: 'builder_review' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-confirm-visit:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
