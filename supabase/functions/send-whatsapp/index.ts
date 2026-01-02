import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, message, bookingId } = await req.json();

    // Validate required fields
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate message length (WhatsApp limit is 4096, but we limit to 1600 for safety)
    if (message.length > 1600) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 1600 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If bookingId is provided, validate that the booking exists and belongs to the user
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('visit_bookings')
        .select('user_id, user_phone')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error('Booking not found:', bookingId);
        return new Response(
          JSON.stringify({ error: 'Booking not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user owns this booking or if the phone matches
      const cleanTo = to.replace(/\s+/g, '').replace('whatsapp:', '');
      const cleanBookingPhone = booking.user_phone?.replace(/\s+/g, '').replace('whatsapp:', '') || '';
      
      if (booking.user_id !== user.id && cleanTo !== cleanBookingPhone) {
        console.error('User not authorized for this booking');
        return new Response(
          JSON.stringify({ error: 'Not authorized to send message for this booking' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // If no bookingId, check if user is sending to their own registered phone
      // or is an agent/admin (more permissive for system notifications)
      const { data: userProfile } = await supabase
        .from('users')
        .select('phone, role')
        .eq('id', user.id)
        .single();

      // Check user_roles table for admin/agent roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some(r => r.role === 'admin');
      const isAgent = userRoles?.some(r => r.role === 'agent');

      // If not admin/agent, they can only send to their own phone
      if (!isAdmin && !isAgent) {
        const cleanTo = to.replace(/\s+/g, '').replace('whatsapp:', '');
        const cleanUserPhone = userProfile?.phone?.replace(/\s+/g, '').replace('whatsapp:', '') || '';
        
        if (cleanTo !== cleanUserPhone) {
          console.error('User can only send WhatsApp to their own phone');
          return new Response(
            JSON.stringify({ error: 'Not authorized to send to this phone number' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Rate limiting - check recent messages from this user (max 5 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentNotifications, error: countError } = await supabase
      .from('visit_notifications')
      .select('id')
      .eq('notification_type', 'whatsapp')
      .gte('created_at', oneMinuteAgo);

    // Approximate rate limit based on recent notifications (not perfect but adds protection)
    if (!countError && recentNotifications && recentNotifications.length > 20) {
      console.warn('Rate limit approaching - high volume of WhatsApp messages');
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!accountSid || !authToken || !whatsappNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Format phone number for WhatsApp (must include country code, remove spaces)
    console.log(`Authenticated user ${user.id} sending WhatsApp`);
    const cleanPhone = to.replace(/\s+/g, ''); // Remove all spaces
    const formattedTo = cleanPhone.startsWith('whatsapp:') ? cleanPhone : `whatsapp:${cleanPhone}`;
    const formattedFrom = whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${whatsappNumber}`;

    console.log(`Sending WhatsApp to ${formattedTo} from ${formattedFrom}`);

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      throw new Error(data.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: data.sid,
        status: data.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
