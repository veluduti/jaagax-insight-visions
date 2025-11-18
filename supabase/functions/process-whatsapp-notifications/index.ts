import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending WhatsApp notifications
    const { data: notifications, error } = await supabase
      .from('visit_notifications')
      .select('*')
      .eq('notification_type', 'whatsapp')
      .eq('status', 'pending')
      .limit(10);

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const notification of notifications) {
      try {
        // Replace placeholder tracking URL with actual domain
        const trackingUrl = notification.message.replace(
          'TRACKING_URL_PLACEHOLDER',
          req.headers.get('origin') || 'https://jaagax.com'
        );

        // Send WhatsApp message via Twilio
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

        if (!twilioSid || !twilioAuth || !twilioWhatsAppNumber) {
          console.error('Twilio credentials not configured');
          continue;
        }

        // Format phone number (ensure it includes country code)
        const toNumber = notification.recipient.startsWith('+') 
          ? notification.recipient 
          : `+91${notification.recipient}`;

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: `whatsapp:${twilioWhatsAppNumber}`,
              To: `whatsapp:${toNumber}`,
              Body: trackingUrl,
            }),
          }
        );

        const twilioResult = await response.json();

        if (response.ok) {
          // Update notification status to sent
          await supabase
            .from('visit_notifications')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: { ...notification.metadata, twilio_sid: twilioResult.sid }
            })
            .eq('id', notification.id);

          // Log successful send
          await supabase
            .from('whatsapp_logs')
            .insert({
              booking_id: notification.booking_id,
              recipient: notification.recipient,
              message: trackingUrl,
              status: 'sent',
              twilio_sid: twilioResult.sid,
              template_type: notification.metadata?.template_type || 'visit_confirmed'
            });

          results.push({ id: notification.id, status: 'sent' });
        } else {
          // Update notification status to failed
          await supabase
            .from('visit_notifications')
            .update({ 
              status: 'failed',
              metadata: { 
                ...notification.metadata, 
                error: twilioResult.message || 'Unknown error'
              }
            })
            .eq('id', notification.id);

          // Log failed send
          await supabase
            .from('whatsapp_logs')
            .insert({
              booking_id: notification.booking_id,
              recipient: notification.recipient,
              message: trackingUrl,
              status: 'failed',
              error_message: twilioResult.message || 'Unknown error',
              template_type: notification.metadata?.template_type || 'visit_confirmed'
            });

          results.push({ id: notification.id, status: 'failed', error: twilioResult.message });
        }
      } catch (err) {
        console.error('Error processing notification:', notification.id, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id: notification.id, status: 'error', error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});