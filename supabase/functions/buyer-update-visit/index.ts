import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Used when the buyer cancels or reschedules a visit themselves.
// Updates booking + notifies the agent + all admins.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { bookingId, action, newDate, newTime } = await req.json();

    const { data: booking } = await supabase
      .from('visit_bookings')
      .select('*, properties(id, title), agents(id, name, user_id)')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (booking.buyer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const property = booking.properties as any;
    const agent = booking.agents as any;

    let updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    let agentTitle = '';
    let agentMsg = '';
    let adminTitle = '';
    let adminMsg = '';
    let step = '';

    if (action === 'cancel') {
      updateData.status = 'cancelled';
      agentTitle = 'Buyer cancelled visit';
      agentMsg = `${booking.buyer_name || 'The buyer'} cancelled the visit to ${property?.title} originally scheduled for ${booking.visit_date}.`;
      adminTitle = 'Visit cancelled by buyer';
      adminMsg = `${booking.buyer_name || 'Buyer'} cancelled visit to ${property?.title} on ${booking.visit_date}.${agent?.name ? ' Agent: ' + agent.name + '.' : ''}`;
      step = 'buyer_cancelled';
    } else if (action === 'reschedule') {
      if (!newDate) {
        return new Response(JSON.stringify({ error: 'newDate required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      updateData.visit_date = newDate;
      updateData.visit_time = newTime || booking.visit_time;
      updateData.status = 'pending_agent';
      agentTitle = 'Buyer rescheduled visit';
      agentMsg = `${booking.buyer_name || 'The buyer'} rescheduled the visit to ${property?.title} to ${newDate}${newTime ? ' at ' + newTime : ''}. Please reconfirm.`;
      adminTitle = 'Visit rescheduled by buyer';
      adminMsg = `${booking.buyer_name || 'Buyer'} rescheduled visit to ${property?.title} to ${newDate}${newTime ? ' at ' + newTime : ''}.${agent?.name ? ' Agent: ' + agent.name + '.' : ''}`;
      step = 'buyer_rescheduled';
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: updateErr } = await supabase
      .from('visit_bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Update error:', updateErr);
      return new Response(JSON.stringify({ error: 'Failed to update' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Notify agent
    if (agent?.user_id) {
      await supabase.from('notifications').insert({
        user_id: agent.user_id,
        type: 'booking',
        title: agentTitle,
        message: agentMsg,
        metadata: { booking_id: bookingId, property_id: property?.id, step },
      });
    }

    // Notify admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const rows = admins.map((a: any) => ({
        user_id: a.user_id,
        type: 'admin_visit_event',
        title: adminTitle,
        message: adminMsg,
        metadata: { booking_id: bookingId, property_id: property?.id, agent_id: agent?.id, agent_name: agent?.name, step },
      }));
      await supabase.from('notifications').insert(rows);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('buyer-update-visit error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
