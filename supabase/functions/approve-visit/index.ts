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

    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select('*, properties(id, title, builder_id, submitted_by), agents(name, user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const property = booking.properties as any;
    const builderUserId = property?.builder_id || property?.submitted_by;

    // Verify caller is the builder OR admin
    const { data: adminCheck } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!adminCheck && builderUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newStatus = approved ? 'confirmed' : 'cancelled';
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (notes) updateData.notes = (booking.notes ? booking.notes + '\n\n[Builder]: ' : '[Builder]: ') + notes;

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
      await supabase.from('notifications').insert({
        user_id: booking.buyer_id,
        type: 'booking',
        title: approved ? 'Visit confirmed by builder!' : 'Visit declined by builder',
        message: approved
          ? `Your visit to ${property?.title} on ${booking.visit_date} at ${booking.visit_time} is fully confirmed. The builder is preparing for you.`
          : `Unfortunately the builder declined this visit. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
        metadata: { booking_id: bookingId, property_id: property?.id, status: newStatus },
      });
    }

    // Notify agent
    const agentUserId = (booking.agents as any)?.user_id;
    if (agentUserId) {
      await supabase.from('notifications').insert({
        user_id: agentUserId,
        type: 'booking',
        title: approved ? 'Builder confirmed visit' : 'Builder declined visit',
        message: approved
          ? `Builder approved the visit to ${property?.title} on ${booking.visit_date}. You're all set.`
          : `Builder declined the visit to ${property?.title}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
        metadata: { booking_id: bookingId, property_id: property?.id, status: newStatus },
      });
    }

    // Notify all admins of builder decision
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const adminTitle = approved ? 'Builder approved visit' : 'Builder declined visit';
      const adminMsg = approved
        ? `Builder approved the visit by ${booking.buyer_name || 'buyer'} to ${property?.title} on ${booking.visit_date}. Visit fully confirmed.`
        : `Builder declined the visit to ${property?.title}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`;
      const adminRows = admins.map((a: any) => ({
        user_id: a.user_id,
        type: 'admin_visit_event',
        title: adminTitle,
        message: adminMsg,
        metadata: { booking_id: bookingId, property_id: property?.id, step: approved ? 'builder_approved' : 'builder_declined', status: newStatus },
      }));
      await supabase.from('notifications').insert(adminRows);
    }

    console.log(`Visit ${bookingId} ${approved ? 'approved' : 'rejected'} by builder ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in approve-visit function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
