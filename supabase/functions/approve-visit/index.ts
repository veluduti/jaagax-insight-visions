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

    const { bookingId, approved, notes, rejectionReason } = await req.json();

    // Get the booking with property details
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select('*, properties(id, title, builder_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify the caller is the builder who owns the property
    if (booking.properties?.builder_id !== user.id) {
      // Also check if user is admin
      const { data: adminCheck } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (!adminCheck) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Update booking status
    const updateData: Record<string, unknown> = {
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
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update booking' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send notifications
    const templateType = approved ? 'builder_approved' : 'builder_rejected';
    await supabase.functions.invoke('send-visit-update', {
      body: { bookingId, templateType }
    }).catch(err => console.error('User notification error:', err));

    if (approved && booking.agent_id) {
      await supabase.functions.invoke('send-visit-update', {
        body: { bookingId, templateType: 'agent_new_assignment' }
      }).catch(err => console.error('Agent notification error:', err));
    }

    console.log(`Visit ${bookingId} ${approved ? 'approved' : 'rejected'} by ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, status: updateData.status, message: approved ? 'Visit approved successfully' : 'Visit rejected' }),
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
