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
    const { bookingId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending notifications for this booking
    const { data: notifications, error } = await supabase
      .from('visit_notifications')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    if (error || !notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each notification
    const results = [];
    for (const notification of notifications) {
      try {
        // In production, integrate with SendGrid, Twilio, WhatsApp API
        console.log(`Sending ${notification.notification_type} to ${notification.recipient}`);
        console.log(`Message: ${notification.message}`);

        // Update notification status
        await supabase
          .from('visit_notifications')
          .update({ status: 'sent' })
          .eq('id', notification.id);

        results.push({
          id: notification.id,
          type: notification.notification_type,
          status: 'sent',
        });
      } catch (notifError) {
        console.error(`Failed to send ${notification.notification_type}:`, notifError);
        
        await supabase
          .from('visit_notifications')
          .update({ status: 'failed' })
          .eq('id', notification.id);

        results.push({
          id: notification.id,
          type: notification.notification_type,
          status: 'failed',
          error: notifError instanceof Error ? notifError.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-visit-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});